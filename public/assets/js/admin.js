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
    const grid = document.getElementById('userPRGrid');
    if (!grid) {
        console.error('userPRGrid element not found');
        return;
    }

    grid.innerHTML = '<div class="loading"><i class="bx bx-loader-alt bx-spin"></i><p>Loading user PRs...</p></div>';

    try {
        const response = await fetch(`${serverUrl}/api/admin/pending-prs`, {
            credentials: 'include'
        });
        const prs = await response.json();

        // Group PRs by user
        const userGroups = groupPRsByUser(prs);

        if (Object.keys(userGroups).length === 0) {
            grid.innerHTML = '<div class="no-data">No pending PRs found</div>';
        } else {
            grid.innerHTML = Object.entries(userGroups)
                .map(([username, userData]) => createUserPRCard(username, userData))
                .join('');

            // Add click handlers after rendering
            addUserCardClickHandlers();
        }

        // Update pending count
        const pendingCount = document.getElementById('pendingCount');
        if (pendingCount) {
            pendingCount.textContent = prs.length;
        }

    } catch (error) {
        console.error('Failed to load PRs:', error);
        grid.innerHTML = '<div class="error">Failed to load PRs. Please try again.</div>';
    }
}

async function loadApprovedPRs() {
    const grid = document.getElementById('userPRGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading"><i class="bx bx-loader-alt bx-spin"></i><p>Loading approved PRs...</p></div>';

    try {
        const response = await fetch(`${serverUrl}/api/admin/all-prs`, {
            credentials: 'include'
        });
        const allPrs = await response.json();
        const approvedPrs = allPrs.filter(pr => pr.status === 'approved');

        const userGroups = groupPRsByUser(approvedPrs);

        if (Object.keys(userGroups).length === 0) {
            grid.innerHTML = '<div class="no-data">No approved PRs found</div>';
        } else {
            grid.innerHTML = Object.entries(userGroups)
                .map(([username, userData]) => createUserPRCard(username, userData))
                .join('');

            // Add click handlers after rendering
            addUserCardClickHandlers();
        }

    } catch (error) {
        console.error('Failed to load approved PRs:', error);
        grid.innerHTML = '<div class="error">Failed to load approved PRs. Please try again.</div>';
    }
}

async function loadRejectedPRs() {
    const grid = document.getElementById('userPRGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="loading"><i class="bx bx-loader-alt bx-spin"></i><p>Loading rejected PRs...</p></div>';

    try {
        const response = await fetch(`${serverUrl}/api/admin/rejected-prs`, {
            credentials: 'include'
        });
        const prs = await response.json();

        const userGroups = groupPRsByUser(prs);

        if (Object.keys(userGroups).length === 0) {
            grid.innerHTML = '<div class="no-data">No rejected PRs found</div>';
        } else {
            grid.innerHTML = Object.entries(userGroups)
                .map(([username, userData]) => createUserPRCard(username, userData))
                .join('');

            // Add click handlers after rendering
            addUserCardClickHandlers();
        }

    } catch (error) {
        console.error('Failed to load rejected PRs:', error);
        grid.innerHTML = '<div class="error">Failed to load rejected PRs. Please try again.</div>';
    }
}

function groupPRsByUser(prs) {
    const groups = {};

    prs.forEach(pr => {
        if (!groups[pr.username]) {
            groups[pr.username] = {
                user: pr.user,
                prs: [],
                stats: {
                    pending: 0,
                    approved: 0,
                    rejected: 0,
                    total: 0
                }
            };
        }

        groups[pr.username].prs.push(pr);
        groups[pr.username].stats[pr.status || 'pending']++;
        groups[pr.username].stats.total++;
    });

    return groups;
}

function createUserPRCard(username, userData) {
    const { user, prs, stats } = userData;
    const latestPR = prs[0]; // Assuming PRs are sorted by date

    // Store userData in a data attribute instead of inline JSON
    return `
        <div class="user-pr-card" data-username="${username}" data-user-data='${JSON.stringify(userData)}'>
            <div class="user-card-header">
                <img src="${user.avatar_url}" alt="${username}" class="user-card-avatar">
                <div class="user-card-info">
                    <h3>${username}</h3>
                    <span class="username">@${username}</span>
                </div>
            </div>
            
            <div class="pr-stats-summary">
                <div class="stat-item pending">
                    <span class="stat-number">${stats.pending}</span>
                    <span class="stat-label">Pending</span>
                </div>
                <div class="stat-item approved">
                    <span class="stat-number">${stats.approved}</span>
                    <span class="stat-label">Approved</span>
                </div>
                <div class="stat-item rejected">
                    <span class="stat-number">${stats.rejected}</span>
                    <span class="stat-label">Rejected</span>
                </div>
            </div>
            
            <div class="pr-preview">
                <span class="preview-text">
                    ${stats.total} PR${stats.total !== 1 ? 's' : ''} • Latest: ${latestPR.title.substring(0, 30)}${latestPR.title.length > 30 ? '...' : ''}
                </span>
                <span class="view-details-btn">
                    View Details <i class='bx bx-chevron-right'></i>
                </span>
            </div>
        </div>
    `;
}

function openUserPRModal(username, userData) {
    // userData is now already an object, no need to parse
    const modal = document.getElementById('userPRModal');

    // Populate modal header
    document.getElementById('modalUserAvatar').src = userData.user.avatar_url;
    document.getElementById('modalUsername').textContent = username;
    document.getElementById('modalUserStats').textContent =
        `${userData.stats.total} PRs • ${userData.stats.pending} Pending • ${userData.stats.approved} Approved • ${userData.stats.rejected} Rejected`;

    // Populate PR list
    const prList = document.getElementById('modalPRList');
    prList.innerHTML = userData.prs.map(pr => createModalPRItem(pr)).join('');

    // Show modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeUserPRModal() {
    const modal = document.getElementById('userPRModal');
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

function createModalPRItem(pr) {
    const statusClass = pr.status || 'pending';
    const isPending = pr.status === 'pending';
    const isRejected = pr.status === 'rejected';

    return `
        <div class="modal-pr-item">
            <div class="pr-item-header">
                <div class="pr-title-section">
                    <h4>${pr.title}</h4>
                    <div class="pr-meta">
                        <span><i class='bx bx-git-repo-forked'></i> ${pr.repository}</span>
                        <span><i class='bx bx-calendar'></i> ${new Date(pr.mergedAt).toLocaleDateString()}</span>
                        <span><i class='bx bx-hash'></i> PR #${pr.prNumber}</span>
                    </div>
                </div>
                <div class="pr-status-badge ${statusClass}">
                    ${(pr.status || 'pending').toUpperCase()}
                </div>
            </div>
            
            <div class="pr-details">
                <div class="pr-info-grid">
                    <div class="info-item">
                        <span class="info-label">Points</span>
                        <span class="info-value">${pr.suggestedPoints}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Submitted</span>
                        <span class="info-value">${new Date(pr.submittedAt).toLocaleDateString()}</span>
                    </div>
                    ${pr.reviewedBy ? `
                        <div class="info-item">
                            <span class="info-label">Reviewed By</span>
                            <span class="info-value">${pr.reviewedBy}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Review Date</span>
                            <span class="info-value">${new Date(pr.reviewedAt).toLocaleDateString()}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="pr-actions">
                    ${isPending ? `
                        <button class="action-btn approve-btn" onclick="approvePR('${pr._id}')">
                            <i class='bx bx-check'></i> Approve
                        </button>
                        <button class="action-btn adjust-btn" onclick="adjustPoints('${pr._id}', ${pr.suggestedPoints})">
                            <i class='bx bx-edit'></i> Adjust Points
                        </button>
                        <button class="action-btn reject-btn" onclick="rejectPR('${pr._id}')">
                            <i class='bx bx-x'></i> Reject
                        </button>
                    ` : isRejected ? `
                        <button class="action-btn reject-btn" onclick="deleteRejectedPR('${pr._id}')">
                            <i class='bx bx-trash'></i> Delete
                        </button>
                    ` : `
                        <button class="action-btn adjust-btn" onclick="adjustPoints('${pr._id}', ${pr.suggestedPoints})">
                            <i class='bx bx-edit'></i> Adjust Points
                        </button>
                    `}
                    <button class="action-btn view-btn" onclick="window.open('${pr.repoUrl}/pull/${pr.prNumber}', '_blank')">
                        <i class='bx bx-link-external'></i> View PR
                    </button>
                </div>
            </div>
            
            ${pr.rejectionReason ? `
                <div class="rejection-reason">
                    <strong>Rejection Reason:</strong> ${pr.rejectionReason}
                </div>
            ` : ''}
        </div>
    `;
}

async function approvePR(prId) {
    try {
        const response = await fetch(`${serverUrl}/api/admin/pr/${prId}/approve`, {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            showToast('success', 'PR approved successfully!');
            closeUserPRModal();
            // Reload current section
            const activeSection = document.querySelector('.menu-item.active').dataset.section;
            loadSection(activeSection);
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
            closeUserPRModal();
            const activeSection = document.querySelector('.menu-item.active').dataset.section;
            loadSection(activeSection);
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
            closeUserPRModal();
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
            closeUserPRModal();
            const activeSection = document.querySelector('.menu-item.active').dataset.section;
            loadSection(activeSection);
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

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        closeUserPRModal();
    }
});

// Close modal with escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeUserPRModal();
    }
});

// Add function to handle click events properly
function addUserCardClickHandlers() {
    const userCards = document.querySelectorAll('.user-pr-card');
    userCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const username = card.dataset.username;
            const userData = JSON.parse(card.dataset.userData);
            openUserPRModal(username, userData);
        });
    });
}

// ... Additional functions for other admin operations ...
