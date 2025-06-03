class PRScanManager {
    constructor() {
        this.modal = null;
        this.isScanning = false;
        this.scanResults = {
            totalUsers: 0,
            processedUsers: 0,
            newPRs: 0,
            errors: 0,
            startTime: null,
            endTime: null
        };
        this.settings = {
            includeAllUsers: true,
            batchSize: 5,
            delayBetweenBatches: 2000,
            includePrivateRepos: false
        };

        // Ensure modal utilities are available
        this.ensureModalUtilities();

        this.init();
    }

    ensureModalUtilities() {
        // Ensure showModal is available
        if (!window.showModal && window.showAdminModal) {
            window.showModal = window.showAdminModal;
        }
    }

    init() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        const modal = document.createElement('div');
        modal.className = 'pr-scan-modal';
        modal.innerHTML = `
            <div class="pr-scan-container">
                <div class="pr-scan-header">
                    <div class="pr-scan-title">
                        <div class="pr-scan-icon">
                            <i class='bx bx-git-pull-request'></i>
                        </div>
                        <span>Advanced PR Scanner</span>
                    </div>
                    <button class="pr-scan-close" data-action="close-modal">
                        <i class='bx bx-x'></i>
                    </button>
                </div>

                <div class="pr-scan-body">
                    <div class="pr-scan-settings">
                        <div class="setting-group">
                            <div class="setting-label">
                                <i class='bx bx-users'></i>
                                Scan Scope
                            </div>
                            <div class="setting-description">
                                Choose which users to include in the PR scan
                            </div>
                            <div class="setting-control">
                                <label class="scan-toggle">
                                    <input type="checkbox" id="includeAllUsers" checked>
                                    <span class="toggle-slider"></span>
                                </label>
                                <span style="color: rgba(255,255,255,0.8)">Include all registered users</span>
                            </div>
                        </div>

                        <div class="setting-group">
                            <div class="setting-label">
                                <i class='bx bx-time'></i>
                                Batch Processing
                            </div>
                            <div class="setting-description">
                                Control the scanning speed to respect GitHub API limits
                            </div>
                            <div class="setting-control">
                                <span style="color: rgba(255,255,255,0.7)">Batch Size:</span>
                                <div class="scan-range">
                                    <input 
                                        type="range" 
                                        class="range-input" 
                                        id="batchSize" 
                                        min="1" 
                                        max="10" 
                                        value="5"
                                    >
                                </div>
                                <div class="range-value" id="batchSizeValue">5</div>
                            </div>
                        </div>

                        <div class="setting-group">
                            <div class="setting-label">
                                <i class='bx bx-timer'></i>
                                Rate Limiting
                            </div>
                            <div class="setting-description">
                                Delay between batches to prevent rate limiting
                            </div>
                            <div class="setting-control">
                                <span style="color: rgba(255,255,255,0.7)">Delay (seconds):</span>
                                <div class="scan-range">
                                    <input 
                                        type="range" 
                                        class="range-input" 
                                        id="batchDelay" 
                                        min="1" 
                                        max="10" 
                                        value="2"
                                    >
                                </div>
                                <div class="range-value" id="batchDelayValue">2s</div>
                            </div>
                        </div>
                    </div>

                    <div class="pr-scan-progress" id="scanProgress">
                        <div class="progress-header">
                            <div class="progress-title">Scanning Progress</div>
                            <div class="progress-stats" id="progressStats">0 / 0 users processed</div>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="progressBar"></div>
                        </div>
                    </div>

                    <div class="scan-results" id="scanResults">
                        <div class="results-header">
                            <div class="results-icon success">
                                <i class='bx bx-check'></i>
                            </div>
                            <h3 class="results-title">Scan Complete</h3>
                        </div>
                        
                        <div class="results-grid">
                            <div class="result-card">
                                <span class="result-number" id="totalUsersResult">0</span>
                                <span class="result-label">Users Scanned</span>
                            </div>
                            <div class="result-card">
                                <span class="result-number" id="newPRsResult">0</span>
                                <span class="result-label">New PRs Found</span>
                            </div>
                            <div class="result-card">
                                <span class="result-number" id="processingTimeResult">0s</span>
                                <span class="result-label">Processing Time</span>
                            </div>
                            <div class="result-card">
                                <span class="result-number" id="errorsResult">0</span>
                                <span class="result-label">Errors</span>
                            </div>
                        </div>

                        <div class="scan-log" id="scanLog">
                            <!-- Log entries will be added here -->
                        </div>
                    </div>

                    <div class="pr-scan-actions">
                        <button class="scan-btn secondary" data-action="close-modal">
                            <i class='bx bx-x'></i>
                            Cancel
                        </button>
                        <button class="scan-btn primary" id="startScanBtn" data-action="start-scan">
                            <i class='bx bx-search'></i>
                            Start Advanced Scan
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;
        this.bindModalEvents();
    }

    bindEvents() {
        // Range input updates
        document.addEventListener('input', (e) => {
            if (e.target.id === 'batchSize') {
                const value = e.target.value;
                document.getElementById('batchSizeValue').textContent = value;
                this.settings.batchSize = parseInt(value);
            }

            if (e.target.id === 'batchDelay') {
                const value = e.target.value;
                document.getElementById('batchDelayValue').textContent = `${value}s`;
                this.settings.delayBetweenBatches = parseInt(value) * 1000;
            }
        });

        // Toggle updates
        document.addEventListener('change', (e) => {
            if (e.target.id === 'includeAllUsers') {
                this.settings.includeAllUsers = e.target.checked;
            }
        });
    }

    bindModalEvents() {
        // Close modal on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Handle all button clicks with data-action attributes
        this.modal.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;

            if (action === 'close-modal') {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            } else if (action === 'start-scan') {
                e.preventDefault();
                e.stopPropagation();
                this.startScan();
            }
        });

        // Close modal on escape key
        this.handleEscapeKey = (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                this.close();
            }
        };

        document.addEventListener('keydown', this.handleEscapeKey);
    }

    open() {
        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        document.body.style.scrollBehavior = 'smooth';
        this.resetScan();
    }

    close() {
        if (this.isScanning) {
            if (!confirm('Scan is in progress. Are you sure you want to close?')) {
                return;
            }
        }

        this.modal.classList.remove('show');
        document.body.style.overflow = '';
        document.body.style.scrollBehavior = 'smooth';
        this.isScanning = false;

        // Clean up escape key listener to prevent memory leaks
        if (this.handleEscapeKey) {
            document.removeEventListener('keydown', this.handleEscapeKey);
        }
    }

    resetScan() {
        this.scanResults = {
            totalUsers: 0,
            processedUsers: 0,
            newPRs: 0,
            errors: 0,
            startTime: null,
            endTime: null
        };

        // Hide progress and results
        document.getElementById('scanProgress').classList.remove('show');
        document.getElementById('scanResults').classList.remove('show');

        // Reset UI elements
        document.getElementById('progressBar').style.width = '0%';
        document.getElementById('scanLog').innerHTML = '';

        // Reset button
        const startBtn = document.getElementById('startScanBtn');
        startBtn.disabled = false;
        startBtn.innerHTML = '<i class="bx bx-search"></i> Start Advanced Scan';
    }

    async startScan() {
        if (this.isScanning) return;

        this.isScanning = true;
        this.scanResults.startTime = Date.now();

        // Update UI
        const startBtn = document.getElementById('startScanBtn');
        startBtn.disabled = true;
        startBtn.innerHTML = '<div class="scan-spinner"></div> Scanning...';

        // Show progress section
        document.getElementById('scanProgress').classList.add('show');

        try {
            this.addLogEntry('info', 'Starting advanced PR scan...');

            // Fetch users to scan
            const users = await this.fetchUsersToScan();
            this.scanResults.totalUsers = users.length;

            this.addLogEntry('success', `Found ${users.length} users to scan`);
            this.updateProgress();

            // Fetch registered repositories
            const registeredRepos = await this.fetchRegisteredRepos();
            this.addLogEntry('info', `Checking against ${registeredRepos.length} registered repositories`);

            // Process users in batches
            await this.processBatches(users, registeredRepos);

            this.scanResults.endTime = Date.now();
            this.completeScan();

        } catch (error) {
            this.addLogEntry('error', `Scan failed: ${error.message}`);
            this.scanResults.errors++;
        } finally {
            this.isScanning = false;
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="bx bx-refresh"></i> Scan Again';
        }
    }

    async fetchUsersToScan() {
        this.addLogEntry('info', 'Fetching registered users...');

        const response = await fetch(`${serverUrl}/api/users`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        return await response.json();
    }

    async fetchRegisteredRepos() {
        this.addLogEntry('info', 'Fetching registered repositories...');

        const response = await fetch(`${serverUrl}/api/admin/projects`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch repositories');
        }

        const allRepos = await response.json();
        return allRepos.filter(repo => repo.reviewStatus === 'accepted');
    }

    async processBatches(users, registeredRepos) {
        const { batchSize, delayBetweenBatches } = this.settings;

        for (let i = 0; i < users.length; i += batchSize) {
            const batch = users.slice(i, i + batchSize);

            this.addLogEntry('info', `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)}`);

            // Process batch in parallel
            const batchPromises = batch.map(user =>
                this.scanUserPRs(user, registeredRepos)
            );

            try {
                const batchResults = await Promise.all(batchPromises);

                // Update results
                batchResults.forEach(result => {
                    this.scanResults.processedUsers++;
                    this.scanResults.newPRs += result.newPRs;
                    if (result.error) {
                        this.scanResults.errors++;
                    }
                });

                this.updateProgress();

            } catch (error) {
                this.addLogEntry('error', `Batch processing error: ${error.message}`);
                this.scanResults.errors++;
            }

            // Delay between batches
            if (i + batchSize < users.length) {
                this.addLogEntry('info', `Waiting ${delayBetweenBatches / 1000}s before next batch...`);
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }
        }
    }

    async scanUserPRs(user, registeredRepos) {
        try {
            this.addLogEntry('info', `Scanning PRs for @${user.username}...`);

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

            // Filter PRs that match registered repositories
            let newPRs = 0;
            const programStartDate = new Date('2025-03-14');

            for (const pr of pullRequests) {
                const mergedDate = new Date(pr.mergedAt);
                if (mergedDate < programStartDate) continue;

                const repoUrl = `https://github.com/${pr.baseRepository.nameWithOwner}`;
                const isRegistered = registeredRepos.some(repo => repo.repoLink === repoUrl);

                if (isRegistered) {
                    // Submit PR for approval
                    const submitted = await this.submitPRForApproval(user, pr, repoUrl);
                    if (submitted) {
                        newPRs++;
                        this.addLogEntry('success', `Found new PR: ${pr.title} in ${pr.baseRepository.nameWithOwner}`);
                    }
                }
            }

            if (newPRs > 0) {
                this.addLogEntry('success', `✓ ${user.username}: ${newPRs} new PRs found`);
            } else {
                this.addLogEntry('info', `○ ${user.username}: No new PRs`);
            }

            return { newPRs, error: false };

        } catch (error) {
            this.addLogEntry('error', `✗ ${user.username}: ${error.message}`);
            return { newPRs: 0, error: true };
        }
    }

    async submitPRForApproval(user, pr, repoUrl) {
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

    updateProgress() {
        const { processedUsers, totalUsers } = this.scanResults;
        const percentage = totalUsers > 0 ? (processedUsers / totalUsers) * 100 : 0;

        document.getElementById('progressBar').style.width = `${percentage}%`;
        document.getElementById('progressStats').textContent =
            `${processedUsers} / ${totalUsers} users processed`;
    }

    completeScan() {
        const duration = Math.round((this.scanResults.endTime - this.scanResults.startTime) / 1000);

        // Update result cards
        document.getElementById('totalUsersResult').textContent = this.scanResults.totalUsers;
        document.getElementById('newPRsResult').textContent = this.scanResults.newPRs;
        document.getElementById('processingTimeResult').textContent = `${duration}s`;
        document.getElementById('errorsResult').textContent = this.scanResults.errors;

        // Show results section
        document.getElementById('scanResults').classList.add('show');

        this.addLogEntry('success', `✅ Scan completed in ${duration} seconds`);
        this.addLogEntry('info', `Found ${this.scanResults.newPRs} new PRs for admin review`);

        // Show success toast
        if (typeof showToast === 'function') {
            showToast('success', `Scan complete! Found ${this.scanResults.newPRs} new PRs`);
        }

        // Refresh the admin panel if we found new PRs
        if (this.scanResults.newPRs > 0 && typeof loadPendingPRs === 'function') {
            setTimeout(() => {
                loadPendingPRs();
            }, 1000);
        }
    }

    addLogEntry(type, message) {
        const logContainer = document.getElementById('scanLog');
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
}

// Initialize PR Scan Manager
let prScanManager;

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.admin-dashboard')) {
        prScanManager = new PRScanManager();
    }
});

// Export for use in admin.js
window.prScanManager = prScanManager;
