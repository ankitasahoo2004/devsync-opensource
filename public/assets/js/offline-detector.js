/**
 * Advanced Offline Detection with Popup and Toast Notifications
 * Beautiful, modern offline experience with advanced detection methods
 * Features: Network monitoring, ping tests, connection quality assessment
 */

class OfflineNotification {
    constructor() {
        this.isOnline = navigator.onLine;
        this.offlineToast = null;
        this.offlinePopup = null;
        this.connectionStatus = null;
        this.showPopupTimeout = null;
        this.connectionQuality = 'unknown';
        this.lastPingTime = null;
        this.pingInterval = null;
        this.init();
    }

    init() {
        // Add network event listeners
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));

        // Add resize listener for responsive adjustments
        window.addEventListener('resize', this.handleResize.bind(this));

        // Initialize connection status indicator
        this.createConnectionStatus();

        // Start advanced connection monitoring
        this.startConnectionMonitoring();

        // Check initial state with advanced detection
        this.performAdvancedOfflineCheck();
    }

    // Advanced offline detection methods
    async performAdvancedOfflineCheck() {
        const isBasicOnline = navigator.onLine;
        const canPingServer = await this.pingServer();
        const hasInternetAccess = await this.checkInternetAccess();

        const actuallyOnline = isBasicOnline && canPingServer && hasInternetAccess;

        if (actuallyOnline !== this.isOnline) {
            this.isOnline = actuallyOnline;
            if (actuallyOnline) {
                this.handleOnline();
            } else {
                this.handleOffline();
            }
        }
    }

    // Ping server to test real connectivity
    async pingServer() {
        try {
            const startTime = performance.now();
            const response = await fetch('/favicon.ico?' + Date.now(), {
                method: 'HEAD',
                cache: 'no-cache',
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            const endTime = performance.now();

            this.lastPingTime = endTime - startTime;
            this.updateConnectionQuality(this.lastPingTime);

            return response.ok;
        } catch (error) {
            this.connectionQuality = 'poor';
            return false;
        }
    }

    // Check internet access with external endpoint
    async checkInternetAccess() {
        try {
            // Use a reliable external endpoint
            const response = await fetch('https://httpbin.org/get', {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache',
                signal: AbortSignal.timeout(8000) // 8 second timeout
            });
            return response.ok;
        } catch (error) {
            // Fallback to another endpoint
            try {
                const response = await fetch('https://jsonplaceholder.typicode.com/posts/1', {
                    method: 'HEAD',
                    mode: 'cors',
                    cache: 'no-cache',
                    signal: AbortSignal.timeout(5000)
                });
                return response.ok;
            } catch (fallbackError) {
                return false;
            }
        }
    }

    // Update connection quality based on ping time
    updateConnectionQuality(pingTime) {
        if (pingTime < 100) {
            this.connectionQuality = 'excellent';
        } else if (pingTime < 300) {
            this.connectionQuality = 'good';
        } else if (pingTime < 1000) {
            this.connectionQuality = 'fair';
        } else {
            this.connectionQuality = 'poor';
        }
    }

    // Start continuous connection monitoring
    startConnectionMonitoring() {
        // Monitor connection every 15 seconds
        this.pingInterval = setInterval(async () => {
            if (this.isOnline) {
                const stillOnline = await this.pingServer();
                if (!stillOnline && navigator.onLine) {
                    // Network shows online but we can't reach server
                    this.handleOffline();
                }
            }
        }, 15000);

        // Monitor network connection type if supported
        if ('connection' in navigator) {
            const connection = navigator.connection;
            connection.addEventListener('change', () => {
                this.handleConnectionChange(connection);
            });
        }
    }

    // Handle network connection changes (4G, WiFi, etc.)
    handleConnectionChange(connection) {
        const connectionInfo = {
            type: connection.effectiveType || 'unknown',
            downlink: connection.downlink || 0,
            rtt: connection.rtt || 0
        };

        // Update connection quality based on network info
        if (connectionInfo.type === 'slow-2g' || connectionInfo.downlink < 0.5) {
            this.connectionQuality = 'poor';
        } else if (connectionInfo.type === '2g' || connectionInfo.downlink < 1.5) {
            this.connectionQuality = 'fair';
        } else if (connectionInfo.type === '3g' || connectionInfo.downlink < 5) {
            this.connectionQuality = 'good';
        } else {
            this.connectionQuality = 'excellent';
        }

        this.updateConnectionStatusDisplay();
    }

    // Handle window resize for responsive adjustments
    handleResize() {
        // Update popup responsiveness if it's currently shown
        if (this.offlinePopup && this.offlinePopup.classList.contains('show')) {
            const isMobile = window.innerWidth <= 768;
            const isSmallMobile = window.innerWidth <= 480;
            const isLandscape = window.innerHeight < 600 && window.innerWidth > window.innerHeight;

            // Remove existing responsive classes
            this.offlinePopup.classList.remove('mobile', 'small-mobile', 'landscape');

            // Add appropriate responsive class
            if (isSmallMobile) {
                this.offlinePopup.classList.add('small-mobile');
            } else if (isMobile) {
                this.offlinePopup.classList.add('mobile');
            }

            if (isLandscape) {
                this.offlinePopup.classList.add('landscape');
            }
        }
    }

    handleOffline() {
        this.isOnline = false;
        this.showOfflineNotifications();
        this.updateConnectionStatus('offline');
    }

    handleOnline() {
        this.isOnline = true;
        this.hideOfflineNotifications();
        this.showOnlineToast();
        this.updateConnectionStatus('online');
    }

    showOfflineNotifications() {
        // Show toast immediately
        this.showOfflineToast();

        // Show popup after 2 seconds delay for better UX
        this.showPopupTimeout = setTimeout(() => {
            this.showOfflinePopup();
        }, 2000);
    }

    hideOfflineNotifications() {
        // Clear popup timeout if still pending
        if (this.showPopupTimeout) {
            clearTimeout(this.showPopupTimeout);
            this.showPopupTimeout = null;
        }

        this.hideOfflineToast();
        this.hideOfflinePopup();
    }

    showOfflineToast() {
        // Remove existing offline toast
        this.hideOfflineToast();

        // Create offline toast
        this.offlineToast = this.createToast({
            title: '🚫 Connection Lost',
            message: 'You are now offline',
            type: 'offline',
            persistent: true
        });
    }

    hideOfflineToast() {
        if (this.offlineToast) {
            this.removeToast(this.offlineToast);
            this.offlineToast = null;
        }
    }

    showOfflinePopup() {
        // Don't show popup if already online
        if (this.isOnline) return;

        // Remove existing popup
        this.hideOfflinePopup();

        // Check screen size for responsive adjustments
        const isMobile = window.innerWidth <= 768;
        const isSmallMobile = window.innerWidth <= 480;
        const isLandscape = window.innerHeight < 600 && window.innerWidth > window.innerHeight;

        // Create popup overlay
        this.offlinePopup = document.createElement('div');
        this.offlinePopup.className = 'offline-popup-overlay';

        // Add responsive class based on screen size
        if (isSmallMobile) {
            this.offlinePopup.classList.add('small-mobile');
        } else if (isMobile) {
            this.offlinePopup.classList.add('mobile');
        }

        if (isLandscape) {
            this.offlinePopup.classList.add('landscape');
        }

        this.offlinePopup.innerHTML = `
            <div class="offline-popup-container">
                <div class="offline-icon">
                    <div class="signal-bars">
                        <div class="bar"></div>
                        <div class="bar"></div>
                        <div class="bar"></div>
                        <div class="bar"></div>
                    </div>
                    <div class="offline-cross"></div>
                </div>
                
                <h2 class="offline-title">Connection Lost</h2>
                <p class="offline-message">Looks like you've gone offline. Don't worry, we'll help you reconnect!</p>
                
                <div class="connection-info">
                    <div class="info-item">
                        <span class="info-label">Connection Status:</span>
                        <span class="info-value status-offline">Disconnected</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Network Type:</span>
                        <span class="info-value">${this.getNetworkType()}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Last Ping:</span>
                        <span class="info-value">${this.getLastPingInfo()}</span>
                    </div>
                </div>
                
                <div class="offline-details">
                    <div class="offline-tips">
                        <h4>🔧 Quick Solutions:</h4>
                        <div class="tips-grid">
                            <div class="tip-item">
                                <div class="tip-icon">📶</div>
                                <div class="tip-text">Check your WiFi or mobile data connection</div>
                            </div>
                            <div class="tip-item">
                                <div class="tip-icon">🔄</div>
                                <div class="tip-text">Try refreshing the page or reconnecting</div>
                            </div>
                            <div class="tip-item">
                                <div class="tip-icon">🌐</div>
                                <div class="tip-text">Test other websites to verify connectivity</div>
                            </div>
                            <div class="tip-item">
                                <div class="tip-icon">⚡</div>
                                <div class="tip-text">Restart your router or modem</div>
                            </div>
                            <div class="tip-item">
                                <div class="tip-icon">✈️</div>
                                <div class="tip-text">Disable airplane mode if enabled</div>
                            </div>
                            <div class="tip-item">
                                <div class="tip-icon">📞</div>
                                <div class="tip-text">Contact your ISP if issues persist</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="offline-action">
                    <button class="retry-btn primary" onclick="window.offlineNotification.retryConnection()">
                        <span class="btn-icon">🔄</span>
                        <span class="btn-text">Retry Connection</span>
                        <div class="btn-ripple"></div>
                    </button>
                    <button class="close-btn secondary" onclick="window.offlineNotification.hideOfflinePopup()">
                        <span class="btn-icon">✕</span>
                        <span class="btn-text">Close</span>
                        <div class="btn-ripple"></div>
                    </button>
                </div>
                
                <div class="offline-footer">
                    <p>🛡️ Your data is safe - we'll sync when you're back online</p>
                </div>
            </div>
        `;

        // Add to page
        document.body.appendChild(this.offlinePopup);

        // Animate in with staggered effects
        setTimeout(() => {
            this.offlinePopup.classList.add('show');
            this.startOfflineAnimations();
        }, 100);

        // Add escape key listener
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hideOfflinePopup();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);
    }

    // Enhanced animations for offline popup
    startOfflineAnimations() {
        const bars = this.offlinePopup.querySelectorAll('.signal-bars .bar');
        const tipItems = this.offlinePopup.querySelectorAll('.tip-item');

        // Animate signal bars to show disconnection
        bars.forEach((bar, index) => {
            setTimeout(() => {
                bar.style.animation = 'barFade 0.5s ease-out forwards';
            }, index * 100);
        });

        // Staggered animation for tip items
        tipItems.forEach((item, index) => {
            item.style.transform = 'translateY(20px)';
            item.style.opacity = '0';
            setTimeout(() => {
                item.style.transition = 'all 0.4s ease-out';
                item.style.transform = 'translateY(0)';
                item.style.opacity = '1';
            }, 600 + (index * 100));
        });
    }

    // Get network type information
    getNetworkType() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            return connection.effectiveType ? connection.effectiveType.toUpperCase() : 'Unknown';
        }
        return 'Unknown';
    }

    // Get last ping information
    getLastPingInfo() {
        if (this.lastPingTime) {
            return `${Math.round(this.lastPingTime)}ms`;
        }
        return 'N/A';
    }

    hideOfflinePopup() {
        if (this.offlinePopup) {
            this.offlinePopup.classList.remove('show');
            setTimeout(() => {
                if (this.offlinePopup && this.offlinePopup.parentElement) {
                    document.body.removeChild(this.offlinePopup);
                }
                this.offlinePopup = null;
            }, 600);

            // Remove escape key listener
            if (this.escapeHandler) {
                document.removeEventListener('keydown', this.escapeHandler);
                this.escapeHandler = null;
            }
        }
    }

    retryConnection() {
        // Show loading state on retry button
        const retryBtn = this.offlinePopup?.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.classList.add('loading');
            retryBtn.querySelector('.btn-text').textContent = 'Checking...';
            retryBtn.querySelector('.btn-icon').textContent = '⏳';
        }

        // Perform comprehensive connection test
        this.performAdvancedOfflineCheck().then(() => {
            if (retryBtn) {
                if (this.isOnline) {
                    retryBtn.classList.remove('loading');
                    retryBtn.classList.add('success');
                    retryBtn.querySelector('.btn-text').textContent = 'Connected!';
                    retryBtn.querySelector('.btn-icon').textContent = '✅';

                    // Auto close popup after success
                    setTimeout(() => this.hideOfflinePopup(), 1500);
                } else {
                    retryBtn.classList.remove('loading');
                    retryBtn.classList.add('error');
                    retryBtn.querySelector('.btn-text').textContent = 'Still Offline';
                    retryBtn.querySelector('.btn-icon').textContent = '❌';

                    // Reset button after 2 seconds
                    setTimeout(() => {
                        retryBtn.classList.remove('error');
                        retryBtn.querySelector('.btn-text').textContent = 'Retry Connection';
                        retryBtn.querySelector('.btn-icon').textContent = '🔄';
                    }, 2000);

                    // Show toast notification
                    this.createToast({
                        title: '⚠️ Still Offline',
                        message: 'Please check your network settings and try again',
                        type: 'warning',
                        duration: 4000
                    });
                }
            }
        }).catch(() => {
            if (retryBtn) {
                retryBtn.classList.remove('loading');
                retryBtn.classList.add('error');
                retryBtn.querySelector('.btn-text').textContent = 'Connection Failed';
                retryBtn.querySelector('.btn-icon').textContent = '❌';

                setTimeout(() => {
                    retryBtn.classList.remove('error');
                    retryBtn.querySelector('.btn-text').textContent = 'Retry Connection';
                    retryBtn.querySelector('.btn-icon').textContent = '🔄';
                }, 2000);
            }
        });
    }

    createConnectionStatus() {
        this.connectionStatus = document.createElement('div');
        this.connectionStatus.className = 'connection-status';
        this.connectionStatus.innerHTML = `
            <div class="status-indicator">
                <div class="status-dot"></div>
                <div class="status-pulse"></div>
            </div>
            <div class="status-info">
                <span class="status-text">Checking connection...</span>
                <span class="status-quality">${this.connectionQuality}</span>
            </div>
        `;
        document.body.appendChild(this.connectionStatus);

        // Show initially
        setTimeout(() => this.connectionStatus.classList.add('show'), 1000);

        // Hide after 5 seconds if online
        setTimeout(() => {
            if (this.isOnline && this.connectionStatus) {
                this.connectionStatus.classList.remove('show');
            }
        }, 5000);
    }

    updateConnectionStatus(status) {
        if (!this.connectionStatus) return;

        const dot = this.connectionStatus.querySelector('.status-dot');
        const text = this.connectionStatus.querySelector('.status-text');
        const quality = this.connectionStatus.querySelector('.status-quality');

        // Remove existing status classes
        this.connectionStatus.classList.remove('online', 'offline');
        dot.classList.remove('online', 'offline');

        // Add new status
        this.connectionStatus.classList.add(status);
        dot.classList.add(status);

        if (status === 'offline') {
            text.textContent = 'Offline';
            quality.textContent = 'No Connection';
            this.connectionStatus.classList.add('show');
        } else {
            text.textContent = 'Online';
            quality.textContent = this.connectionQuality;
            this.connectionStatus.classList.add('show');
            // Hide after 3 seconds when online
            setTimeout(() => {
                if (this.connectionStatus) {
                    this.connectionStatus.classList.remove('show');
                }
            }, 3000);
        }
    }

    updateConnectionStatusDisplay() {
        if (this.connectionStatus) {
            const quality = this.connectionStatus.querySelector('.status-quality');
            if (quality) {
                quality.textContent = this.connectionQuality;
            }
        }
    }

    showOnlineToast() {
        // Show success message temporarily
        this.createToast({
            title: '✅ Back Online',
            message: 'Connection restored successfully',
            type: 'success',
            duration: 4000
        });
    }

    createToast({ title, message, type, duration = 0, persistent = false }) {
        // Ensure toast container exists
        this.ensureToastContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            ${persistent ? '<button class="toast-close" onclick="this.parentElement.remove()">×</button>' : ''}
        `;

        // Add to container
        document.getElementById('toast-container').appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto remove if not persistent
        if (!persistent && duration > 0) {
            setTimeout(() => this.removeToast(toast), duration);
        }

        return toast;
    }

    removeToast(toast) {
        if (toast && toast.parentElement) {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300);
        }
    }

    ensureToastContainer() {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
    }

    // Cleanup method to prevent memory leaks
    cleanup() {
        // Clear intervals
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        if (this.showPopupTimeout) {
            clearTimeout(this.showPopupTimeout);
            this.showPopupTimeout = null;
        }

        // Remove event listeners
        window.removeEventListener('online', this.handleOnline.bind(this));
        window.removeEventListener('offline', this.handleOffline.bind(this));

        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }

        // Remove DOM elements
        if (this.offlinePopup) {
            this.hideOfflinePopup();
        }

        if (this.offlineToast) {
            this.hideOfflineToast();
        }

        if (this.connectionStatus && this.connectionStatus.parentElement) {
            this.connectionStatus.parentElement.removeChild(this.connectionStatus);
            this.connectionStatus = null;
        }

        // Remove connection monitoring if supported
        if ('connection' in navigator) {
            const connection = navigator.connection;
            connection.removeEventListener('change', this.handleConnectionChange);
        }
    }
}
// Initialize global offline notification system
window.offlineNotification = new OfflineNotification();

// For backwards compatibility
window.offlineDetector = window.offlineNotification;

// Demo function for testing (can be removed in production)
window.testOfflinePopup = () => {
    if (window.offlineNotification) {
        window.offlineNotification.isOnline = false;
        window.offlineNotification.showOfflinePopup();
        console.log('🧪 Demo: Offline popup displayed for testing');
    }
};

// Demo function to test toast
window.testOfflineToast = () => {
    if (window.offlineNotification) {
        window.offlineNotification.showOfflineToast();
        console.log('🧪 Demo: Offline toast displayed for testing');
    }
};
