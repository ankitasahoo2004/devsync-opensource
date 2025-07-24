/**
 * Advanced PR Scanner with Terminal Interface and Intelligent Rate Limiting
 * Optimized for GitHub API rate limits (6000 requests/hour)
 * Features: Terminal UI, Smart batching, Caching, Progress tracking
 */

class AdvancedPRScanManager {
    constructor() {
        this.modal = null;
        this.isScanning = false;
        this.isPaused = false;
        this.currentBatch = 0;
        this.terminalLines = [];
        this.terminalHistory = [];
        // Set serverUrl with fallback pattern consistent with other files
        this.serverUrl = window.serverUrl || (window.API_CONFIG ? window.API_CONFIG.serverUrl : 'http://localhost:3000');

        // Ensure serverUrl is available globally for consistency
        if (!window.serverUrl) {
            window.serverUrl = this.serverUrl;
        }

        // Advanced scan results tracking
        this.scanResults = {
            totalUsers: 0,
            processedUsers: 0,
            newPRs: 0,
            skippedDuplicates: 0,
            errors: 0,
            apiCallsUsed: 0,
            rateLimitRemaining: 6000,
            startTime: null,
            endTime: null,
            estimatedTimeRemaining: null,
            batchesCompleted: 0,
            currentlyProcessing: []
        };

        // Intelligent rate limiting system
        this.rateLimit = {
            maxPerHour: 6000,
            safetyBuffer: 200, // Keep 200 requests as buffer
            currentUsage: 0,
            resetTime: Date.now() + (60 * 60 * 1000),
            adaptiveBatchSize: 3,
            minBatchSize: 1,
            maxBatchSize: 6, // Conservative max to ensure no user is left behind
            optimalDelay: 2000, // Base delay between batches
            emergencyDelay: 8000, // Emergency delay when approaching limits
            lastAPICall: null,
            callIntervals: []
        };

        // Advanced scanning settings
        this.settings = {
            includeAllUsers: true,
            batchSize: 3,
            delayBetweenBatches: 2000,
            includePrivateRepos: false,
            smartFiltering: true,
            cacheEnabled: true,
            retryFailedUsers: true,
            prioritizeActiveUsers: true,
            skipRecentlyScanned: true,
            maxRetries: 3
        };

        // Intelligent caching system
        this.cache = {
            userPRs: new Map(),
            repoData: new Map(),
            lastScanTime: null,
            cacheDuration: 15 * 60 * 1000, // 15 minutes
            userLastScanned: new Map()
        };

        // Failed users tracking for retry
        this.failedUsers = [];
        this.retryAttempts = new Map();

        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
        this.initializeTerminal();
        this.updateRateLimitDisplay();
    }

    createModal() {
        const modal = document.createElement('div');
        modal.className = 'advanced-pr-scan-modal';
        modal.innerHTML = `
            <div class="scan-container">
                <div class="scan-header">
                    <div class="header-left">
                        <div class="scan-title">
                            <div class="scan-icon">
                                <i class='bx bx-terminal'></i>
                            </div>
                            <div class="title-content">
                                <h2>Advanced PR Scanner</h2>
                                <span class="version">Terminal Interface v2.0</span>
                            </div>
                        </div>
                    </div>
                    <div class="header-right">
                        <div class="rate-limit-display" id="rateLimitDisplay">
                            <div class="rate-limit-indicator">
                                <i class='bx bx-time-five'></i>
                                <span id="rateLimitText">6000/6000</span>
                            </div>
                            <div class="rate-limit-bar">
                                <div class="rate-limit-fill" id="rateLimitFill"></div>
                            </div>
                        </div>
                        <button class="header-btn minimize" data-action="minimize">
                            <i class='bx bx-minus'></i>
                        </button>
                        <button class="header-btn close" data-action="close">
                            <i class='bx bx-x'></i>
                        </button>
                    </div>
                </div>

                <div class="scan-body">
                    <!-- Terminal Interface -->
                    <div class="terminal-section">
                        <div class="terminal-window">
                            <div class="terminal-header">
                                <div class="terminal-controls">
                                    <span class="terminal-dot red"></span>
                                    <span class="terminal-dot yellow"></span>
                                    <span class="terminal-dot green"></span>
                                </div>
                                <div class="terminal-title">PR_Scanner@devsync:~$</div>
                                <div class="terminal-actions">
                                    <button class="terminal-action" data-action="clear-terminal" title="Clear Terminal">
                                        <i class='bx bx-trash'></i>
                                    </button>
                                    <button class="terminal-action" data-action="export-log" title="Export Log">
                                        <i class='bx bx-export'></i>
                                    </button>
                                    <button class="terminal-action" data-action="toggle-auto-scroll" title="Auto Scroll">
                                        <i class='bx bx-down-arrow'></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="terminal-content">
                                <div class="terminal-output" id="terminalOutput">
                                    <div class="terminal-line welcome">
                                        <span class="prompt">$</span>
                                        <span class="text">Advanced PR Scanner v2.0 initialized</span>
                                        <span class="timestamp">[${new Date().toLocaleTimeString()}]</span>
                                    </div>
                                    <div class="terminal-line info">
                                        <span class="text">📡 System ready - Intelligent rate limiting enabled</span>
                                    </div>
                                    <div class="terminal-line info">
                                        <span class="text">🎯 Target: GitHub API (6000 req/hour limit)</span>
                                    </div>
                                    <div class="terminal-line info">
                                        <span class="text">Type 'help' for available commands</span>
                                    </div>
                                </div>
                                
                                <div class="terminal-input-area">
                                    <span class="prompt">$</span>
                                    <input type="text" class="terminal-input" id="terminalInput" 
                                           placeholder="Enter command (start, pause, stop, settings, help)..." 
                                           autocomplete="off">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Control Panel -->
                    <div class="control-section">
                        <div class="control-panel">
                            <div class="control-buttons">
                                <button class="control-btn primary" id="startBtn" data-action="start">
                                    <i class='bx bx-play-circle'></i>
                                    <span>Start Scan</span>
                                </button>
                                <button class="control-btn secondary" id="pauseBtn" data-action="pause" disabled>
                                    <i class='bx bx-pause-circle'></i>
                                    <span>Pause</span>
                                </button>
                                <button class="control-btn danger" id="stopBtn" data-action="stop" disabled>
                                    <i class='bx bx-stop-circle'></i>
                                    <span>Stop</span>
                                </button>
                                <button class="control-btn warning" id="retryBtn" data-action="retry" disabled>
                                    <i class='bx bx-refresh'></i>
                                    <span>Retry Failed</span>
                                </button>
                            </div>
                            
                            <div class="progress-section">
                                <div class="progress-info">
                                    <div class="progress-item">
                                        <span class="progress-label">Progress:</span>
                                        <span class="progress-value" id="progressValue">0/0 (0%)</span>
                                    </div>
                                    <div class="progress-item">
                                        <span class="progress-label">ETA:</span>
                                        <span class="progress-value" id="etaValue">--:--</span>
                                    </div>
                                    <div class="progress-item">
                                        <span class="progress-label">API Calls:</span>
                                        <span class="progress-value" id="apiCallsValue">0</span>
                                    </div>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress-fill" id="progressFill"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Advanced Settings -->
                        <div class="settings-panel" id="settingsPanel">
                            <div class="settings-header">
                                <h3><i class='bx bx-cog'></i> Advanced Configuration</h3>
                                <button class="settings-toggle" data-action="toggle-settings">
                                    <i class='bx bx-chevron-down'></i>
                                </button>
                            </div>
                            
                            <div class="settings-content" style="display: none;">
                                <div class="settings-tabs">
                                    <button class="settings-tab active" data-tab="performance">Performance</button>
                                    <button class="settings-tab" data-tab="filtering">Filtering</button>
                                    <button class="settings-tab" data-tab="advanced">Advanced</button>
                                </div>
                                
                                <div class="settings-tab-content">
                                    <!-- Performance Settings -->
                                    <div class="tab-panel active" id="performance-panel">
                                        <div class="setting-group">
                                            <label class="setting-label">
                                                <i class='bx bx-layer'></i>
                                                Batch Size
                                            </label>
                                            <div class="setting-control">
                                                <div class="range-slider">
                                                    <input type="range" id="batchSize" min="1" max="6" value="3" class="slider">
                                                    <div class="range-value" id="batchSizeValue">3</div>
                                                </div>
                                                <small>Users processed simultaneously (1-6)</small>
                                            </div>
                                        </div>

                                        <div class="setting-group">
                                            <label class="setting-label">
                                                <i class='bx bx-time'></i>
                                                Batch Delay
                                            </label>
                                            <div class="setting-control">
                                                <div class="range-slider">
                                                    <input type="range" id="batchDelay" min="1000" max="8000" step="500" value="2000" class="slider">
                                                    <div class="range-value" id="batchDelayValue">2.0s</div>
                                                </div>
                                                <small>Delay between batches (1-8 seconds)</small>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Filtering Settings -->
                                    <div class="tab-panel" id="filtering-panel">
                                        <div class="setting-group">
                                            <label class="setting-label">
                                                <i class='bx bx-filter'></i>
                                                Smart Filtering
                                            </label>
                                            <div class="setting-control">
                                                <label class="toggle-switch">
                                                    <input type="checkbox" id="smartFiltering" checked>
                                                    <span class="toggle-slider"></span>
                                                </label>
                                                <span>Skip users scanned in last 24h</span>
                                            </div>
                                        </div>

                                        <div class="setting-group">
                                            <label class="setting-label">
                                                <i class='bx bx-users'></i>
                                                User Prioritization
                                            </label>
                                            <div class="setting-control">
                                                <label class="toggle-switch">
                                                    <input type="checkbox" id="prioritizeActive" checked>
                                                    <span class="toggle-slider"></span>
                                                </label>
                                                <span>Prioritize recently active users</span>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Advanced Settings -->
                                    <div class="tab-panel" id="advanced-panel">
                                        <div class="setting-group">
                                            <label class="setting-label">
                                                <i class='bx bx-data'></i>
                                                Caching
                                            </label>
                                            <div class="setting-control">
                                                <label class="toggle-switch">
                                                    <input type="checkbox" id="cacheEnabled" checked>
                                                    <span class="toggle-slider"></span>
                                                </label>
                                                <span>Enable intelligent caching</span>
                                            </div>
                                        </div>

                                        <div class="setting-group">
                                            <label class="setting-label">
                                                <i class='bx bx-refresh'></i>
                                                Auto Retry
                                            </label>
                                            <div class="setting-control">
                                                <label class="toggle-switch">
                                                    <input type="checkbox" id="retryFailedUsers" checked>
                                                    <span class="toggle-slider"></span>
                                                </label>
                                                <span>Automatically retry failed users</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Results Display -->
                        <div class="results-panel" id="resultsPanel" style="display: none;">
                            <div class="results-header">
                                <h3><i class='bx bx-chart-square'></i> Scan Results</h3>
                            </div>
                            <div class="results-grid">
                                <div class="result-card success">
                                    <div class="result-icon"><i class='bx bx-check-circle'></i></div>
                                    <div class="result-value" id="successCount">0</div>
                                    <div class="result-label">Successful Scans</div>
                                </div>
                                <div class="result-card primary">
                                    <div class="result-icon"><i class='bx bx-git-pull-request'></i></div>
                                    <div class="result-value" id="newPRsCount">0</div>
                                    <div class="result-label">New PRs Found</div>
                                </div>
                                <div class="result-card warning">
                                    <div class="result-icon"><i class='bx bx-copy'></i></div>
                                    <div class="result-value" id="duplicatesCount">0</div>
                                    <div class="result-label">Duplicates Skipped</div>
                                </div>
                                <div class="result-card danger">
                                    <div class="result-icon"><i class='bx bx-error-circle'></i></div>
                                    <div class="result-value" id="errorsCount">0</div>
                                    <div class="result-label">Errors</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.modal = modal;
    }

    bindEvents() {
        // Modal events
        this.modal.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;

            switch (action) {
                case 'close':
                    this.close();
                    break;
                case 'minimize':
                    this.minimize();
                    break;
                case 'start':
                    this.startScan();
                    break;
                case 'pause':
                    this.pauseScan();
                    break;
                case 'stop':
                    this.stopScan();
                    break;
                case 'retry':
                    this.retryFailedUsers();
                    break;
                case 'clear-terminal':
                    this.clearTerminal();
                    break;
                case 'export-log':
                    this.exportLog();
                    break;
                case 'toggle-settings':
                    this.toggleSettings();
                    break;
            }
        });

        // Settings tabs
        this.modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('settings-tab')) {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            }
        });

        // Range inputs
        this.modal.addEventListener('input', (e) => {
            if (e.target.id === 'batchSize') {
                const value = parseInt(e.target.value);
                this.settings.batchSize = value;
                this.rateLimit.adaptiveBatchSize = value;
                document.getElementById('batchSizeValue').textContent = value;
                this.addTerminalLine('info', `Batch size updated to ${value}`);
            }

            if (e.target.id === 'batchDelay') {
                const value = parseInt(e.target.value);
                this.settings.delayBetweenBatches = value;
                this.rateLimit.optimalDelay = value;
                document.getElementById('batchDelayValue').textContent = `${(value / 1000).toFixed(1)}s`;
                this.addTerminalLine('info', `Batch delay updated to ${(value / 1000).toFixed(1)}s`);
            }
        });

        // Checkbox settings
        this.modal.addEventListener('change', (e) => {
            const settingName = e.target.id;
            if (this.settings.hasOwnProperty(settingName)) {
                this.settings[settingName] = e.target.checked;
                this.addTerminalLine('info', `${settingName}: ${e.target.checked ? 'enabled' : 'disabled'}`);
            }
        });

        // Terminal input
        const terminalInput = document.getElementById('terminalInput');
        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleTerminalCommand(e.target.value.trim());
                e.target.value = '';
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('show')) {
                this.close();
            }
        });
    }

    initializeTerminal() {
        this.addTerminalLine('info', '🔧 Initializing advanced scanning engine...');
        this.addTerminalLine('success', '✅ Rate limiting system activated');
        this.addTerminalLine('info', '💾 Cache system initialized');
        this.addTerminalLine('info', '🎯 Ready to scan with intelligent batching');
    }

    // Terminal command handling
    handleTerminalCommand(command) {
        this.addTerminalLine('command', `$ ${command}`);

        const [cmd, ...args] = command.toLowerCase().split(' ');

        switch (cmd) {
            case 'help':
                this.showHelp();
                break;
            case 'start':
                this.startScan();
                break;
            case 'pause':
                this.pauseScan();
                break;
            case 'stop':
                this.stopScan();
                break;
            case 'status':
                this.showStatus();
                break;
            case 'settings':
                this.showSettings();
                break;
            case 'clear':
                this.clearTerminal();
                break;
            case 'cache':
                this.showCacheInfo();
                break;
            case 'retry':
                this.retryFailedUsers();
                break;
            default:
                this.addTerminalLine('error', `Unknown command: ${cmd}. Type 'help' for available commands.`);
        }
    }

    showHelp() {
        const commands = [
            'start      - Begin PR scanning process',
            'pause      - Pause the current scan',
            'stop       - Stop the current scan',
            'retry      - Retry failed user scans',
            'status     - Show current scan status',
            'settings   - Display current settings',
            'cache      - Show cache information',
            'clear      - Clear terminal output',
            'help       - Show this help message'
        ];

        this.addTerminalLine('info', '📖 Available commands:');
        commands.forEach(cmd => this.addTerminalLine('info', `  ${cmd}`));
    }

    showStatus() {
        const { totalUsers, processedUsers, newPRs, errors, apiCallsUsed } = this.scanResults;
        const remaining = this.rateLimit.maxPerHour - this.rateLimit.currentUsage;

        this.addTerminalLine('info', '📊 Current Status:');
        this.addTerminalLine('info', `  Users: ${processedUsers}/${totalUsers}`);
        this.addTerminalLine('info', `  New PRs: ${newPRs}`);
        this.addTerminalLine('info', `  Errors: ${errors}`);
        this.addTerminalLine('info', `  API calls used: ${apiCallsUsed}`);
        this.addTerminalLine('info', `  API calls remaining: ${remaining}`);
        this.addTerminalLine('info', `  Status: ${this.isScanning ? 'SCANNING' : 'IDLE'}`);
    }

    showSettings() {
        this.addTerminalLine('info', '⚙️ Current Settings:');
        Object.entries(this.settings).forEach(([key, value]) => {
            this.addTerminalLine('info', `  ${key}: ${value}`);
        });
    }

    showCacheInfo() {
        const cacheSize = this.cache.userPRs.size + this.cache.repoData.size;
        const lastScan = this.cache.lastScanTime ? new Date(this.cache.lastScanTime).toLocaleString() : 'Never';

        this.addTerminalLine('info', '💾 Cache Information:');
        this.addTerminalLine('info', `  Cached entries: ${cacheSize}`);
        this.addTerminalLine('info', `  Last scan: ${lastScan}`);
        this.addTerminalLine('info', `  Cache enabled: ${this.settings.cacheEnabled}`);
    }

    // Main scanning logic with intelligent rate limiting
    async startScan() {
        if (this.isScanning) {
            this.addTerminalLine('warning', '⚠️ Scan already in progress');
            return;
        }

        this.isScanning = true;
        this.isPaused = false;
        this.scanResults.startTime = Date.now();
        this.resetScanResults();

        // Update UI
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('stopBtn').disabled = false;

        this.addTerminalLine('info', '🚀 Starting advanced PR scan...');
        this.addTerminalLine('info', `⚙️ Batch size: ${this.settings.batchSize}, Delay: ${this.settings.delayBetweenBatches}ms`);

        try {
            // Fetch users with intelligent prioritization
            const users = await this.fetchAndPrioritizeUsers();
            this.scanResults.totalUsers = users.length;

            this.addTerminalLine('success', `👥 Found ${users.length} users to scan`);
            this.updateProgress();

            // Fetch registered repositories
            const registeredRepos = await this.fetchRegisteredRepos();
            this.addTerminalLine('info', `📚 Checking against ${registeredRepos.length} registered repositories`);

            // Process users with intelligent batching
            await this.processUsersIntelligently(users, registeredRepos);

            this.completeScan();

        } catch (error) {
            this.addTerminalLine('error', `❌ Scan failed: ${error.message}`);
            this.scanResults.errors++;
        } finally {
            this.isScanning = false;
            this.updateUI();
        }
    }

    async fetchAndPrioritizeUsers() {
        this.addTerminalLine('info', '🔍 Fetching and prioritizing users...');

        const response = await fetch(`${this.serverUrl}/api/users`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }

        let users = await response.json();

        // Apply smart filtering
        if (this.settings.smartFiltering) {
            const now = Date.now();
            const dayAgo = now - (24 * 60 * 60 * 1000);

            users = users.filter(user => {
                const lastScanned = this.cache.userLastScanned.get(user._id || user.username);
                return !lastScanned || lastScanned < dayAgo;
            });

            this.addTerminalLine('info', `🎯 Smart filtering applied: ${users.length} users after filtering`);
        }

        // Prioritize active users
        if (this.settings.prioritizeActiveUsers) {
            users.sort((a, b) => {
                const aActivity = new Date(a.lastActivity || a.updatedAt || 0);
                const bActivity = new Date(b.lastActivity || b.updatedAt || 0);
                return bActivity - aActivity;
            });

            this.addTerminalLine('info', '📈 Users prioritized by activity');
        }

        return users;
    }

    async fetchRegisteredRepos() {
        this.addTerminalLine('info', '📦 Fetching registered repositories...');

        // Check cache first
        if (this.settings.cacheEnabled && this.cache.repoData.size > 0) {
            const cacheAge = Date.now() - (this.cache.lastScanTime || 0);
            if (cacheAge < this.cache.cacheDuration) {
                this.addTerminalLine('info', '💾 Using cached repository data');
                return Array.from(this.cache.repoData.values());
            }
        }

        const response = await fetch(`${this.serverUrl}/api/admin/projects`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch repositories');
        }

        const allRepos = await response.json();
        const acceptedRepos = allRepos.filter(repo => repo.reviewStatus === 'accepted');

        // Update cache
        if (this.settings.cacheEnabled) {
            this.cache.repoData.clear();
            acceptedRepos.forEach(repo => this.cache.repoData.set(repo._id, repo));
            this.cache.lastScanTime = Date.now();
        }

        return acceptedRepos;
    }

    async processUsersIntelligently(users, registeredRepos) {
        const totalBatches = Math.ceil(users.length / this.settings.batchSize);

        this.addTerminalLine('info', `🔄 Processing ${users.length} users in ${totalBatches} batches`);

        for (let i = 0; i < users.length; i += this.settings.batchSize) {
            if (!this.isScanning) break;

            // Handle pause
            while (this.isPaused && this.isScanning) {
                await this.sleep(1000);
            }

            const batch = users.slice(i, i + this.settings.batchSize);
            const batchNum = Math.floor(i / this.settings.batchSize) + 1;

            this.addTerminalLine('info', `📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} users)`);
            this.scanResults.currentlyProcessing = batch.map(u => u.username);

            // Check rate limit before processing
            await this.checkAndAdjustRateLimit();

            // Process batch with error handling
            const batchResults = await this.processBatch(batch, registeredRepos, batchNum);

            // Update results
            this.updateBatchResults(batchResults);
            this.updateProgress();

            // Intelligent delay calculation
            if (i + this.settings.batchSize < users.length) {
                const delay = this.calculateOptimalDelay();
                this.addTerminalLine('info', `⏱️ Waiting ${(delay / 1000).toFixed(1)}s before next batch...`);
                await this.sleep(delay);
            }
        }
    }

    async processBatch(batch, registeredRepos, batchNum) {
        const batchPromises = batch.map(user =>
            this.scanUserPRsWithRetry(user, registeredRepos)
        );

        try {
            return await Promise.allSettled(batchPromises);
        } catch (error) {
            this.addTerminalLine('error', `❌ Batch ${batchNum} failed: ${error.message}`);
            return batch.map(() => ({ status: 'rejected', reason: error }));
        }
    }

    async scanUserPRsWithRetry(user, registeredRepos, retryCount = 0) {
        try {
            return await this.scanUserPRs(user, registeredRepos);
        } catch (error) {
            const maxRetries = this.settings.retryFailedUsers ? this.settings.maxRetries : 0;

            if (retryCount < maxRetries) {
                this.addTerminalLine('warning', `⚠️ Retrying ${user.username} (attempt ${retryCount + 1}/${maxRetries + 1})`);
                await this.sleep(2000); // Wait before retry
                return this.scanUserPRsWithRetry(user, registeredRepos, retryCount + 1);
            } else {
                this.addTerminalLine('error', `❌ Failed to scan ${user.username} after ${maxRetries + 1} attempts`);
                this.failedUsers.push(user);
                throw error;
            }
        }
    }

    async scanUserPRs(user, registeredRepos) {
        this.addTerminalLine('info', `🔍 Scanning @${user.username}...`);
        this.rateLimit.currentUsage++;
        this.scanResults.apiCallsUsed++;

        // Update rate limit display
        this.updateRateLimitDisplay();

        // GraphQL query for efficient PR fetching
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

        const response = await fetch(`${this.serverUrl}/api/github/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                query,
                variables: { username: user.username }
            })
        });

        if (!response.ok) {
            throw new Error(`GraphQL query failed for ${user.username}: ${response.status}`);
        }

        const data = await response.json();
        const pullRequests = data.data?.user?.pullRequests?.nodes || [];

        // Process PRs
        const result = await this.processPRsForUser(user, pullRequests, registeredRepos);

        // Update cache
        if (this.settings.cacheEnabled) {
            this.cache.userLastScanned.set(user._id || user.username, Date.now());
        }

        return result;
    }

    async processPRsForUser(user, pullRequests, registeredRepos) {
        let newPRs = 0;
        let skippedDuplicates = 0;
        const programStartDate = new Date('2025-03-14');

        for (const pr of pullRequests) {
            const mergedDate = new Date(pr.mergedAt);
            if (mergedDate < programStartDate) continue;

            const repoUrl = `https://github.com/${pr.baseRepository.nameWithOwner}`;
            const isRegistered = registeredRepos.some(repo => repo.repoLink === repoUrl);

            if (isRegistered) {
                // Check for duplicates
                const isDuplicate = await this.checkPRDuplicate(user, pr, repoUrl);

                if (isDuplicate) {
                    skippedDuplicates++;
                    this.addTerminalLine('info', `⚠️ Duplicate: PR #${pr.number} by @${user.username}`);
                    continue;
                }

                // Submit PR for approval
                const submitted = await this.submitPRForApproval(user, pr, repoUrl);
                if (submitted) {
                    newPRs++;
                    this.addTerminalLine('success', `✅ New PR: #${pr.number} "${pr.title}" by @${user.username}`);
                }
            }
        }

        if (newPRs > 0) {
            this.addTerminalLine('success', `🎉 ${user.username}: ${newPRs} new PRs found`);
        } else {
            this.addTerminalLine('info', `ℹ️ ${user.username}: No new PRs`);
        }

        return { newPRs, skippedDuplicates, error: false };
    }

    async checkPRDuplicate(user, pr, repoUrl) {
        try {
            const response = await fetch(`${this.serverUrl}/api/admin/all-prs`, {
                credentials: 'include'
            });

            if (!response.ok) return false;

            const allPRs = await response.json();

            return allPRs.some(existingPR => {
                const sameRepo = existingPR.repoUrl === repoUrl;
                const samePR = existingPR.prNumber === pr.number;
                const userMatch = existingPR.userId === (user.githubId || user._id) ||
                    existingPR.username === user.username;

                return sameRepo && samePR && userMatch;
            });
        } catch (error) {
            console.error('Error checking PR duplicate:', error);
            return false;
        }
    }

    async submitPRForApproval(user, pr, repoUrl) {
        try {
            const response = await fetch(`${this.serverUrl}/api/admin/submit-pr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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

            if (response.status === 409) {
                this.addTerminalLine('info', `🔍 Server detected duplicate: PR #${pr.number} by @${user.username}`);
                return false;
            }

            return response.ok;
        } catch (error) {
            console.error('Failed to submit PR:', error);
            return false;
        }
    }

    // Rate limiting and optimization methods
    async checkAndAdjustRateLimit() {
        const remaining = this.rateLimit.maxPerHour - this.rateLimit.currentUsage;
        const safeThreshold = this.rateLimit.safetyBuffer;

        if (remaining <= safeThreshold) {
            this.addTerminalLine('warning', `⚠️ Approaching rate limit! ${remaining} calls remaining`);

            // Reduce batch size
            if (this.settings.batchSize > this.rateLimit.minBatchSize) {
                this.settings.batchSize = Math.max(this.rateLimit.minBatchSize, this.settings.batchSize - 1);
                this.addTerminalLine('info', `📉 Reduced batch size to ${this.settings.batchSize}`);
            }

            // Increase delay
            this.settings.delayBetweenBatches = this.rateLimit.emergencyDelay;
            this.addTerminalLine('info', `⏱️ Increased delay to ${this.rateLimit.emergencyDelay}ms`);
        }

        // Reset rate limit if an hour has passed
        if (Date.now() > this.rateLimit.resetTime) {
            this.rateLimit.currentUsage = 0;
            this.rateLimit.resetTime = Date.now() + (60 * 60 * 1000);
            this.addTerminalLine('success', '🔄 Rate limit reset - Full capacity restored');
        }
    }

    calculateOptimalDelay() {
        const remaining = this.rateLimit.maxPerHour - this.rateLimit.currentUsage;
        const timeUntilReset = this.rateLimit.resetTime - Date.now();

        if (remaining < 500 || timeUntilReset < 10 * 60 * 1000) { // Less than 10 minutes
            return this.rateLimit.emergencyDelay;
        }

        return this.settings.delayBetweenBatches;
    }

    // UI Update methods
    updateProgress() {
        const { processedUsers, totalUsers } = this.scanResults;
        const percentage = totalUsers > 0 ? (processedUsers / totalUsers) * 100 : 0;

        // Update progress bar
        document.getElementById('progressFill').style.width = `${percentage}%`;
        document.getElementById('progressValue').textContent =
            `${processedUsers}/${totalUsers} (${Math.round(percentage)}%)`;

        // Update API calls
        document.getElementById('apiCallsValue').textContent = this.scanResults.apiCallsUsed;

        // Calculate ETA
        if (this.scanResults.startTime && processedUsers > 0) {
            const elapsed = Date.now() - this.scanResults.startTime;
            const avgTimePerUser = elapsed / processedUsers;
            const remaining = totalUsers - processedUsers;
            const eta = remaining * avgTimePerUser;

            const etaMinutes = Math.floor(eta / 60000);
            const etaSeconds = Math.floor((eta % 60000) / 1000);
            document.getElementById('etaValue').textContent = `${etaMinutes}:${etaSeconds.toString().padStart(2, '0')}`;
        }
    }

    updateRateLimitDisplay() {
        const remaining = this.rateLimit.maxPerHour - this.rateLimit.currentUsage;
        const percentage = (remaining / this.rateLimit.maxPerHour) * 100;

        document.getElementById('rateLimitText').textContent = `${remaining}/${this.rateLimit.maxPerHour}`;
        document.getElementById('rateLimitFill').style.width = `${percentage}%`;

        // Color coding
        const fill = document.getElementById('rateLimitFill');
        if (percentage > 50) {
            fill.className = 'rate-limit-fill safe';
        } else if (percentage > 20) {
            fill.className = 'rate-limit-fill warning';
        } else {
            fill.className = 'rate-limit-fill danger';
        }
    }

    updateBatchResults(batchResults) {
        batchResults.forEach(result => {
            this.scanResults.processedUsers++;

            if (result.status === 'fulfilled') {
                this.scanResults.newPRs += result.value.newPRs;
                this.scanResults.skippedDuplicates += result.value.skippedDuplicates;
            } else {
                this.scanResults.errors++;
            }
        });
    }

    // Terminal methods
    addTerminalLine(type, message) {
        const terminalOutput = document.getElementById('terminalOutput');
        const timestamp = new Date().toLocaleTimeString();

        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;

        const icon = this.getTypeIcon(type);
        line.innerHTML = `
            <span class="line-icon">${icon}</span>
            <span class="text">${message}</span>
            <span class="timestamp">[${timestamp}]</span>
        `;

        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;

        // Store in history
        this.terminalHistory.push({ type, message, timestamp });
    }

    getTypeIcon(type) {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            command: '$',
            welcome: '🚀'
        };
        return icons[type] || 'ℹ️';
    }

    clearTerminal() {
        document.getElementById('terminalOutput').innerHTML = '';
        this.addTerminalLine('info', 'Terminal cleared');
    }

    exportLog() {
        const log = this.terminalHistory.map(entry =>
            `[${entry.timestamp}] ${entry.type.toUpperCase()}: ${entry.message}`
        ).join('\n');

        const blob = new Blob([log], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pr-scan-log-${new Date().getTime()}.txt`;
        a.click();

        URL.revokeObjectURL(url);
        this.addTerminalLine('success', '📄 Log exported successfully');
    }

    // Control methods
    pauseScan() {
        if (!this.isScanning) return;

        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');

        if (this.isPaused) {
            pauseBtn.innerHTML = '<i class="bx bx-play-circle"></i><span>Resume</span>';
            this.addTerminalLine('warning', '⏸️ Scan paused');
        } else {
            pauseBtn.innerHTML = '<i class="bx bx-pause-circle"></i><span>Pause</span>';
            this.addTerminalLine('info', '▶️ Scan resumed');
        }
    }

    stopScan() {
        if (!this.isScanning) return;

        this.isScanning = false;
        this.isPaused = false;
        this.addTerminalLine('warning', '🛑 Scan stopped by user');
        this.updateUI();
    }

    async retryFailedUsers() {
        if (this.failedUsers.length === 0) {
            this.addTerminalLine('info', 'ℹ️ No failed users to retry');
            return;
        }

        this.addTerminalLine('info', `🔄 Retrying ${this.failedUsers.length} failed users...`);

        const registeredRepos = await this.fetchRegisteredRepos();
        const retryUsers = [...this.failedUsers];
        this.failedUsers = [];

        for (const user of retryUsers) {
            try {
                await this.scanUserPRs(user, registeredRepos);
                this.addTerminalLine('success', `✅ Successfully retried ${user.username}`);
            } catch (error) {
                this.addTerminalLine('error', `❌ Retry failed for ${user.username}: ${error.message}`);
                this.failedUsers.push(user);
            }
        }

        this.updateRetryButton();
    }

    // Utility methods
    updateUI() {
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('stopBtn').disabled = true;

        const pauseBtn = document.getElementById('pauseBtn');
        pauseBtn.innerHTML = '<i class="bx bx-pause-circle"></i><span>Pause</span>';

        this.updateRetryButton();
    }

    updateRetryButton() {
        const retryBtn = document.getElementById('retryBtn');
        retryBtn.disabled = this.failedUsers.length === 0;

        if (this.failedUsers.length > 0) {
            retryBtn.innerHTML = `<i class='bx bx-refresh'></i><span>Retry Failed (${this.failedUsers.length})</span>`;
        }
    }

    completeScan() {
        this.scanResults.endTime = Date.now();
        const duration = Math.round((this.scanResults.endTime - this.scanResults.startTime) / 1000);

        // Update results display
        document.getElementById('successCount').textContent = this.scanResults.processedUsers - this.scanResults.errors;
        document.getElementById('newPRsCount').textContent = this.scanResults.newPRs;
        document.getElementById('duplicatesCount').textContent = this.scanResults.skippedDuplicates;
        document.getElementById('errorsCount').textContent = this.scanResults.errors;

        // Show results panel
        document.getElementById('resultsPanel').style.display = 'block';

        this.addTerminalLine('success', `🎉 Scan completed in ${duration} seconds`);
        this.addTerminalLine('info', `📊 Results: ${this.scanResults.newPRs} new PRs, ${this.scanResults.skippedDuplicates} duplicates, ${this.scanResults.errors} errors`);

        // Show completion toast
        if (typeof showToast === 'function') {
            showToast('success', `Scan complete! Found ${this.scanResults.newPRs} new PRs in ${duration}s`);
        }
    }

    resetScanResults() {
        this.scanResults = {
            ...this.scanResults,
            processedUsers: 0,
            newPRs: 0,
            skippedDuplicates: 0,
            errors: 0,
            apiCallsUsed: 0,
            startTime: Date.now(),
            endTime: null,
            batchesCompleted: 0,
            currentlyProcessing: []
        };

        this.failedUsers = [];
        document.getElementById('resultsPanel').style.display = 'none';
    }

    // Settings methods
    toggleSettings() {
        const content = this.modal.querySelector('.settings-content');
        const toggle = this.modal.querySelector('.settings-toggle i');

        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.className = 'bx bx-chevron-up';
        } else {
            content.style.display = 'none';
            toggle.className = 'bx bx-chevron-down';
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        this.modal.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab panels
        this.modal.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-panel`);
        });
    }

    // Modal controls
    open() {
        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        this.addTerminalLine('info', '🎛️ Advanced PR Scanner opened');
    }

    close() {
        if (this.isScanning) {
            if (!confirm('Scan is in progress. Are you sure you want to close?')) {
                return;
            }
            this.stopScan();
        }

        this.modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    minimize() {
        this.modal.classList.toggle('minimized');
        this.addTerminalLine('info', this.modal.classList.contains('minimized') ?
            '🔽 Interface minimized' : '🔼 Interface restored');
    }

    // Utility helper
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the advanced PR scanner
let advancedPRScanManager;

document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('.admin-dashboard')) {
        advancedPRScanManager = new AdvancedPRScanManager();

        // Make it globally available
        window.advancedPRScanManager = advancedPRScanManager;

        // Add to existing admin functions
        window.openAdvancedPRScan = function () {
            advancedPRScanManager.open();
        };
    }
});

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedPRScanManager;
}
