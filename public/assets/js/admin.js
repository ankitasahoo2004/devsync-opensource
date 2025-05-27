// Server URL from auth.js
// const serverUrl = 'https://www.devsync.club';
const serverUrl = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    // Check admin authorization
    checkAdminAuth();

    // Initialize UI handlers after auth check
    initializeUI();
});

async function checkAdminAuth() {
    const authOverlay = document.getElementById('authCheckOverlay');
    const unauthorizedMessage = document.getElementById('unauthorizedMessage');
    const adminDashboard = document.getElementById('adminDashboard');

    try {
        const response = await fetch(`${serverUrl}/api/admin/verify`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.isAdmin) {
            // Show welcome toast
            showToast('success', 'Welcome Admin! 👋');

            // Get admin info
            const userResponse = await fetch(`${serverUrl}/api/user`, {
                credentials: 'include'
            });
            const userData = await userResponse.json();

            // Update admin profile
            if (userData.isAuthenticated) {
                document.getElementById('adminAvatar').src = userData.user.photos[0].value;
                document.getElementById('adminName').textContent = userData.user.displayName;
            }

            // Show dashboard
            authOverlay.style.display = 'none';
            adminDashboard.style.display = 'block';

            // Load initial data
            loadPendingPRs();
        } else {
            authOverlay.style.display = 'none';
            unauthorizedMessage.style.display = 'flex';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        authOverlay.style.display = 'none';
        unauthorizedMessage.style.display = 'flex';
    }
}

function initializeUI() {
    // Tab switching
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            menuItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');

            // Handle section switching
            const section = item.dataset.section;
            loadSection(section);
        });
    });

    // Refresh button
    document.querySelector('.refresh-btn').addEventListener('click', () => {
        const activeSection = document.querySelector('.menu-item.active').dataset.section;
        loadSection(activeSection, true);
    });
}

async function loadSection(section, forceRefresh = false) {
    const contentArea = document.querySelector('.main-content') || document.getElementById('pendingSection');

    switch (section) {
        case 'pending':
            loadPendingPRs();
            break;
        case 'approved':
            loadApprovedPRs();
            break;
        case 'rejected':
            loadRejectedPRs();
            break;
        case 'users':
            loadUsers();
            break;
        case 'repos':
            loadRepos();
            break;
        case 'automation':
            loadAutomation();
            break;
        default:
            loadPendingPRs();
            break;
    }
}

async function loadPendingPRs() {
    const grid = document.getElementById('pendingPRsGrid');
    if (!grid) {
        console.error('pendingPRsGrid element not found');
        return;
    }

    grid.innerHTML = '<div class="loading">Loading PRs...</div>';

    try {
        const response = await fetch(`${serverUrl}/api/admin/pending-prs`, {
            credentials: 'include'
        });
        const prs = await response.json();

        grid.innerHTML = prs.map(pr => createPRCard(pr)).join('');

        // Update pending count
        const pendingCount = document.getElementById('pendingCount');
        if (pendingCount) {
            pendingCount.textContent = prs.length;
        }

        // Add event listeners to PR cards
        attachPRCardHandlers();
    } catch (error) {
        console.error('Failed to load PRs:', error);
        grid.innerHTML = '<div class="error">Failed to load PRs. Please try again.</div>';
    }
}

function attachPRCardHandlers() {
    // Add event listeners for view repo buttons and other interactions
    const prCards = document.querySelectorAll('.pr-card');
    prCards.forEach(card => {
        // Add click handler for card expansion or details
        const prId = card.dataset.prId;

        // Handle any additional card interactions here
        card.addEventListener('click', (e) => {
            // Prevent event bubbling for button clicks
            if (!e.target.closest('button')) {
                // Handle card click if needed
            }
        });
    });
}

function createPRCard(pr) {
    const statusClass = pr.status || 'pending';
    const isRejected = pr.status === 'rejected';
    const isPending = pr.status === 'pending';

    return `
        <div class="pr-card ${statusClass}" data-pr-id="${pr._id}">
            <div class="pr-header">
                <img src="${pr.user.avatar_url}" alt="${pr.user.login}" class="user-avatar">
                <div class="pr-info">
                    <h3 class="pr-title">${pr.title}</h3>
                    <span class="pr-repo">${pr.repository}</span>
                    <div class="pr-status-badge ${statusClass}">
                        ${pr.status?.toUpperCase() || 'PENDING'}
                    </div>
                </div>
            </div>
            <div class="pr-body">
                <div class="pr-stats">
                    <div class="stat">
                        <i class='bx bx-user'></i>
                        <span>${pr.username}</span>
                    </div>
                    <div class="stat">
                        <i class='bx bx-git-merge'></i>
                        <span>${new Date(pr.mergedAt).toLocaleDateString()}</span>
                    </div>
                    <div class="stat">
                        <i class='bx bx-trophy'></i>
                        <span>${pr.suggestedPoints} points</span>
                    </div>
                </div>
                
                ${pr.rejectionReason ? `
                    <div class="rejection-reason">
                        <strong>Rejection Reason:</strong> ${pr.rejectionReason}
                    </div>
                ` : ''}
                
                ${pr.reviewedBy ? `
                    <div class="review-info">
                        <small>Reviewed by ${pr.reviewedBy} on ${new Date(pr.reviewedAt).toLocaleDateString()}</small>
                    </div>
                ` : ''}
                
                <div class="pr-actions">
                    ${isPending ? `
                        <button class="approve-btn" onclick="approvePR('${pr._id}')">
                            <i class='bx bx-check'></i>
                            Approve
                        </button>
                        <button class="adjust-btn" onclick="adjustPoints('${pr._id}', ${pr.suggestedPoints})">
                            <i class='bx bx-edit'></i>
                            Adjust Points
                        </button>
                        <button class="reject-btn" onclick="rejectPR('${pr._id}')">
                            <i class='bx bx-x'></i>
                            Reject
                        </button>
                    ` : isRejected ? `
                        <button class="delete-btn" onclick="deleteRejectedPR('${pr._id}')">
                            <i class='bx bx-trash'></i>
                            Delete
                        </button>
                    ` : `
                        <button class="adjust-btn" onclick="adjustPoints('${pr._id}', ${pr.suggestedPoints})">
                            <i class='bx bx-edit'></i>
                            Adjust Points
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

async function loadApprovedPRs() {
    const grid = document.getElementById('pendingPRsGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading">Loading approved PRs...</div>';

    try {
        const response = await fetch(`${serverUrl}/api/admin/all-prs`, {
            credentials: 'include'
        });
        const allPrs = await response.json();
        const approvedPrs = allPrs.filter(pr => pr.status === 'approved');

        if (approvedPrs.length === 0) {
            grid.innerHTML = '<div class="no-data">No approved PRs found</div>';
        } else {
            grid.innerHTML = approvedPrs.map(pr => createPRCard(pr)).join('');
        }

        attachPRCardHandlers();
    } catch (error) {
        console.error('Failed to load approved PRs:', error);
        grid.innerHTML = '<div class="error">Failed to load approved PRs. Please try again.</div>';
    }
}

async function loadRejectedPRs() {
    const grid = document.getElementById('pendingPRsGrid');
    if (!grid) {
        console.error('pendingPRsGrid element not found');
        return;
    }

    grid.innerHTML = '<div class="loading">Loading rejected PRs...</div>';

    try {
        const response = await fetch(`${serverUrl}/api/admin/rejected-prs`, {
            credentials: 'include'
        });
        const prs = await response.json();

        if (prs.length === 0) {
            grid.innerHTML = '<div class="no-data">No rejected PRs found</div>';
        } else {
            grid.innerHTML = prs.map(pr => createPRCard(pr)).join('');
        }

        // Update rejected count if element exists
        const rejectedCount = document.getElementById('rejectedCount');
        if (rejectedCount) {
            rejectedCount.textContent = prs.length;
        }

        attachPRCardHandlers();
    } catch (error) {
        console.error('Failed to load rejected PRs:', error);
        grid.innerHTML = '<div class="error">Failed to load rejected PRs. Please try again.</div>';
    }
}

async function loadAllPRs() {
    const grid = document.getElementById('allPRsGrid');
    grid.innerHTML = '<div class="loading">Loading all PRs...</div>';

    try {
        const response = await fetch(`${serverUrl}/api/admin/all-prs`, {
            credentials: 'include'
        });
        const prs = await response.json();

        if (prs.length === 0) {
            grid.innerHTML = '<div class="no-data">No PR submissions found</div>';
        } else {
            grid.innerHTML = prs.map(pr => createPRCard(pr)).join('');
        }

        // Update stats
        const approved = prs.filter(pr => pr.status === 'approved').length;
        const pending = prs.filter(pr => pr.status === 'pending').length;
        const rejected = prs.filter(pr => pr.status === 'rejected').length;

        document.getElementById('approvedCountAll').textContent = approved;
        document.getElementById('pendingCountAll').textContent = pending;
        document.getElementById('rejectedCountAll').textContent = rejected;
    } catch (error) {
        console.error('Failed to load all PRs:', error);
        grid.innerHTML = '<div class="error">Failed to load all PRs. Please try again.</div>';
    }
}

async function approvePR(prId) {
    try {
        const response = await fetch(`${serverUrl}/api/admin/pr/${prId}/approve`, {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            showToast('success', 'PR approved successfully!');
            loadPendingPRs(); // Refresh the list
        } else {
            throw new Error('Failed to approve PR');
        }
    } catch (error) {
        showToast('error', 'Failed to approve PR');
    }
}

async function rejectPR(prId) {
    const reason = prompt('Please provide a reason for rejection (optional):');

    try {
        const response = await fetch(`${serverUrl}/api/admin/pr/${prId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ rejectionReason: reason })
        });

        if (response.ok) {
            showToast('success', 'PR rejected successfully!');
            loadPendingPRs();
        } else {
            throw new Error('Failed to reject PR');
        }
    } catch (error) {
        showToast('error', 'Failed to reject PR');
    }
}

async function adjustPoints(prId, currentPoints) {
    const newPoints = prompt(`Adjust points for this PR (current: ${currentPoints}):`, currentPoints);

    if (newPoints === null || newPoints === '') return;

    const pointsValue = parseInt(newPoints);
    if (isNaN(pointsValue) || pointsValue < 0) {
        showToast('error', 'Please enter a valid positive number');
        return;
    }

    try {
        const response = await fetch(`${serverUrl}/api/admin/pr/${prId}/points`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ points: pointsValue })
        });

        if (response.ok) {
            showToast('success', 'Points updated successfully!');
            // Reload current section
            const activeSection = document.querySelector('.menu-item.active').dataset.section;
            loadSection(activeSection);
        } else {
            throw new Error('Failed to update points');
        }
    } catch (error) {
        showToast('error', 'Failed to update points');
    }
}

async function deleteRejectedPR(prId) {
    if (!confirm('Are you sure you want to delete this rejected PR? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${serverUrl}/api/admin/pr/${prId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            showToast('success', 'Rejected PR deleted successfully!');
            loadRejectedPRs();
        } else {
            throw new Error('Failed to delete rejected PR');
        }
    } catch (error) {
        showToast('error', 'Failed to delete rejected PR');
    }
}

async function loadUsers() {
    const grid = document.getElementById('pendingPRsGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading">Loading users...</div>';

    try {
        const response = await fetch(`${serverUrl}/api/users`, {
            credentials: 'include'
        });
        const users = await response.json();

        grid.innerHTML = `
            <div class="users-grid">
                ${users.map(user => `
                    <div class="user-card">
                        <img src="${user.avatarUrl}" alt="${user.username}" class="user-avatar">
                        <div class="user-info">
                            <h3>${user.displayName || user.username}</h3>
                            <p>@${user.username}</p>
                            <p>${user.email}</p>
                            ${user.isAdmin ? '<span class="admin-badge">Admin</span>' : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Failed to load users:', error);
        grid.innerHTML = '<div class="error">Failed to load users. Please try again.</div>';
    }
}

async function loadRepos() {
    const grid = document.getElementById('pendingPRsGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading">Loading repositories...</div>';

    try {
        const response = await fetch(`${serverUrl}/api/admin/projects`, {
            credentials: 'include'
        });
        const repos = await response.json();

        grid.innerHTML = `
            <div class="repos-grid">
                ${repos.map(repo => `
                    <div class="repo-card ${repo.reviewStatus}">
                        <div class="repo-header">
                            <h3>${repo.repoLink.split('/').pop()}</h3>
                            <span class="status-badge ${repo.reviewStatus}">${repo.reviewStatus}</span>
                        </div>
                        <div class="repo-info">
                            <p>Owner: ${repo.ownerName}</p>
                            <p>Points: ${repo.successPoints || 50}</p>
                            <p>Tech: ${repo.technology.join(', ')}</p>
                            <a href="${repo.repoLink}" target="_blank" class="repo-link">View Repository</a>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Failed to load repositories:', error);
        grid.innerHTML = '<div class="error">Failed to load repositories. Please try again.</div>';
    }
}

async function loadAutomation() {
    const grid = document.getElementById('pendingPRsGrid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="automation-settings">
            <div class="setting-card">
                <h3>PR Detection</h3>
                <p>Automatically detect and process merged pull requests</p>
                <button class="button" onclick="triggerPRUpdate()">
                    <i class='bx bx-refresh'></i>
                    Trigger PR Update
                </button>
            </div>
            <div class="setting-card">
                <h3>Email Notifications</h3>
                <p>Manage automated email notifications</p>
                <button class="button" onclick="testEmailSystem()">
                    <i class='bx bx-envelope'></i>
                    Test Email System
                </button>
            </div>
        </div>
    `;
}

async function triggerPRUpdate() {
    try {
        showToast('info', 'Triggering PR update...');
        const response = await fetch(`${serverUrl}/api/github/prs/update`, {
            credentials: 'include'
        });

        if (response.ok) {
            showToast('success', 'PR update completed successfully!');
        } else {
            throw new Error('Failed to trigger PR update');
        }
    } catch (error) {
        showToast('error', 'Failed to trigger PR update');
    }
}

async function testEmailSystem() {
    showToast('info', 'Email system test feature coming soon...');
}

function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class='bx ${type === 'success' ? 'bx-check' : 'bx-x'}'></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ... Additional functions for other admin operations ...
