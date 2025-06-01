class UserManagement {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.users = [];
        this.filteredUsers = [];
        this.currentSort = { field: 'displayName', direction: 'asc' };
        this.currentFilter = 'all';
        this.summary = {};
        this.loadCSS();
    }

    loadCSS() {
        // Load the user management CSS if not already loaded
        if (!document.querySelector('link[href*="admin-user-management.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/assets/css/admin-user-management.css';
            document.head.appendChild(link);
        }
    }

    async loadUsers() {
        const grid = document.getElementById('userPRGrid');
        if (!grid) return;

        grid.innerHTML = '<div class="loading"><i class="bx bx-loader-alt bx-spin"></i><p>Loading comprehensive user data...</p></div>';

        try {
            // Use the dedicated admin users endpoint for comprehensive data
            const response = await fetch(`${this.serverUrl}/api/admin/users`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.users = data.users;
            this.summary = data.summary;
            this.filteredUsers = [...this.users];
            this.renderUserManagement();

        } catch (error) {
            console.error('Failed to load users:', error);

            // Fallback to basic users endpoint if admin endpoint fails
            try {
                console.log('Attempting fallback to basic users endpoint...');
                const fallbackResponse = await fetch(`${this.serverUrl}/api/users`, {
                    credentials: 'include'
                });

                if (fallbackResponse.ok) {
                    this.users = await fallbackResponse.json();
                    this.filteredUsers = [...this.users];
                    this.summary = { totalUsers: this.users.length };
                    this.renderUserManagement();

                    // Show warning about limited data
                    if (window.showToast) {
                        window.showToast('warning', 'Using limited user data. Some features may not be available.');
                    }
                } else {
                    throw new Error('Both endpoints failed');
                }
            } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                grid.innerHTML = '<div class="error">Failed to load users. Please check your permissions and try again.</div>';
            }
        }
    }

    renderUserManagement() {
        const grid = document.getElementById('userPRGrid');
        if (!grid) return;

        const userManagementHTML = `
            <div class="user-management-container">
                <div class="section-header">
                    <h2>User Management</h2>
                    <p>Comprehensive management of all registered users and their activity</p>
                </div>

                <div class="user-management-controls">
                    <div class="search-and-filter">
                        <div class="search-box">
                            <i class='bx bx-search'></i>
                            <input type="text" id="userSearchInput" placeholder="Search users by name, email, or username...">
                        </div>
                        
                        <div class="filter-buttons">
                            <button class="filter-btn active" data-filter="all">All Users</button>
                            <button class="filter-btn" data-filter="admins">Admins</button>
                            <button class="filter-btn" data-filter="active">Active Users</button>
                            <button class="filter-btn" data-filter="new">New Users</button>
                            <button class="filter-btn" data-filter="pending">Has Pending PRs</button>
                        </div>
                    </div>

                    <div class="sort-controls">
                        <label>Sort by:</label>
                        <select id="userSortSelect">
                            <option value="displayName">Name</option>
                            <option value="username">Username</option>
                            <option value="email">Email</option>
                            <option value="totalPoints">Points</option>
                            <option value="mergedPRs.length">PR Count</option>
                            <option value="createdAt">Join Date</option>
                            <option value="lastLogin">Last Login</option>
                            <option value="totalPRsSubmitted">Total PRs Submitted</option>
                        </select>
                        <button id="sortDirectionBtn" class="sort-direction-btn" data-direction="asc">
                            <i class='bx bx-sort-up'></i>
                        </button>
                    </div>

                    <div class="user-stats-summary">
                        <div class="stat-card">
                            <span class="stat-number" id="totalUsersCount">${this.summary.totalUsers || this.users.length}</span>
                            <span class="stat-label">Total Users</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number" id="adminUsersCount">${this.summary.adminUsers || this.users.filter(u => u.isAdmin).length}</span>
                            <span class="stat-label">Admins</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number" id="activeUsersCount">${this.summary.activeUsers || this.users.filter(u => u.isActive || (u.mergedPRs && u.mergedPRs.length > 0)).length}</span>
                            <span class="stat-label">Active</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number" id="newUsersCount">${this.summary.newUsers || 0}</span>
                            <span class="stat-label">New (30d)</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number" id="totalPointsCount">${this.summary.totalPointsAwarded || 0}</span>
                            <span class="stat-label">Total Points</span>
                        </div>
                        <div class="stat-card">
                            <span class="stat-number" id="totalPRsCount">${this.summary.totalPRsSubmitted || 0}</span>
                            <span class="stat-label">PRs Submitted</span>
                        </div>
                    </div>
                </div>

                <div class="users-grid" id="usersGrid">
                    ${this.renderUserCards()}
                </div>
            </div>
        `;

        grid.innerHTML = userManagementHTML;
        this.initializeEventListeners();
    }

    renderUserCards() {
        if (this.filteredUsers.length === 0) {
            return '<div class="no-data">No users found matching your criteria</div>';
        }

        return this.filteredUsers.map(user => this.createUserCard(user)).join('');
    }

    createUserCard(user) {
        const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown';
        const lastActive = user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never';
        const totalPRs = user.mergedPRs ? user.mergedPRs.length : 0;
        const cancelledPRs = user.cancelledPRs ? user.cancelledPRs.length : 0;
        const totalPoints = user.totalPoints || user.points || 0;
        const currentBadge = user.badge || 'Beginner';
        const pendingPRs = user.pendingPRsCount || 0;
        const approvedPRs = user.approvedPRsCount || 0;
        const rejectedPRs = user.rejectedPRsCount || 0;
        const profileCompleteness = user.profileCompleteness || 0;

        return `
            <div class="user-management-card ${user.isNewUser ? 'new-user' : ''}" data-user-id="${user._id || user.id}">
                <div class="user-card-header">
                    <div class="user-avatar-section">
                        <img src="${user.avatarUrl || user.photos?.[0]?.value || '/assets/img/default-avatar.png'}" 
                             alt="${user.displayName || user.username}" 
                             class="user-avatar">
                        ${user.isAdmin ? '<span class="admin-badge-indicator">ADMIN</span>' : ''}
                        ${user.isNewUser ? '<span class="new-user-badge">NEW</span>' : ''}
                    </div>
                    
                    <div class="user-basic-info">
                        <h3 class="user-display-name">${user.displayName || user.username || 'Unknown User'}</h3>
                        <p class="user-username">@${user.username || 'unknown'}</p>
                        <p class="user-email">${user.email || 'No email provided'}</p>
                        
                        <div class="profile-completeness">
                            <span class="completeness-label">Profile: ${profileCompleteness}%</span>
                            <div class="completeness-bar">
                                <div class="completeness-fill" style="width: ${profileCompleteness}%"></div>
                            </div>
                        </div>
                    </div>

                    <div class="user-quick-actions">
                        <button class="quick-action-btn view-btn" onclick="userManagement.viewUserDetails('${user._id || user.id}')">
                            <i class='bx bx-eye'></i>
                        </button>
                        ${!user.isAdmin ? `
                            <button class="quick-action-btn edit-btn" onclick="userManagement.editUser('${user._id || user.id}')">
                                <i class='bx bx-edit'></i>
                            </button>
                        ` : ''}
                        ${user.email && user.email !== 'No email provided' ? `
                            <button class="quick-action-btn email-btn" onclick="userManagement.sendEmail('${user.email}', '${user.username}')">
                                <i class='bx bx-envelope'></i>
                            </button>
                        ` : ''}
                    </div>
                </div>

                <div class="user-stats-grid">
                    <div class="stat-item points">
                        <i class='bx bx-star'></i>
                        <div class="stat-content">
                            <span class="stat-value">${totalPoints}</span>
                            <span class="stat-label">Points</span>
                        </div>
                    </div>
                    
                    <div class="stat-item prs">
                        <i class='bx bx-git-pull-request'></i>
                        <div class="stat-content">
                            <span class="stat-value">${approvedPRs}</span>
                            <span class="stat-label">Approved PRs</span>
                        </div>
                    </div>
                    
                    <div class="stat-item pending">
                        <i class='bx bx-time'></i>
                        <div class="stat-content">
                            <span class="stat-value">${pendingPRs}</span>
                            <span class="stat-label">Pending</span>
                        </div>
                    </div>
                    
                    <div class="stat-item rejected">
                        <i class='bx bx-x-circle'></i>
                        <div class="stat-content">
                            <span class="stat-value">${rejectedPRs}</span>
                            <span class="stat-label">Rejected</span>
                        </div>
                    </div>
                </div>

                <div class="user-badge-section">
                    <div class="current-badge">
                        <i class='bx bx-medal'></i>
                        <span class="badge-text">${currentBadge}</span>
                    </div>
                </div>

                <div class="user-activity-info">
                    <div class="activity-item">
                        <i class='bx bx-calendar-plus'></i>
                        <span>Joined: ${joinDate}</span>
                    </div>
                    <div class="activity-item">
                        <i class='bx bx-time'></i>
                        <span>Last Active: ${lastActive}</span>
                    </div>
                    <div class="activity-item">
                        <i class='bx bx-envelope-check'></i>
                        <span>Welcome Email: ${user.welcomeEmailSent ? 'Sent' : 'Not Sent'}</span>
                    </div>
                </div>

                <div class="user-card-footer">
                    <button class="view-details-btn" onclick="userManagement.viewUserDetails('${user._id || user.id}')">
                        View Full Profile
                        <i class='bx bx-chevron-right'></i>
                    </button>
                </div>
            </div>
        `;
    }

    initializeEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('userSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
        }

        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.handleFilter(e.target.dataset.filter);
            });
        });

        // Sort controls
        const sortSelect = document.getElementById('userSortSelect');
        const sortDirectionBtn = document.getElementById('sortDirectionBtn');

        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => this.handleSort(e.target.value));
        }

        if (sortDirectionBtn) {
            sortDirectionBtn.addEventListener('click', () => this.toggleSortDirection());
        }
    }

    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();

        if (!searchTerm) {
            this.filteredUsers = this.applyFilter([...this.users]);
        } else {
            const searchResults = this.users.filter(user => {
                const displayName = (user.displayName || '').toLowerCase();
                const username = (user.username || '').toLowerCase();
                const email = (user.email || '').toLowerCase();

                return displayName.includes(searchTerm) ||
                    username.includes(searchTerm) ||
                    email.includes(searchTerm);
            });

            this.filteredUsers = this.applyFilter(searchResults);
        }

        this.updateUsersGrid();
    }

    handleFilter(filterType) {
        this.currentFilter = filterType;
        this.filteredUsers = this.applyFilter([...this.users]);
        this.updateUsersGrid();
    }

    applyFilter(users) {
        switch (this.currentFilter) {
            case 'admins':
                return users.filter(user => user.isAdmin);
            case 'active':
                return users.filter(user => user.isActive || (user.mergedPRs && user.mergedPRs.length > 0) || (user.approvedPRsCount && user.approvedPRsCount > 0));
            case 'new':
                return users.filter(user => user.isNewUser);
            case 'pending':
                return users.filter(user => user.pendingPRsCount && user.pendingPRsCount > 0);
            default:
                return users;
        }
    }

    handleSort(field) {
        this.currentSort.field = field;
        this.sortUsers();
        this.updateUsersGrid();
    }

    toggleSortDirection() {
        const btn = document.getElementById('sortDirectionBtn');
        this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';

        btn.dataset.direction = this.currentSort.direction;
        btn.innerHTML = this.currentSort.direction === 'asc' ?
            '<i class="bx bx-sort-up"></i>' : '<i class="bx bx-sort-down"></i>';

        this.sortUsers();
        this.updateUsersGrid();
    }

    sortUsers() {
        this.filteredUsers.sort((a, b) => {
            let aVal = this.getNestedValue(a, this.currentSort.field);
            let bVal = this.getNestedValue(b, this.currentSort.field);

            // Handle different data types
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = (bVal || '').toLowerCase();
            }

            if (this.currentSort.direction === 'asc') {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            } else {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            }
        });
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : 0;
        }, obj);
    }

    updateUsersGrid() {
        const grid = document.getElementById('usersGrid');
        if (grid) {
            grid.innerHTML = this.renderUserCards();
        }

        // Update stats
        this.updateStats();
    }

    updateStats() {
        const totalCount = document.getElementById('totalUsersCount');
        const adminCount = document.getElementById('adminUsersCount');
        const activeCount = document.getElementById('activeUsersCount');
        const newCount = document.getElementById('newUsersCount');
        const totalPointsCount = document.getElementById('totalPointsCount');
        const totalPRsCount = document.getElementById('totalPRsCount');

        if (totalCount) totalCount.textContent = this.filteredUsers.length;
        if (adminCount) adminCount.textContent = this.filteredUsers.filter(u => u.isAdmin).length;
        if (activeCount) activeCount.textContent = this.filteredUsers.filter(u => u.isActive || (u.mergedPRs && u.mergedPRs.length > 0)).length;
        if (newCount) newCount.textContent = this.filteredUsers.filter(u => u.isNewUser).length;
        if (totalPointsCount) totalPointsCount.textContent = this.filteredUsers.reduce((sum, u) => sum + (u.totalPoints || 0), 0);
        if (totalPRsCount) totalPRsCount.textContent = this.filteredUsers.reduce((sum, u) => sum + (u.totalPRsSubmitted || 0), 0);
    }

    // Add missing methods after updateStats method
    viewUserDetails(userId) {
        const user = this.users.find(u => (u._id || u.id) === userId);
        if (user) {
            this.openUserDetailsModal(user);
        } else {
            if (window.showToast) {
                window.showToast('error', 'User not found');
            }
        }
    }

    editUser(userId) {
        const user = this.users.find(u => (u._id || u.id) === userId);
        if (user) {
            this.openUserEditModal(user);
        } else {
            if (window.showToast) {
                window.showToast('error', 'User not found');
            }
        }
    }

    // Add new method for sending emails
    sendEmail(email, username) {
        if (window.showToast) {
            window.showToast('info', `Email functionality for ${username} coming soon!`);
        }
        // TODO: Implement email sending functionality
    }

    openUserDetailsModal(user) {
        const modal = document.createElement('div');
        modal.className = 'user-details-modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h2>User Details: ${user.displayName || user.username}</h2>
                    <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">
                        <i class='bx bx-x'></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="user-details-grid">
                        <div class="detail-section">
                            <h3>Basic Information</h3>
                            <div class="detail-item">
                                <label>Display Name:</label>
                                <span>${user.displayName || 'Not provided'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Username:</label>
                                <span>${user.username || 'Not provided'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Email:</label>
                                <span>${user.email || 'Not provided'}</span>
                            </div>
                            <div class="detail-item">
                                <label>GitHub ID:</label>
                                <span>${user.githubId || 'Not available'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Admin Status:</label>
                                <span class="${user.isAdmin ? 'admin-yes' : 'admin-no'}">${user.isAdmin ? 'Yes' : 'No'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Profile Completeness:</label>
                                <span>${user.profileCompleteness || 0}%</span>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h3>Statistics</h3>
                            <div class="detail-item">
                                <label>Total Points:</label>
                                <span>${user.totalPoints || user.points || 0}</span>
                            </div>
                            <div class="detail-item">
                                <label>Current Badge:</label>
                                <span>${user.badge || 'Beginner'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Approved PRs:</label>
                                <span>${user.approvedPRsCount || (user.mergedPRs ? user.mergedPRs.length : 0)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Pending PRs:</label>
                                <span>${user.pendingPRsCount || 0}</span>
                            </div>
                            <div class="detail-item">
                                <label>Rejected PRs:</label>
                                <span>${user.rejectedPRsCount || (user.cancelledPRs ? user.cancelledPRs.length : 0)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Total PRs Submitted:</label>
                                <span>${user.totalPRsSubmitted || 0}</span>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h3>Activity</h3>
                            <div class="detail-item">
                                <label>Joined:</label>
                                <span>${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Unknown'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Last Login:</label>
                                <span>${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Welcome Email:</label>
                                <span>${user.welcomeEmailSent ? 'Sent' : 'Not Sent'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Account Status:</label>
                                <span class="${user.isActive ? 'status-active' : 'status-inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span>
                            </div>
                            <div class="detail-item">
                                <label>User Type:</label>
                                <span>${user.isNewUser ? 'New User (< 30 days)' : 'Established User'}</span>
                            </div>
                        </div>
                    </div>

                    ${user.mergedPRs && user.mergedPRs.length > 0 ? `
                        <div class="detail-section">
                            <h3>Recent Merged PRs</h3>
                            <div class="pr-list">
                                ${user.mergedPRs.slice(0, 5).map(pr => `
                                    <div class="pr-item">
                                        <span class="pr-title">${pr.title || 'Untitled PR'}</span>
                                        <span class="pr-points">${pr.suggestedPoints || pr.points || 0} pts</span>
                                        <span class="pr-date">${pr.mergedAt ? new Date(pr.mergedAt).toLocaleDateString() : 'Unknown'}</span>
                                    </div>
                                `).join('')}
                                ${user.mergedPRs.length > 5 ? `<p>... and ${user.mergedPRs.length - 5} more PRs</p>` : ''}
                            </div>
                        </div>
                    ` : ''}

                    ${user.error ? `
                        <div class="detail-section error-section">
                            <h3>Data Notice</h3>
                            <p class="error-notice">${user.error}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('show');
    }

    openUserEditModal(user) {
        // Placeholder for user editing functionality
        if (window.showToast) {
            window.showToast('info', 'User editing functionality coming soon!');
        }
    }
}

// Initialize global user management instance
window.userManagement = null;
