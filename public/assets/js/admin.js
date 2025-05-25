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

async function loadPendingPRs() {
    const grid = document.getElementById('pendingPRsGrid');
    grid.innerHTML = '<div class="loading">Loading PRs...</div>';

    try {
        const response = await fetch(`${serverUrl}/api/admin/pending-prs`, {
            credentials: 'include'
        });
        const prs = await response.json();

        grid.innerHTML = prs.map(pr => createPRCard(pr)).join('');
        
        // Update pending count
        document.getElementById('pendingCount').textContent = prs.length;

        // Add event listeners to PR cards
        attachPRCardHandlers();
    } catch (error) {
        console.error('Failed to load PRs:', error);
        grid.innerHTML = '<div class="error">Failed to load PRs. Please try again.</div>';
    }
}

function createPRCard(pr) {
    return `
        <div class="pr-card" data-pr-id="${pr.id}">
            <div class="pr-header">
                <img src="${pr.user.avatar_url}" alt="${pr.user.login}" class="user-avatar">
                <div class="pr-info">
                    <h3 class="pr-title">${pr.title}</h3>
                    <span class="pr-repo">${pr.repository}</span>
                </div>
            </div>
            <div class="pr-body">
                <div class="pr-stats">
                    <div class="stat">
                        <i class='bx bx-git-merge'></i>
                        <span>${new Date(pr.merged_at).toLocaleDateString()}</span>
                    </div>
                    <div class="stat">
                        <i class='bx bx-trophy'></i>
                        <span>${pr.suggested_points} points</span>
                    </div>
                </div>
                <div class="pr-actions">
                    <button class="approve-btn" onclick="approvePR('${pr.id}')">
                        <i class='bx bx-check'></i>
                        Approve
                    </button>
                    <button class="adjust-btn" onclick="adjustPoints('${pr.id}')">
                        <i class='bx bx-edit'></i>
                        Adjust
                    </button>
                    <button class="reject-btn" onclick="rejectPR('${pr.id}')">
                        <i class='bx bx-x'></i>
                        Reject
                    </button>
                </div>
            </div>
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
            loadPendingPRs(); // Refresh the list
        } else {
            throw new Error('Failed to approve PR');
        }
    } catch (error) {
        showToast('error', 'Failed to approve PR');
    }
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
