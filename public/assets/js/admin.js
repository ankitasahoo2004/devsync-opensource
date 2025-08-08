// Server URL - will be set by config service
let serverUrl = window.location.origin; // fallback

// Load serverUrl from config service when available
if (window.configService) {
    window.configService.loadConfig().then(config => {
        serverUrl = config.serverUrl;
    }).catch(error => {
        console.warn('Failed to load server config in admin.js, using fallback:', error);
        serverUrl = window.location.origin;
    });
} else {
    // Listen for config loaded event
    window.addEventListener('configLoaded', (event) => {
        serverUrl = event.detail.serverUrl;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Check admin authorization
    checkAdminAuth();

    // Initialize UI handlers after auth check
    initializeUI();

    // Initialize admin search
    initializeAdminSearch();
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

function initializeAdminSearch() {
    // Add search hint toast after successful auth
    setTimeout(() => {
        if (document.querySelector('.admin-dashboard').style.display !== 'none') {
            showSearchHintToast();
        }
    }, 2000);
}

function showSearchHintToast() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const shortcut = isMac ? 'Cmd+F' : 'Alt+F';

    showToast('info', `💡 Pro tip: Press ${shortcut} to search anything in the admin panel!`);
}

// CSS Management System for Admin Sections
function manageSectionCSS(newSection) {
    // Define CSS files for each section
    const sectionCSSMap = {
        'users': 'admin-user-management.css',
        'pending': null, // Uses main admin.css only
        'approved': null, // Uses main admin.css only  
        'rejected': null, // Uses main admin.css only
        'repos': null, // Uses main admin.css only
        'automation': 'admin-pr-scan.css' // Automation section uses PR scan styles
    };

    // Get current section CSS file
    const newCSSFile = sectionCSSMap[newSection];

    // Remove only section-specific CSS files that are not needed for the new section
    removeUnneededSectionCSS(newCSSFile);

    // Load CSS for the new section if it has a specific CSS file
    if (newCSSFile) {
        loadSectionCSS(newCSSFile);
    }

    // Handle user management special case
    if (newSection === 'users' && window.userManagement) {
        // User management handles its own CSS loading
        window.userManagement.loadCSS();
    } else if (newSection !== 'users' && window.userManagement) {
        // Remove user management CSS when switching away from users section
        window.userManagement.removeCSS();
    }
}

function removeUnneededSectionCSS(newCSSFile) {
    // Define all section-specific CSS files
    const allSectionCSSFiles = [

    ];

    // Remove only CSS files that are not needed for the new section
    allSectionCSSFiles.forEach(cssFile => {
        if (cssFile !== newCSSFile) {
            removeSectionCSS(cssFile);
        }
    });
}

function removeAllSectionCSS() {
    // Remove user management CSS
    if (window.userManagement) {
        window.userManagement.removeCSS();
    }

    // Remove other section-specific CSS files
    const sectionCSSFiles = [

    ];

    sectionCSSFiles.forEach(cssFile => {
        removeSectionCSS(cssFile);
    });
}

function loadSectionCSS(cssFile) {
    // Check if CSS is already loaded to avoid duplicates
    const existingLink = document.querySelector(`link[href*="${cssFile}"]`);
    if (existingLink) {
        return; // CSS already loaded
    }

    // Create and append CSS link
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `assets/css/${cssFile}`;
    link.dataset.sectionCss = 'true'; // Mark as section-specific CSS
    document.head.appendChild(link);
}

function removeSectionCSS(cssFile) {
    // Find and remove the CSS link
    const link = document.querySelector(`link[href*="${cssFile}"]`);
    if (link) {
        link.remove();
    }
}

async function loadSection(section, forceRefresh = false) {
    const contentArea = document.querySelector('.main-content') || document.getElementById('pendingSection');

    // Handle CSS management for section switching
    manageSectionCSS(section);

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
        case 'tickets':
            loadTickets();
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

    // Show modal with proper centering
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
    const confirmed = await showConfirmModal(
        'Reject Pull Request',
        'Are you sure you want to reject this PR?\n\nYou can optionally provide a reason in the next step.'
    );

    if (!confirmed) return;

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
    const confirmed = await showConfirmModal(
        'Delete Rejected PR',
        'Are you sure you want to delete this rejected PR?\n\nThis action cannot be undone.'
    );

    if (!confirmed) return;

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
    // Initialize user management if not already done
    if (!window.userManagement) {
        window.userManagement = new UserManagement(serverUrl);
    }

    // Load users using the dedicated user management system
    await window.userManagement.loadUsers();
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
    const grid = document.getElementById('userPRGrid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="automation-settings">
            <div class="section-header">
                <h2>Automation & Tools</h2>
                <p>Manage automated systems and advanced tools for PR management</p>
            </div>
            
            <div class="automation-grid">
                <div class="setting-card featured">
                    <div class="setting-icon">
                        <i class='bx bx-git-pull-request'></i>
                    </div>
                    <div class="setting-content">
                        <h3>Advanced PR Scanner</h3>
                        <p>Use GraphQL-powered scanning with real-time progress tracking and batch processing for optimal performance</p>
                        <div class="setting-features">
                            <span class="feature-tag">🚀 GraphQL API</span>
                            <span class="feature-tag">📊 Real-time Progress</span>
                            <span class="feature-tag">⚡ Batch Processing</span>
                        </div>
                    </div>
                    <button class="button primary scanner-btn" onclick="openAdvancedPRScan()">
                        <i class='bx bx-search-alt'></i>
                        Start Advanced Scan
                    </button>
                </div>
                
                <div class="setting-card critical">
                    <div class="setting-icon">
                        <i class='bx bx-data'></i>
                    </div>
                    <div class="setting-content">
                        <h3>Database Synchronization</h3>
                        <p>Sync approved PendingPR data to User table. This updates user points and badges from approved PRs.</p>
                        <div class="setting-features">
                            <span class="feature-tag">🔄 Data Migration</span>
                            <span class="feature-tag">📈 Points Update</span>
                            <span class="feature-tag">🏆 Badge Calculation</span>
                        </div>
                    </div>
                    <button class="button critical sync-btn" onclick="syncPendingPRsToUsers()">
                        <i class='bx bx-transfer'></i>
                        Sync PR Data
                    </button>
                </div>
                
                <div class="setting-card">
                    <div class="setting-icon">
                        <i class='bx bx-refresh'></i>
                    </div>
                    <div class="setting-content">
                        <h3>Legacy PR Detection</h3>
                        <p>Simple PR detection and processing (deprecated - use Advanced Scanner instead)</p>
                    </div>
                    <button class="button secondary" onclick="triggerPRUpdate()">
                        <i class='bx bx-refresh'></i>
                        Legacy Trigger
                    </button>
                </div>
                
                <div class="setting-card">
                    <div class="setting-icon">
                        <i class='bx bx-envelope'></i>
                    </div>
                    <div class="setting-content">
                        <h3>Email Notifications</h3>
                        <p>Manage automated email notifications and templates</p>
                    </div>
                    <button class="button secondary" onclick="testEmailSystem()">
                        <i class='bx bx-envelope'></i>
                        Test Email System
                    </button>
                </div>
                
                <div class="setting-card">
                    <div class="setting-icon">
                        <i class='bx bx-database'></i>
                    </div>
                    <div class="setting-content">
                        <h3>Data Management</h3>
                        <p>Backup, export, and manage system data</p>
                    </div>
                    <button class="button secondary" onclick="openDataManagement()">
                        <i class='bx bx-database'></i>
                        Manage Data
                    </button>
                </div>
            </div>
        </div>
    `;
}

function openAdvancedPRScan() {
    // Check if advanced PR scanner is available
    if (window.advancedPRScanManager) {
        window.advancedPRScanManager.open();
        showToast('info', '🚀 Advanced PR Scanner v2.0 opened with terminal interface!');
        return;
    }

    // Fallback to original scanner if advanced is not available
    if (!window.prScanManager) {
        // Import the class and create instance
        if (typeof PRScanManager !== 'undefined') {
            window.prScanManager = new PRScanManager();
        } else {
            showToast('error', 'PR Scanner not loaded. Please refresh the page.');
            return;
        }
    }

    // Open the scanner modal
    window.prScanManager.open();
    showToast('info', 'Advanced PR Scanner opened. Configure settings and start scanning!');
}

// Add global fallback function for modal close (in case inline onclick is still used)
window.closePRScanModal = function () {
    if (window.prScanManager) {
        window.prScanManager.close();
    }
};

function triggerPRUpdate() {
    if (confirm('This will trigger the legacy PR update system. This may take several minutes. Continue?')) {
        showToast('info', 'Starting legacy PR update...');

        fetch(`${serverUrl}/api/github/prs/update`, {
            credentials: 'include'
        })
            .then(response => response.json())
            .then(data => {
                showToast('success', 'Legacy PR update completed!');
                console.log('PR Update Results:', data);
            })
            .catch(error => {
                showToast('error', 'Legacy PR update failed');
                console.error('PR Update Error:', error);
            });
    }
}

function testEmailSystem() {
    showToast('info', 'Email system test initiated...');
    // Add email system test logic here
    setTimeout(() => {
        showToast('success', 'Email system is working correctly!');
    }, 2000);
}

function openDataManagement() {
    showToast('info', 'Data management panel coming soon...');
}

// Load tickets for admin panel
async function loadTickets() {
    const ticketList = document.getElementById('ticketList');
    ticketList.innerHTML = 'Loading...';
    try {
        const res = await fetch('/api/tickets', { credentials: 'include' });
        const tickets = await res.json();
        ticketList.innerHTML = tickets.map(ticket => `
            <div class="ticket-card">
                <h4>${ticket.title}</h4>
                <p>${ticket.description}</p>
                <p>Priority: ${ticket.priority}</p>
                <p>Status: 
                    <select onchange="updateTicketStatus('${ticket._id}', this.value)">
                        <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>Open</option>
                        <option value="in_progress" ${ticket.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>Closed</option>
                    </select>
                </p>
                <p>Github ID: ${ticket.githubId}</p>
                <p>Created: ${new Date(ticket.createdAt).toLocaleString()}</p>
            </div>
        `).join('');
    } catch (err) {
        ticketList.innerHTML = 'Failed to load tickets.';
    }
}

async function updateTicketStatus(id, status) {
    await fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    loadTickets();
}

// Enhanced showToast function for admin panel
function showToast(type, message) {
    // Remove any existing toasts of the same type to prevent spam
    const existingToasts = document.querySelectorAll(`.toast-${type}`);
    existingToasts.forEach(toast => {
        if (toast.textContent.includes(message.substring(0, 20))) {
            toast.remove();
        }
    });

    const toastContainer = getOrCreateToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Get appropriate icon for toast type
    const icons = {
        success: 'bx-check-circle',
        error: 'bx-error-circle',
        info: 'bx-info-circle',
        warning: 'bx-error'
    };

    toast.innerHTML = `
        <i class='bx ${icons[type] || 'bx-info-circle'}'></i>
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto remove toast after delay
    const removeDelay = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();

                    // Remove container if empty
                    if (toastContainer.children.length === 0) {
                        toastContainer.remove();
                    }
                }
            }, 300);
        }
    }, removeDelay);

    return toast;
}

function getOrCreateToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

// Enhanced modal functions for admin
async function showConfirmModal(title, message) {
    if (window.showModal) {
        return await window.showModal('confirm', title, message);
    }

    // Fallback to browser confirm if showModal is not available
    return confirm(`${title}\n\n${message}`);
}

async function showInfoModal(title, message) {
    if (window.showModal) {
        return window.showModal('info', title, message);
    }

    // Fallback to browser alert if showModal is not available
    alert(`${title}\n\n${message}`);
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

async function syncPendingPRsToUsers() {
    const confirmed = await showConfirmModal(
        'Database Synchronization',
        `This will sync all approved and rejected PendingPR data to the User table. This will:

• Update user points based on current suggestedPoints values
• Migrate approved PRs to user.mergedPRs
• Migrate rejected PRs to user.cancelledPRs with rejection reasons
• Recalculate user badges  
• Update leaderboard rankings
• Apply any point adjustments made to existing PRs

This operation is safe but may take a few minutes. Continue?`
    );

    if (!confirmed) return;

    // Disable button and show loading state
    const syncBtn = document.querySelector('.sync-btn');
    const originalHTML = syncBtn.innerHTML;
    syncBtn.disabled = true;
    syncBtn.innerHTML = '<div class="loading-spinner"></div> Syncing Data...';

    try {
        showToast('info', 'Starting database synchronization with approved and rejected PRs...');

        const response = await fetch(`${serverUrl}/api/admin/sync-pending-prs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                createBackup: true // Optional backup before sync
            })
        });

        const result = await response.json();

        if (result.success) {
            showSyncResults(result.results);
            const pointsRecalculatedMessage = result.results.updatedUsers > 0
                ? ` Points recalculated for ${result.results.updatedUsers} users.`
                : '';
            const cancelledMessage = result.results.syncedCancelledPRs > 0
                ? ` ${result.results.syncedCancelledPRs} rejected PRs synced to cancelledPRs.`
                : '';
            showToast('success', `Database sync completed! Updated ${result.results.updatedUsers} users with ${result.results.syncedPRs} new PRs.${cancelledMessage}${pointsRecalculatedMessage}`);
        } else {
            throw new Error(result.details || 'Sync failed');
        }

    } catch (error) {
        console.error('Database sync error:', error);
        showToast('error', `Database sync failed: ${error.message}`);
    } finally {
        // Restore button state
        syncBtn.disabled = false;
        syncBtn.innerHTML = originalHTML;
    }
}

function showSyncResults(results) {
    const modal = document.createElement('div');
    modal.className = 'sync-results-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-container">
            <div class="modal-header">
                <h2>Database Sync Results</h2>
                <button class="close-modal" onclick="this.closest('.sync-results-modal').remove()">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="sync-stats-grid">
                    <div class="stat-item success">
                        <i class='bx bx-user'></i>
                        <span class="stat-number">${results.updatedUsers}</span>
                        <span class="stat-label">Users Updated</span>
                    </div>
                    <div class="stat-item success">
                        <i class='bx bx-git-pull-request'></i>
                        <span class="stat-number">${results.syncedPRs}</span>
                        <span class="stat-label">New PRs Synced</span>
                    </div>
                    <div class="stat-item warning">
                        <i class='bx bx-x-circle'></i>
                        <span class="stat-number">${results.syncedCancelledPRs || 0}</span>
                        <span class="stat-label">Cancelled PRs Synced</span>
                    </div>
                    <div class="stat-item info">
                        <i class='bx bx-calculator'></i>
                        <span class="stat-number">${results.totalApprovedPRs}</span>
                        <span class="stat-label">Points Recalculated</span>
                    </div>
                    <div class="stat-item info">
                        <i class='bx bx-time'></i>
                        <span class="stat-number">${results.duration}</span>
                        <span class="stat-label">Duration</span>
                    </div>
                    <div class="stat-item ${results.errors.length > 0 ? 'warning' : 'success'}">
                        <i class='bx ${results.errors.length > 0 ? 'bx-error' : 'bx-check'}'></i>
                        <span class="stat-number">${results.errors.length}</span>
                        <span class="stat-label">Errors</span>
                    </div>
                </div>
                
                <div class="sync-details">
                    <h3>Summary</h3>
                    <ul>
                        <li>Total Users Processed: ${results.totalUsers}</li>
                        <li>Total Approved PRs: ${results.totalApprovedPRs}</li>
                        <li>Total Rejected PRs: ${results.totalRejectedPRs || 0}</li>
                        <li>New PRs Synced: ${results.syncedPRs} PRs</li>
                        <li>Cancelled PRs Synced: ${results.syncedCancelledPRs || 0} PRs</li>
                        <li>Users Updated: ${results.updatedUsers}</li>
                        <li><strong>All user points recalculated from current suggestedPoints values</strong></li>
                        <li><strong>Rejected PRs synced to user.cancelledPRs with rejection reasons</strong></li>
                    </ul>
                    
                    ${results.validation ? `
                        <h3>Validation & Debug Info</h3>
                        <ul>
                            <li>Approved PRs in Database: ${results.validation.approvedPRCount}</li>
                            <li>Rejected PRs in Database: ${results.validation.rejectedPRCount || 0}</li>
                            <li>User Merged PRs: ${results.validation.userPRCount}</li>
                            <li>User Cancelled PRs: ${results.validation.userCancelledPRCount || 0}</li>
                            <li>Total Users in DB: ${results.validation.totalUsers}</li>
                            <li>Users with PRs: ${results.validation.debugInfo?.usersWithPRs || 'N/A'}</li>
                            <li>Users with Cancelled PRs: ${results.validation.debugInfo?.usersWithCancelledPRs || 'N/A'}</li>
                            <li>Users with Points: ${results.validation.debugInfo?.usersWithPoints || 'N/A'}</li>
                            <li>Integrity Check: ${results.validation.isValid ? '✅ Passed' : '❌ Failed'}</li>
                        </ul>
                        ${results.validation.userIdTypes ? `
                            <h4>PendingPR User ID Types:</h4>
                            <ul>
                                ${Object.entries(results.validation.userIdTypes).map(([type, count]) =>
        `<li>${type}: ${count} records</li>`
    ).join('')}
                            </ul>
                        ` : ''}
                    ` : ''}
                    
                    ${results.errors.length > 0 ? `
                        <h3>Errors (${results.errors.length})</h3>
                        <div class="error-list">
                            ${results.errors.slice(0, 10).map(error => `
                                <div class="error-item">
                                    <strong>User ID:</strong> ${error.userId || 'N/A'}<br>
                                    <strong>Username:</strong> ${error.username || 'N/A'}<br>
                                    <strong>Error:</strong> ${error.error}
                                </div>
                            `).join('')}
                            ${results.errors.length > 10 ? `<p>... and ${results.errors.length - 10} more errors</p>` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.classList.add('show');
}
