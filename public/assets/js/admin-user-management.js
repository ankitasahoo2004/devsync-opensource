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

            // Also fetch recent PRs for all users
            await this.loadRecentPRsForUsers(this.users);

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

    // Add new method to fetch recent PRs for users
    async loadRecentPRsForUsers(users) {
        try {
            // Fetch all pending PRs for analysis
            const prResponse = await fetch(`${this.serverUrl}/api/admin/all-prs`, {
                credentials: 'include'
            });

            if (prResponse.ok) {
                const allPRs = await prResponse.json();

                // Group PRs by user for easy lookup
                this.userPRsMap = new Map();

                allPRs.forEach(pr => {
                    const userId = pr.userId || pr.username;
                    if (!this.userPRsMap.has(userId)) {
                        this.userPRsMap.set(userId, {
                            approved: [],
                            pending: [],
                            rejected: []
                        });
                    }

                    const userPRs = this.userPRsMap.get(userId);
                    userPRs[pr.status].push(pr);
                });

                // Sort PRs by date for each user
                this.userPRsMap.forEach((prs, userId) => {
                    Object.keys(prs).forEach(status => {
                        prs[status].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
                    });
                });
            }
        } catch (error) {
            console.error('Error loading recent PRs:', error);
            this.userPRsMap = new Map();
        }
    }

    // Add method to get user's recent PRs
    getUserRecentPRs(userId, username) {
        const userPRs = this.userPRsMap.get(userId) || this.userPRsMap.get(username);
        if (!userPRs) {
            return { approved: [], pending: [], rejected: [] };
        }

        // Return most recent 5 PRs from each category
        return {
            approved: userPRs.approved.slice(0, 5),
            pending: userPRs.pending.slice(0, 5),
            rejected: userPRs.rejected.slice(0, 5)
        };
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

    // Add new method for scanning individual user PRs
    async scanUserPRs(userId) {
        const user = this.users.find(u => (u._id || u.id) === userId);
        if (!user) {
            showToast('error', 'User not found');
            return;
        }

        // Show scanning modal
        this.showUserPRScanModal(user);
    }

    showUserPRScanModal(user) {
        const modal = document.createElement('div');
        modal.className = 'user-pr-scan-modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h2>Scan PRs for ${user.username}</h2>
                    <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">
                        <i class='bx bx-x'></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="scan-info">
                        <div class="user-info">
                            <img src="${user.avatarUrl || user.photos?.[0]?.value || '/assets/img/default-avatar.png'}" 
                                 alt="${user.displayName || user.username}" class="user-avatar">
                            <div>
                                <h3>${user.displayName || user.username}</h3>
                                <p>@${user.username}</p>
                            </div>
                        </div>
                        <div class="scan-description">
                            <p>This will scan for merged PRs from <strong>${user.username}</strong> in registered repositories since the program start date (March 14, 2025).</p>
                            <p>Only new PRs not already in the system will be submitted for admin approval.</p>
                        </div>
                    </div>

                    <div class="scan-progress" id="userScanProgress" style="display: none;">
                        <div class="progress-header">
                            <div class="progress-title">Scanning Progress</div>
                            <div class="progress-stats" id="userProgressStats">Initializing...</div>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="userProgressBar"></div>
                        </div>
                    </div>

                    <div class="scan-results" id="userScanResults" style="display: none;">
                        <div class="results-header">
                            <div class="results-icon success">
                                <i class='bx bx-check'></i>
                            </div>
                            <h3 class="results-title">Scan Complete</h3>
                        </div>
                        
                        <div class="results-grid">
                            <div class="result-card">
                                <span class="result-number" id="userNewPRsResult">0</span>
                                <span class="result-label">New PRs Found</span>
                            </div>
                            <div class="result-card">
                                <span class="result-number" id="userSkippedPRsResult">0</span>
                                <span class="result-label">Duplicates Skipped</span>
                            </div>
                            <div class="result-card">
                                <span class="result-number" id="userProcessingTimeResult">0s</span>
                                <span class="result-label">Processing Time</span>
                            </div>
                        </div>

                        <div class="scan-log" id="userScanLog">
                            <!-- Log entries will be added here -->
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class='bx bx-x'></i>
                        Cancel
                    </button>
                    <button class="scan-btn" id="startUserScanBtn" onclick="userManagement.executeUserPRScan('${user._id || user.id}', this)">
                        <i class='bx bx-search'></i>
                        Start PR Scan
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('show');
    }

    async executeUserPRScan(userId, button) {
        const user = this.users.find(u => (u._id || u.id) === userId);
        if (!user) return;

        const modal = button.closest('.modal-overlay');
        const progressSection = modal.querySelector('#userScanProgress');
        const resultsSection = modal.querySelector('#userScanResults');
        const progressBar = modal.querySelector('#userProgressBar');
        const progressStats = modal.querySelector('#userProgressStats');
        const logContainer = modal.querySelector('#userScanLog');

        // Show scanning state
        button.disabled = true;
        button.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Scanning...';
        progressSection.style.display = 'block';

        const scanResults = {
            newPRs: 0,
            skippedDuplicates: 0,
            startTime: Date.now(),
            endTime: null
        };

        try {
            this.addUserLogEntry(logContainer, 'info', 'Starting PR scan...');
            progressStats.textContent = 'Fetching registered repositories...';
            progressBar.style.width = '10%';

            // Fetch registered repositories
            const registeredRepos = await this.fetchRegisteredRepos();
            this.addUserLogEntry(logContainer, 'success', `Found ${registeredRepos.length} registered repositories`);

            progressStats.textContent = 'Scanning user PRs...';
            progressBar.style.width = '30%';

            // Scan user PRs using GraphQL
            const userPRResults = await this.scanIndividualUserPRs(user, registeredRepos, logContainer, progressBar, progressStats);

            scanResults.newPRs = userPRResults.newPRs;
            scanResults.skippedDuplicates = userPRResults.skippedDuplicates;
            scanResults.endTime = Date.now();

            // Update results
            const duration = Math.round((scanResults.endTime - scanResults.startTime) / 1000);
            modal.querySelector('#userNewPRsResult').textContent = scanResults.newPRs;
            modal.querySelector('#userSkippedPRsResult').textContent = scanResults.skippedDuplicates;
            modal.querySelector('#userProcessingTimeResult').textContent = `${duration}s`;

            // Show results section
            resultsSection.style.display = 'block';
            progressStats.textContent = 'Scan completed';
            progressBar.style.width = '100%';

            this.addUserLogEntry(logContainer, 'success', `✅ Scan completed in ${duration} seconds`);
            this.addUserLogEntry(logContainer, 'info', `Found ${scanResults.newPRs} new PRs for admin review`);

            // Show success toast
            if (scanResults.newPRs > 0) {
                showToast('success', `Found ${scanResults.newPRs} new PRs for ${user.username}!`);
            } else {
                showToast('info', `No new PRs found for ${user.username}`);
            }

        } catch (error) {
            this.addUserLogEntry(logContainer, 'error', `Scan failed: ${error.message}`);
            showToast('error', `PR scan failed: ${error.message}`);
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="bx bx-refresh"></i> Scan Again';
        }
    }

    async fetchRegisteredRepos() {
        const response = await fetch(`${serverUrl}/api/admin/projects`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch repositories');
        }

        const allRepos = await response.json();
        return allRepos.filter(repo => repo.reviewStatus === 'accepted');
    }

    async scanIndividualUserPRs(user, registeredRepos, logContainer, progressBar, progressStats) {
        try {
            this.addUserLogEntry(logContainer, 'info', `Scanning PRs for @${user.username}...`);
            progressStats.textContent = `Fetching PRs for ${user.username}...`;
            progressBar.style.width = '50%';

            // Use GraphQL for more efficient querying
            const query = `
                query($username: String!, $after: String) {
                    user(login: $username) {
                        pullRequests(
                            first: 100,
                            after: $after,
                            states: MERGED,
                            orderBy: { field: UPDATED_AT, direction: DESC }
                        ) {
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                            nodes {
                                number
                                title
                                mergedAt
                                repository {
                                    nameWithOwner
                                }
                                baseRepository {
                                    nameWithOwner
                                }
                            }
                        }
                    }
                }
            `;

            const response = await fetch(`${serverUrl}/api/github/graphql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    query,
                    variables: { username: user.username }
                })
            });

            if (!response.ok) {
                throw new Error(`GraphQL query failed for ${user.username}`);
            }

            const data = await response.json();
            const pullRequests = data.data?.user?.pullRequests?.nodes || [];

            progressStats.textContent = `Processing ${pullRequests.length} merged PRs...`;
            progressBar.style.width = '70%';

            // Filter PRs that match registered repositories
            let newPRs = 0;
            let skippedDuplicates = 0;
            const programStartDate = new Date('2025-03-14');

            for (const pr of pullRequests) {
                const mergedDate = new Date(pr.mergedAt);
                if (mergedDate < programStartDate) continue;

                const repoUrl = `https://github.com/${pr.baseRepository.nameWithOwner}`;
                const isRegistered = registeredRepos.some(repo => repo.repoLink === repoUrl);

                if (isRegistered) {
                    // Check for duplicates first
                    const isDuplicate = await this.checkPRDuplicate(user, pr, repoUrl);

                    if (isDuplicate) {
                        skippedDuplicates++;
                        this.addUserLogEntry(logContainer, 'info', `⚠️ Skipped duplicate: ${pr.title} in ${pr.baseRepository.nameWithOwner}`);
                        continue;
                    }

                    // Submit PR for approval
                    const submitted = await this.submitUserPRForApproval(user, pr, repoUrl);
                    if (submitted) {
                        newPRs++;
                        this.addUserLogEntry(logContainer, 'success', `✅ Found new PR: ${pr.title} in ${pr.baseRepository.nameWithOwner}`);
                    }
                }
            }

            progressStats.textContent = 'Finalizing results...';
            progressBar.style.width = '90%';

            if (newPRs > 0) {
                this.addUserLogEntry(logContainer, 'success', `✅ ${user.username}: ${newPRs} new PRs found`);
            } else {
                this.addUserLogEntry(logContainer, 'info', `ℹ️ ${user.username}: No new PRs found`);
            }

            return { newPRs, skippedDuplicates };

        } catch (error) {
            this.addUserLogEntry(logContainer, 'error', `❌ ${user.username}: ${error.message}`);
            throw error;
        }
    }

    async checkPRDuplicate(user, pr, repoUrl) {
        try {
            const response = await fetch(`${serverUrl}/api/admin/all-prs`, {
                credentials: 'include'
            });

            if (!response.ok) {
                return false; // If we can't check, proceed with submission
            }

            const allPRs = await response.json();

            // Check if PR already exists
            const exists = allPRs.some(existingPR =>
                (existingPR.userId === (user.githubId || user._id) || existingPR.username === user.username) &&
                existingPR.repoUrl === repoUrl &&
                existingPR.prNumber === pr.number
            );

            return exists;
        } catch (error) {
            console.error('Error checking PR duplicate:', error);
            return false; // If check fails, proceed with submission
        }
    }

    async submitUserPRForApproval(user, pr, repoUrl) {
        try {
            const response = await fetch(`${serverUrl}/api/admin/submit-pr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    userId: user.githubId || user._id,
                    username: user.username,
                    repoUrl: repoUrl,
                    prNumber: pr.number,
                    title: pr.title,
                    mergedAt: pr.mergedAt
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Failed to submit PR:', error);
            return false;
        }
    }

    addUserLogEntry(logContainer, type, message) {
        const timestamp = new Date().toLocaleTimeString();

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-timestamp">${timestamp}</span>
            <span>${message}</span>
        `;

        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
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
                        <button class="quick-action-btn scan-btn" onclick="userManagement.scanUserPRs('${user._id || user.id}')" title="Scan for new PRs">
                            <i class='bx bx-search'></i>
                        </button>
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
        this.openEmailModal(email, username);
    }

    openEmailModal(email, username) {
        const modal = document.createElement('div');
        modal.className = 'email-modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h2>Send Email to ${username}</h2>
                    <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">
                        <i class='bx bx-x'></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="email-form">
                        <div class="form-group">
                            <label for="emailTo">To:</label>
                            <input type="email" id="emailTo" value="${email}" readonly>
                        </div>
                        <div class="form-group">
                            <label for="emailSubject">Subject:</label>
                            <input type="text" id="emailSubject" placeholder="Enter email subject..." required>
                        </div>
                        <div class="form-group">
                            <label for="emailMessage">Message:</label>
                            <textarea id="emailMessage" rows="8" placeholder="Enter your message here..." required></textarea>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class='bx bx-x'></i>
                        Cancel
                    </button>
                    <button class="send-btn" onclick="userManagement.sendEmailMessage('${email}', '${username}', this)">
                        <i class='bx bx-send'></i>
                        Send Email
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('show');

        // Focus on subject field
        setTimeout(() => {
            modal.querySelector('#emailSubject').focus();
        }, 100);
    }

    sendEmailMessage(email, username, button) {
        const modal = button.closest('.modal-overlay');
        const subject = modal.querySelector('#emailSubject').value.trim();
        const message = modal.querySelector('#emailMessage').value.trim();

        // Validation
        if (!subject) {
            if (window.showToast) {
                window.showToast('error', 'Please enter a subject');
            }
            modal.querySelector('#emailSubject').focus();
            return;
        }

        if (!message) {
            if (window.showToast) {
                window.showToast('error', 'Please enter a message');
            }
            modal.querySelector('#emailMessage').focus();
            return;
        }

        // Show loading state
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Sending...';

        // Implement actual email sending with template
        this.sendEmailToServer(email, subject, message, username)
            .then(() => {
                // Reset button
                button.disabled = false;
                button.innerHTML = originalText;

                // Close modal
                modal.remove();

                // Show success message
                if (window.showToast) {
                    window.showToast('success', `Email sent successfully to ${username}!`);
                }
            })
            .catch((error) => {
                console.error('Email sending failed:', error);

                // Reset button
                button.disabled = false;
                button.innerHTML = originalText;

                // Show error message
                if (window.showToast) {
                    window.showToast('error', `Failed to send email: ${error.message}`);
                }
            });
    }

    // Method for actual email sending with template
    async sendEmailToServer(email, subject, message, username) {
        try {
            const response = await fetch(`${this.serverUrl}/api/admin/send-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    to: email,
                    subject: subject,
                    message: message,
                    recipientName: username,
                    template: 'messageEmail',
                    templateData: {
                        subject: subject,
                        message: message,
                        recipientEmail: email,
                        recipientName: username,
                        dashboardUrl: `${window.location.origin}/profile.html`,
                        githubUrl: 'https://github.com/devsync-opensource',
                        websiteUrl: window.location.origin,
                        discordUrl: 'https://discord.gg/vZnqjWaph8',
                        unsubscribeUrl: `${window.location.origin}/unsubscribe?email=${encodeURIComponent(email)}`,
                        preferencesUrl: `${window.location.origin}/email-preferences?email=${encodeURIComponent(email)}`
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Log the success
            console.log('Email sent successfully:', {
                to: email,
                subject: subject,
                template: 'messageEmail',
                timestamp: new Date().toISOString(),
                messageId: result.messageId
            });

            return result;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    openUserDetailsModal(user) {
        const recentPRs = this.getUserRecentPRs(user._id || user.id, user.username);
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
                            ${this.createPRDetailsHTML(recentPRs)}
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

    createPRDetailsHTML(prs) {
        if (!prs || (prs.approved.length === 0 && prs.pending.length === 0 && prs.rejected.length === 0)) {
            return '<div class="no-prs">No PRs found in database</div>';
        }

        let html = '<div class="user-prs-section">';

        // Approved PRs
        if (prs.approved.length > 0) {
            html += `
                <div class="pr-category approved">
                    <h4><i class='bx bx-check-circle'></i> Recent Approved PRs (${prs.approved.length})</h4>
                    <div class="pr-list">
                        ${prs.approved.map(pr => this.createPRItemHTML(pr, 'approved')).join('')}
                    </div>
                </div>
            `;
        }

        // Pending PRs
        if (prs.pending.length > 0) {
            html += `
                <div class="pr-category pending">
                    <h4><i class='bx bx-time-five'></i> Pending PRs (${prs.pending.length})</h4>
                    <div class="pr-list">
                        ${prs.pending.map(pr => this.createPRItemHTML(pr, 'pending')).join('')}
                    </div>
                </div>
            `;
        }

        // Rejected PRs
        if (prs.rejected.length > 0) {
            html += `
                <div class="pr-category rejected">
                    <h4><i class='bx bx-x-circle'></i> Recent Rejected PRs (${prs.rejected.length})</h4>
                    <div class="pr-list">
                        ${prs.rejected.map(pr => this.createPRItemHTML(pr, 'rejected')).join('')}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    // Add method to create individual PR item HTML
    createPRItemHTML(pr, status) {
        const statusIcon = {
            approved: 'bx-check',
            pending: 'bx-time',
            rejected: 'bx-x'
        };

        const formatDate = (dateStr) => {
            return new Date(dateStr).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        };

        return `
            <div class="pr-item ${status}">
                <div class="pr-header">
                    <i class='bx ${statusIcon[status]}'></i>
                    <span class="pr-title" title="${pr.title}">${pr.title.length > 40 ? pr.title.substring(0, 40) + '...' : pr.title}</span>
                    <span class="pr-number">#${pr.prNumber}</span>
                </div>
                <div class="pr-meta">
                    <span class="pr-repo" title="${pr.repoUrl}">
                        <i class='bx bx-git-repo-forked'></i>
                        ${pr.repository || pr.repoUrl.replace('https://github.com/', '')}
                    </span>
                    <span class="pr-points">
                        <i class='bx bx-coin'></i>
                        ${pr.suggestedPoints || 50} pts
                    </span>
                    <span class="pr-date">
                        <i class='bx bx-calendar'></i>
                        ${formatDate(pr.submittedAt)}
                    </span>
                </div>
                ${pr.rejectionReason ? `
                    <div class="pr-rejection-reason">
                        <i class='bx bx-info-circle'></i>
                        <span>${pr.rejectionReason}</span>
                    </div>
                ` : ''}
                <div class="pr-actions">
                    <a href="${pr.repoUrl}/pull/${pr.prNumber}" target="_blank" class="pr-link">
                        <i class='bx bx-link-external'></i>
                        View PR
                    </a>
                    ${status === 'pending' ? `
                        <button class="approve-btn mini" onclick="this.dispatchEvent(new CustomEvent('approve-pr', {detail: '${pr._id}', bubbles: true}))">
                            <i class='bx bx-check'></i>
                        </button>
                        <button class="reject-btn mini" onclick="this.dispatchEvent(new CustomEvent('reject-pr', {detail: '${pr._id}', bubbles: true}))">
                            <i class='bx bx-x'></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    openUserEditModal(user) {
        const modal = document.createElement('div');
        modal.className = 'user-edit-modal modal-overlay';
        modal.innerHTML = `
            <div class="modal-container">
                <div class="modal-header">
                    <h2>Edit User: ${user.displayName || user.username}</h2>
                    <button class="close-modal" onclick="this.closest('.modal-overlay').remove()">
                        <i class='bx bx-x'></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="userEditForm" class="user-edit-form">
                        <div class="form-sections">
                            <!-- Basic Information Section -->
                            <div class="form-section">
                                <h3>Basic Information</h3>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="editDisplayName">Display Name</label>
                                        <input type="text" id="editDisplayName" value="${user.displayName || ''}" 
                                               placeholder="Enter display name">
                                    </div>
                                    <div class="form-group">
                                        <label for="editUsername">Username</label>
                                        <input type="text" id="editUsername" value="${user.username || ''}" 
                                               placeholder="Enter username" readonly>
                                        <small class="field-note">Username cannot be changed</small>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="editEmail">Email Address</label>
                                        <input type="email" id="editEmail" value="${user.email || ''}" 
                                               placeholder="Enter email address">
                                    </div>
                                    <div class="form-group">
                                        <label for="editAvatarUrl">Avatar URL</label>
                                        <input type="url" id="editAvatarUrl" value="${user.avatarUrl || ''}" 
                                               placeholder="Enter avatar image URL">
                                    </div>
                                </div>
                            </div>

                            <!-- Points and Achievements Section -->
                            <div class="form-section">
                                <h3>Points and Achievements</h3>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="editPoints">Total Points</label>
                                        <input type="number" id="editPoints" value="${user.totalPoints || user.points || 0}" 
                                               min="0" placeholder="Enter total points">
                                        <small class="field-note">Manual point adjustment (use carefully)</small>
                                    </div>
                                    <div class="form-group">
                                        <label for="editBadge">Current Badge</label>
                                        <select id="editBadge">
                                            <option value="Cursed Newbie | Just awakened....." ${user.badge === 'Cursed Newbie | Just awakened.....' ? 'selected' : ''}>Cursed Newbie</option>
                                            <option value="Graveyard Shifter | Lost but curious" ${user.badge === 'Graveyard Shifter | Lost but curious' ? 'selected' : ''}>Graveyard Shifter</option>
                                            <option value="Night Stalker | Shadows are friends" ${user.badge === 'Night Stalker | Shadows are friends' ? 'selected' : ''}>Night Stalker</option>
                                            <option value="Skeleton of Structure | Casts magic on code" ${user.badge === 'Skeleton of Structure | Casts magic on code' ? 'selected' : ''}>Skeleton of Structure</option>
                                            <option value="Phantom Architect | Builds from beyond" ${user.badge === 'Phantom Architect | Builds from beyond' ? 'selected' : ''}>Phantom Architect</option>
                                            <option value="Haunted Debugger | Haunting every broken line" ${user.badge === 'Haunted Debugger | Haunting every broken line' ? 'selected' : ''}>Haunted Debugger</option>
                                            <option value="Lord of Shadows | Master of the unseen" ${user.badge === 'Lord of Shadows | Master of the unseen' ? 'selected' : ''}>Lord of Shadows</option>
                                            <option value="Dark Sorcerer | Controls the dark arts" ${user.badge === 'Dark Sorcerer | Controls the dark arts' ? 'selected' : ''}>Dark Sorcerer</option>
                                            <option value="Demon Crafter | Shapes the cursed world" ${user.badge === 'Demon Crafter | Shapes the cursed world' ? 'selected' : ''}>Demon Crafter</option>
                                            <option value="Eternal Revenge | Undying ghost" ${user.badge === 'Eternal Revenge | Undying ghost' ? 'selected' : ''}>Eternal Revenge</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Account Settings Section -->
                            <div class="form-section">
                                <h3>Account Settings</h3>
                                <div class="form-row">
                                    <div class="form-group checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="editWelcomeEmailSent" ${user.welcomeEmailSent ? 'checked' : ''}>
                                            <span class="checkmark"></span>
                                            Welcome Email Sent
                                        </label>
                                        <small class="field-note">Mark if welcome email has been sent to user</small>
                                    </div>
                                    <div class="form-group checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="editIsActive" ${user.isActive ? 'checked' : ''}>
                                            <span class="checkmark"></span>
                                            Active Account
                                        </label>
                                        <small class="field-note">Deactivate to suspend user account</small>
                                    </div>
                                </div>
                            </div>

                            <!-- Admin Actions Section -->
                            <div class="form-section danger-section">
                                <h3>Administrative Actions</h3>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label for="editAdminNote">Admin Notes</label>
                                        <textarea id="editAdminNote" rows="3" placeholder="Add administrative notes about this user...">${user.adminNotes || ''}</textarea>
                                        <small class="field-note">Internal notes for admin reference</small>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Account Actions</label>
                                        <div class="action-buttons">
                                            <button type="button" class="action-btn reset-password-btn" onclick="userManagement.resetUserPassword('${user._id || user.id}')">
                                                <i class='bx bx-key'></i>
                                                Reset Authentication
                                            </button>
                                            <button type="button" class="action-btn resync-data-btn" onclick="userManagement.resyncUserData('${user._id || user.id}')">
                                                <i class='bx bx-refresh'></i>
                                                Resync PR Data
                                            </button>
                                            <button type="button" class="action-btn send-welcome-btn" onclick="userManagement.resendWelcomeEmail('${user._id || user.id}')">
                                                <i class='bx bx-envelope'></i>
                                                Resend Welcome Email
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                ${!user.isAdmin ? `
                                <div class="form-row">
                                    <div class="form-group danger-group">
                                        <label class="danger-label">Danger Zone</label>
                                        <div class="danger-actions">
                                            <button type="button" class="danger-btn suspend-btn" onclick="userManagement.suspendUser('${user._id || user.id}')">
                                                <i class='bx bx-user-x'></i>
                                                Suspend Account
                                            </button>
                                            <button type="button" class="danger-btn delete-btn" onclick="userManagement.deleteUser('${user._id || user.id}')">
                                                <i class='bx bx-trash'></i>
                                                Delete Account
                                            </button>
                                        </div>
                                        <small class="danger-note">These actions are permanent and cannot be undone</small>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="cancel-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class='bx bx-x'></i>
                        Cancel
                    </button>
                    <button class="save-btn" onclick="userManagement.saveUserChanges('${user._id || user.id}', this)">
                        <i class='bx bx-save'></i>
                        Save Changes
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('show');

        // Focus on first input
        setTimeout(() => {
            modal.querySelector('#editDisplayName').focus();
        }, 100);
    }

    async saveUserChanges(userId, button) {
        const modal = button.closest('.modal-overlay');
        const form = modal.querySelector('#userEditForm');

        // Get form data - including all admin-editable fields
        const formData = {
            displayName: form.querySelector('#editDisplayName').value.trim(),
            email: form.querySelector('#editEmail').value.trim(),
            avatarUrl: form.querySelector('#editAvatarUrl').value.trim(),
            totalPoints: parseInt(form.querySelector('#editPoints').value) || 0,
            badge: form.querySelector('#editBadge').value,
            welcomeEmailSent: form.querySelector('#editWelcomeEmailSent').checked,
            isActive: form.querySelector('#editIsActive').checked,
            adminNotes: form.querySelector('#editAdminNote').value.trim(),
            // Ensure points field is also mapped correctly for legacy compatibility
            points: parseInt(form.querySelector('#editPoints').value) || 0
        };

        // Validation
        if (!formData.displayName) {
            window.showToast && window.showToast('error', 'Display name is required');
            form.querySelector('#editDisplayName').focus();
            return;
        }

        if (formData.email && !this.validateEmail(formData.email)) {
            window.showToast && window.showToast('error', 'Please enter a valid email address');
            form.querySelector('#editEmail').focus();
            return;
        }

        if (formData.totalPoints < 0) {
            window.showToast && window.showToast('error', 'Points cannot be negative');
            form.querySelector('#editPoints').focus();
            return;
        }

        // Show loading state
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Saving...';

        try {
            const response = await fetch(`${this.serverUrl}/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Update local user data with all changed fields
            const userIndex = this.users.findIndex(u => (u._id || u.id) === userId);
            if (userIndex !== -1) {
                // Sync all admin-edited fields to local user object
                this.users[userIndex] = {
                    ...this.users[userIndex],
                    ...result.user,
                    // Ensure critical fields are properly updated
                    displayName: formData.displayName,
                    email: formData.email,
                    avatarUrl: formData.avatarUrl,
                    totalPoints: formData.totalPoints,
                    points: formData.totalPoints, // Legacy field sync
                    badge: formData.badge,
                    welcomeEmailSent: formData.welcomeEmailSent,
                    isActive: formData.isActive,
                    adminNotes: formData.adminNotes,
                    // Update timestamp for tracking
                    lastUpdatedByAdmin: new Date().toISOString()
                };

                // Also update filtered users if this user is currently displayed
                const filteredIndex = this.filteredUsers.findIndex(u => (u._id || u.id) === userId);
                if (filteredIndex !== -1) {
                    this.filteredUsers[filteredIndex] = { ...this.users[userIndex] };
                }
            }

            // Refresh the display to show updated data
            this.filteredUsers = this.applyFilter([...this.users]);
            this.updateUsersGrid();

            // Close modal
            modal.remove();

            // Show success message with specific field updates
            const updatedFields = [];
            if (formData.displayName !== (result.originalUser?.displayName || '')) updatedFields.push('Display Name');
            if (formData.email !== (result.originalUser?.email || '')) updatedFields.push('Email');
            if (formData.avatarUrl !== (result.originalUser?.avatarUrl || '')) updatedFields.push('Avatar');
            if (formData.totalPoints !== (result.originalUser?.totalPoints || 0)) updatedFields.push('Points');
            if (formData.badge !== (result.originalUser?.badge || '')) updatedFields.push('Badge');

            const updateMessage = updatedFields.length > 0
                ? `User ${formData.displayName} updated successfully! Updated: ${updatedFields.join(', ')}`
                : `User ${formData.displayName} updated successfully!`;

            window.showToast && window.showToast('success', updateMessage);

            // Log the update for debugging
            console.log('User data synchronized:', {
                userId: userId,
                updatedFields: formData,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error saving user changes:', error);

            // Reset button
            button.disabled = false;
            button.innerHTML = originalText;

            // Show error message
            window.showToast && window.showToast('error', `Failed to save changes: ${error.message}`);
        }
    }

    async resetUserPassword(userId) {
        if (!confirm('This will reset the user\'s authentication and they will need to log in again with GitHub. Continue?')) {
            return;
        }

        try {
            const response = await fetch(`${this.serverUrl}/api/admin/users/${userId}/reset-auth`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to reset user authentication');
            }

            window.showToast && window.showToast('success', 'User authentication reset successfully');
        } catch (error) {
            console.error('Error resetting user auth:', error);
            window.showToast && window.showToast('error', 'Failed to reset user authentication');
        }
    }

    async resyncUserData(userId) {
        if (!confirm('This will resynchronize the user\'s PR data from GitHub. This may take a moment. Continue?')) {
            return;
        }

        try {
            const response = await fetch(`${this.serverUrl}/api/admin/users/${userId}/resync`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to resync user data');
            }

            const result = await response.json();

            window.showToast && window.showToast('success', `User data resynchronized successfully. Found ${result.newPRs || 0} new PRs.`);

            // Reload user data
            this.loadUsers();
        } catch (error) {
            console.error('Error resyncing user data:', error);
            window.showToast && window.showToast('error', 'Failed to resync user data');
        }
    }

    async resendWelcomeEmail(userId) {
        if (!confirm('This will send a welcome email to the user. Continue?')) {
            return;
        }

        try {
            const response = await fetch(`${this.serverUrl}/api/admin/users/${userId}/welcome-email`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to send welcome email');
            }

            window.showToast && window.showToast('success', 'Welcome email sent successfully');
        } catch (error) {
            console.error('Error sending welcome email:', error);
            window.showToast && window.showToast('error', 'Failed to send welcome email');
        }
    }

    async suspendUser(userId) {
        const user = this.users.find(u => (u._id || u.id) === userId);
        if (!user) return;

        if (!confirm(`This will suspend ${user.displayName || user.username}'s account. They will not be able to access the platform. Continue?`)) {
            return;
        }

        try {
            const response = await fetch(`${this.serverUrl}/api/admin/users/${userId}/suspend`, {
                method: 'POST',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to suspend user account');
            }

            window.showToast && window.showToast('success', 'User account suspended successfully');

            // Reload user data
            this.loadUsers();
        } catch (error) {
            console.error('Error suspending user:', error);
            window.showToast && window.showToast('error', 'Failed to suspend user account');
        }
    }

    async deleteUser(userId) {
        const user = this.users.find(u => (u._id || u.id) === userId);
        if (!user) return;

        if (!confirm(`⚠️ WARNING: This will permanently delete ${user.displayName || user.username}'s account and ALL associated data. This action CANNOT be undone.\n\nType "${user.username}" to confirm deletion:`)) {
            return;
        }

        const confirmUsername = prompt(`Type "${user.username}" to confirm account deletion:`);
        if (confirmUsername !== user.username) {
            window.showToast && window.showToast('error', 'Username confirmation does not match. Deletion cancelled.');
            return;
        }

        try {
            const response = await fetch(`${this.serverUrl}/api/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to delete user account');
            }

            window.showToast && window.showToast('success', 'User account deleted successfully');

            // Remove user from local data
            this.users = this.users.filter(u => (u._id || u.id) !== userId);
            this.filteredUsers = this.applyFilter([...this.users]);
            this.updateUsersGrid();

            // Close any open modals
            document.querySelectorAll('.modal-overlay').forEach(modal => modal.remove());
        } catch (error) {
            console.error('Error deleting user:', error);
            window.showToast && window.showToast('error', 'Failed to delete user account');
        }
    }

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
}

// Initialize global user management instance
window.userManagement = null;
