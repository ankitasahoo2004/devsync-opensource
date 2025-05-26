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

let currentPRId = null;

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

    // Modal close handlers
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });

    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAllModals();
            }
        });
    });
}

function loadSection(section, refresh = false) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });

    // Show selected section
    const sectionElement = document.getElementById(`${section}Section`);
    if (sectionElement) {
        sectionElement.classList.add('active');

        // Load data based on section
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
        }
    }
}

function createPRCard(pr, type) {
    const statusBadge = {
        pending: '<span class="status-badge pending"><i class="bx bx-time-five"></i>Pending Review</span>',
        approved: '<span class="status-badge approved"><i class="bx bx-check-circle"></i>Approved</span>',
        rejected: '<span class="status-badge rejected"><i class="bx bx-x-circle"></i>Rejected</span>'
    }[type];

    const actions = {
        pending: `
            <div class="pr-actions">
                <button class="approve-btn" onclick="event.stopPropagation(); approvePR('${pr._id}')">
                    <i class='bx bx-check'></i>
                    Approve
                </button>
                <button class="adjust-btn" onclick="event.stopPropagation(); adjustPoints('${pr._id}')">
                    <i class='bx bx-edit'></i>
                    Adjust Points
                </button>
                <button class="reject-btn" onclick="event.stopPropagation(); rejectPR('${pr._id}')">
                    <i class='bx bx-x'></i>
                    Reject
                </button>
            </div>
        `,
        approved: `
            <div class="pr-info-section">
                <p><strong>Reviewed by:</strong> ${pr.reviewedBy}</p>
                <p><strong>Reviewed at:</strong> ${new Date(pr.reviewedAt).toLocaleString()}</p>
                <p><strong>Points awarded:</strong> ${pr.suggestedPoints}</p>
            </div>
        `,
        rejected: `
            <div class="pr-info-section">
                <p><strong>Reviewed by:</strong> ${pr.reviewedBy}</p>
                <p><strong>Reviewed at:</strong> ${new Date(pr.reviewedAt).toLocaleString()}</p>
                <p><strong>Reason:</strong> ${pr.rejectionReason || 'No reason provided'}</p>
                <button class="delete-btn" onclick="event.stopPropagation(); deletePR('${pr._id}')">
                    <i class='bx bx-trash'></i>
                    Delete
                </button>
            </div>
        `
    }[type];

    return `
        <div class="pr-card" data-pr-id="${pr._id}" data-status="${type}" onclick="showPRDetails('${pr._id}', '${type}')">
            <div class="pr-header">
                <img src="${pr.userAvatarUrl || `https://github.com/${pr.username}.png`}" 
                     alt="${pr.username}" class="user-avatar">
                <div class="pr-info">
                    <h3 class="pr-title">${pr.title}</h3>
                    <div class="pr-meta">
                        <span class="pr-repo">
                            <i class='bx bx-git-repo-forked'></i>
                            ${pr.repository}
                        </span>
                        <span class="pr-user">
                            <i class='bx bx-user'></i>
                            ${pr.username}
                        </span>
                    </div>
                    ${statusBadge}
                </div>
            </div>
            <div class="pr-body">
                <div class="pr-stats">
                    <div class="stat">
                        <i class='bx bx-git-merge'></i>
                        <span>Merged: ${new Date(pr.mergedAt).toLocaleDateString()}</span>
                    </div>
                    <div class="stat">
                        <i class='bx bx-trophy'></i>
                        <span>${pr.suggestedPoints} points</span>
                    </div>
                    <div class="stat">
                        <i class='bx bx-link-external'></i>
                        <a href="${pr.prUrl}" target="_blank" onclick="event.stopPropagation()">View PR</a>
                    </div>
                </div>
                ${actions}
            </div>
        </div>
    `;
}

// Store PR data for popup details
let prDataCache = {};

async function loadPendingPRs() {
    const grid = document.getElementById('pendingPRsGrid');
    grid.innerHTML = '<div class="loading"><i class="bx bx-loader-alt bx-spin"></i> Loading pending PRs...</div>';

    try {
        const response = await fetch(`${serverUrl}/api/admin/pending-prs`, {
            credentials: 'include'
        });
        const prs = await response.json();

        // Store in cache for popup details
        prs.forEach(pr => {
            prDataCache[pr._id] = { ...pr, type: 'pending' };
        });

        if (prs.length === 0) {
            grid.innerHTML = '<div class="no-data"><i class="bx bx-info-circle"></i><br>No pending PRs found</div>';
        } else {
            grid.innerHTML = prs.map(pr => createPRCard(pr, 'pending')).join('');
        }

        document.getElementById('pendingCount').textContent = prs.length;
    } catch (error) {
        console.error('Failed to load pending PRs:', error);
        grid.innerHTML = '<div class="error"><i class="bx bx-error"></i><br>Failed to load pending PRs. Please try again.</div>';
    }
}

async function loadApprovedPRs() {
    const grid = document.getElementById('approvedPRsGrid');
    grid.innerHTML = '<div class="loading"><i class="bx bx-loader-alt bx-spin"></i> Loading approved PRs...</div>';

    try {
        const response = await fetch(`${serverUrl}/api/admin/approved-prs`, {
            credentials: 'include'
        });
        const prs = await response.json();

        // Store in cache for popup details
        prs.forEach(pr => {
            prDataCache[pr._id] = { ...pr, type: 'approved' };
        });

        if (prs.length === 0) {
            grid.innerHTML = '<div class="no-data"><i class="bx bx-info-circle"></i><br>No approved PRs found</div>';
        } else {
            grid.innerHTML = prs.map(pr => createPRCard(pr, 'approved')).join('');
        }
    } catch (error) {
        console.error('Failed to load approved PRs:', error);
        grid.innerHTML = '<div class="error"><i class="bx bx-error"></i><br>Failed to load approved PRs. Please try again.</div>';
    }
}

async function loadRejectedPRs() {
    const grid = document.getElementById('rejectedPRsGrid');
    grid.innerHTML = '<div class="loading"><i class="bx bx-loader-alt bx-spin"></i> Loading rejected PRs...</div>';

    try {
        const response = await fetch(`${serverUrl}/api/admin/rejected-prs`, {
            credentials: 'include'
        });
        const prs = await response.json();

        // Store in cache for popup details
        prs.forEach(pr => {
            prDataCache[pr._id] = { ...pr, type: 'rejected' };
        });

        if (prs.length === 0) {
            grid.innerHTML = '<div class="no-data"><i class="bx bx-info-circle"></i><br>No rejected PRs found</div>';
        } else {
            grid.innerHTML = prs.map(pr => createPRCard(pr, 'rejected')).join('');
        }
    } catch (error) {
        console.error('Failed to load rejected PRs:', error);
        grid.innerHTML = '<div class="error"><i class="bx bx-error"></i><br>Failed to load rejected PRs. Please try again.</div>';
    }
}

// PR Details Popup
function showPRDetails(prId, type) {
    const pr = prDataCache[prId];
    if (!pr) return;

    // Create modal if it doesn't exist
    let modal = document.getElementById('prDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'prDetailModal';
        modal.className = 'pr-detail-modal';
        document.body.appendChild(modal);
    }

    const statusInfo = {
        pending: { color: '#fbbf24', icon: 'bx-time-five', text: 'Pending Review' },
        approved: { color: '#4ade80', icon: 'bx-check-circle', text: 'Approved' },
        rejected: { color: '#f87171', icon: 'bx-x-circle', text: 'Rejected' }
    }[type];

    const actionButtons = type === 'pending' ? `
        <div style="display: flex; gap: 1rem; margin-top: 2rem;">
            <button class="approve-btn" onclick="approvePR('${pr._id}'); closePRDetails();">
                <i class='bx bx-check'></i> Approve
            </button>
            <button class="adjust-btn" onclick="adjustPoints('${pr._id}'); closePRDetails();">
                <i class='bx bx-edit'></i> Adjust Points
            </button>
            <button class="reject-btn" onclick="rejectPR('${pr._id}'); closePRDetails();">
                <i class='bx bx-x'></i> Reject
            </button>
        </div>
    ` : '';

    const reviewInfo = pr.reviewedBy ? `
        <div style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: 12px; margin: 1rem 0;">
            <p><strong>Reviewed by:</strong> ${pr.reviewedBy}</p>
            <p><strong>Reviewed at:</strong> ${new Date(pr.reviewedAt).toLocaleString()}</p>
            ${pr.rejectionReason ? `<p><strong>Reason:</strong> ${pr.rejectionReason}</p>` : ''}
        </div>
    ` : '';

    modal.innerHTML = `
        <div class="pr-detail-content">
            <div class="pr-detail-header">
                <div>
                    <h2 style="color: #fff; margin: 0; font-size: 1.5rem;">${pr.title}</h2>
                    <div style="margin: 1rem 0; display: flex; align-items: center; gap: 1rem;">
                        <span style="background: rgba(${statusInfo.color.replace('#', '')}, 0.2); color: ${statusInfo.color}; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">
                            <i class='bx ${statusInfo.icon}'></i> ${statusInfo.text}
                        </span>
                        <span style="color: rgba(255,255,255,0.7);">${pr.suggestedPoints} points</span>
                    </div>
                </div>
                <button class="pr-detail-close" onclick="closePRDetails()">×</button>
            </div>
            
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;">
                <img src="${pr.userAvatarUrl || `https://github.com/${pr.username}.png`}" 
                     style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid ${statusInfo.color};">
                <div>
                    <h3 style="color: #fff; margin: 0;">${pr.username}</h3>
                    <p style="color: rgba(255,255,255,0.7); margin: 0.5rem 0;">${pr.repository}</p>
                    <a href="${pr.prUrl}" target="_blank" style="color: #60a5fa; text-decoration: none;">
                        <i class='bx bx-link-external'></i> View on GitHub
                    </a>
                </div>
            </div>

            <div style="background: rgba(0,0,0,0.3); padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;">
                <h4 style="color: #fff; margin-bottom: 1rem;">PR Details</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; color: rgba(255,255,255,0.8);">
                    <div>
                        <strong>PR Number:</strong> #${pr.prNumber}
                    </div>
                    <div>
                        <strong>Merged Date:</strong> ${new Date(pr.mergedAt).toLocaleDateString()}
                    </div>
                    <div>
                        <strong>Repository:</strong> ${pr.repository}
                    </div>
                    <div>
                        <strong>Points:</strong> ${pr.suggestedPoints}
                    </div>
                </div>
            </div>

            ${reviewInfo}
            ${actionButtons}
        </div>
    `;

    // Show modal with animation
    setTimeout(() => modal.classList.add('show'), 10);

    // Close on outside click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closePRDetails();
        }
    };
}

function closePRDetails() {
    const modal = document.getElementById('prDetailModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 300);
    }
}

async function approvePR(prId) {
    try {
        const response = await fetch(`${serverUrl}/api/admin/pr/${prId}/approve`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
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

function adjustPoints(prId) {
    currentPRId = prId;
    document.getElementById('pointsModal').style.display = 'flex';
    document.getElementById('adjustedPoints').focus();
}

async function approveWithAdjustedPoints() {
    const adjustedPoints = document.getElementById('adjustedPoints').value;

    if (!adjustedPoints || adjustedPoints < 1 || adjustedPoints > 200) {
        showToast('error', 'Please enter valid points (1-200)');
        return;
    }

    try {
        const response = await fetch(`${serverUrl}/api/admin/pr/${currentPRId}/approve`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ adjustedPoints: parseInt(adjustedPoints) })
        });

        if (response.ok) {
            showToast('success', `PR approved with ${adjustedPoints} points!`);
            closePointsModal();
            loadPendingPRs();
        } else {
            throw new Error('Failed to approve PR with adjusted points');
        }
    } catch (error) {
        showToast('error', 'Failed to approve PR');
    }
}

function rejectPR(prId) {
    currentPRId = prId;
    document.getElementById('rejectionModal').style.display = 'flex';
    document.getElementById('rejectionReason').focus();
}

async function confirmRejectPR() {
    const rejectionReason = document.getElementById('rejectionReason').value.trim();

    if (!rejectionReason) {
        showToast('error', 'Please provide a reason for rejection');
        return;
    }

    try {
        const response = await fetch(`${serverUrl}/api/admin/pr/${currentPRId}/reject`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rejectionReason })
        });

        if (response.ok) {
            showToast('success', 'PR rejected successfully');
            closeRejectionModal();
            loadPendingPRs();
        } else {
            throw new Error('Failed to reject PR');
        }
    } catch (error) {
        showToast('error', 'Failed to reject PR');
    }
}

async function deletePR(prId) {
    if (!confirm('Are you sure you want to permanently delete this rejected PR?')) {
        return;
    }

    try {
        const response = await fetch(`${serverUrl}/api/admin/pr/${prId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            showToast('success', 'PR deleted successfully');
            loadRejectedPRs();
        } else {
            throw new Error('Failed to delete PR');
        }
    } catch (error) {
        showToast('error', 'Failed to delete PR');
    }
}

function closePointsModal() {
    document.getElementById('pointsModal').style.display = 'none';
    document.getElementById('adjustedPoints').value = '50';
    currentPRId = null;
}

function closeRejectionModal() {
    document.getElementById('rejectionModal').style.display = 'none';
    document.getElementById('rejectionReason').value = '';
    currentPRId = null;
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    currentPRId = null;
}

function showToast(type, message) {
    // Remove any existing toasts first
    document.querySelectorAll('.toast').forEach(toast => {
        toast.remove();
    });

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
        success: 'bx-check-circle',
        error: 'bx-x-circle',
        info: 'bx-info-circle',
        warning: 'bx-error-circle'
    };

    toast.innerHTML = `
        <i class='bx ${iconMap[type] || 'bx-info-circle'}'></i>
        <span>${message}</span>
    `;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);

    // Remove toast after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 400);
    }, 4000);
}

async function triggerPRScan() {
    try {
        showToast('info', 'Triggering PR scan...');

        const response = await fetch(`${serverUrl}/api/admin/trigger-pr-scan`, {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            showToast('success', 'PR scan triggered successfully! Check console logs for progress.');
        } else {
            throw new Error('Failed to trigger PR scan');
        }
    } catch (error) {
        console.error('Failed to trigger PR scan:', error);
        showToast('error', 'Failed to trigger PR scan');
    }
}

// ... Additional functions for other admin operations ...
