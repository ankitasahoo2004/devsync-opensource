/**
 * Dynamic Asset Loader for DevSync Application
 * Automatically loads and unloads CSS and JavaScript files based on the current page
 * Works with client-side routing without full page reloads
 */

class DynamicAssetLoader {
    constructor() {
        this.loadedAssets = new Map();
        this.pageAssets = {
            '/': {
                css: ['assets/css/index.css', 'assets/css/recognition.css'],
                js: ['assets/js/main.js', 'assets/js/auth.js', 'assets/js/recognition.js']
            },
            '/index.html': {
                css: ['assets/css/index.css', 'assets/css/recognition.css'],
                js: ['assets/js/main.js', 'assets/js/auth.js', 'assets/js/recognition.js']
            },
            '/about': {
                css: ['assets/css/about.css'],
                js: ['assets/js/main.js', 'assets/js/auth.js']
            },
            '/about.html': {
                css: ['assets/css/about.css'],
                js: ['assets/js/main.js', 'assets/js/auth.js']
            },
            '/projects': {
                css: [
                    'assets/css/work.css',
                    'assets/css/global-search.css',
                    'assets/css/modal.css',
                    'assets/css/toast.css',
                    'assets/css/work-projects-integration.css',
                    'assets/css/projects.css'
                ],
                js: [
                    'assets/js/main.js',
                    'assets/js/auth.js',
                    'assets/js/global-search.js',
                    'assets/js/projects.js'
                ]
            },
            '/projects.html': {
                css: [
                    'assets/css/work.css',
                    'assets/css/global-search.css',
                    'assets/css/modal.css',
                    'assets/css/toast.css',
                    'assets/css/work-projects-integration.css',
                    'assets/css/projects.css'
                ],
                js: [
                    'assets/js/main.js',
                    'assets/js/auth.js',
                    'assets/js/global-search.js',
                    'assets/js/projects.js'
                ]
            },
            '/events': {
                css: [
                    'assets/css/services.css',
                    'assets/css/global-search.css',
                    'assets/css/modal.css',
                    'assets/css/events-modern.css'
                ],
                js: [
                    'assets/js/main.js',
                    'assets/js/auth.js',
                    'assets/js/global-search.js',
                    'assets/js/events-integrated.js'
                ]
            },
            '/events.html': {
                css: [
                    'assets/css/services.css',
                    'assets/css/global-search.css',
                    'assets/css/modal.css',
                    'assets/css/events-modern.css'
                ],
                js: [
                    'assets/js/main.js',
                    'assets/js/auth.js',
                    'assets/js/global-search.js',
                    'assets/js/events-integrated.js'
                ]
            },
            '/leaderboard': {
                css: [
                    'assets/css/leaderboard.css',
                    'assets/css/global-search.css',
                    'assets/css/modal.css'
                ],
                js: [
                    'assets/js/main.js',
                    'assets/js/auth.js',
                    'assets/js/global-search.js',
                    'assets/js/leaderboard.js'
                ]
            },
            '/leaderboard.html': {
                css: [
                    'assets/css/leaderboard.css',
                    'assets/css/global-search.css',
                    'assets/css/modal.css'
                ],
                js: [
                    'assets/js/main.js',
                    'assets/js/auth.js',
                    'assets/js/global-search.js',
                    'assets/js/leaderboard.js'
                ]
            },
            '/profile': {
                css: [
                    'assets/css/profile.css',
                    'assets/css/global-search.css',
                    'assets/css/modal.css'
                ],
                js: [
                    'assets/js/main.js',
                    'assets/js/auth.js',
                    'assets/js/global-search.js',
                    'assets/js/profile.js'
                ]
            },
            '/profile.html': {
                css: [
                    'assets/css/profile.css',
                    'assets/css/global-search.css',
                    'assets/css/modal.css'
                ],
                js: [
                    'assets/js/main.js',
                    'assets/js/auth.js',
                    'assets/js/global-search.js',
                    'assets/js/profile.js'
                ]
            },
            '/contact': {
                css: [
                    'assets/css/contact.css',
                    'assets/css/contact-ticket.css',
                    'assets/css/global-search.css',
                    'assets/css/modal.css',
                    'assets/css/toast.css',
                    'assets/css/ticket.css'
                ],
                js: [
                    'assets/js/main.js',
                    'assets/js/auth.js',
                    'assets/js/global-search.js',
                    'assets/js/contact.js',
                    'assets/js/ticket.js'
                ]
            },
            '/contact.html': {
                css: [
                    'assets/css/contact.css',
                    'assets/css/contact-ticket.css',
                    'assets/css/global-search.css',
                    'assets/css/modal.css',
                    'assets/css/toast.css',
                    'assets/css/ticket.css'
                ],
                js: [
                    'assets/js/main.js',
                    'assets/js/auth.js',
                    'assets/js/global-search.js',
                    'assets/js/contact.js',
                    'assets/js/ticket.js'
                ]
            },
            '/login': {
                css: [
                    'assets/css/login.css',
                    'assets/css/global-search.css'
                ],
                js: [
                    'assets/js/main.js',
                    'assets/js/auth.js',
                    'assets/js/global-search.js'
                ]
            },
            '/login.html': {
                css: [
                    'assets/css/login.css',
                    'assets/css/global-search.css'
                ],
                js: [
                    'assets/js/main.js',
                    'assets/js/auth.js',
                    'assets/js/global-search.js'
                ]
            },
            '/admin': {
                css: [
                    'assets/css/admin.css',
                    'assets/css/admin-pr-scan.css',
                    'assets/css/admin-search.css',
                    'assets/css/admin-user-management.css',
                    'assets/css/global-search.css',
                    'assets/css/modal.css',
                    'assets/css/toast.css'
                ],
                js: [
                    'assets/js/main.js',
                    'assets/js/auth.js',
                    'assets/js/global-search.js',
                    'assets/js/admin.js',
                    'assets/js/admin-pr-scan.js',
                    'assets/js/admin-search.js',
                    'assets/js/admin-user-management.js'
                ]
            },
            '/admin.html': {
                css: [
                    'assets/css/admin.css',
                    'assets/css/admin-pr-scan.css',
                    'assets/css/admin-search.css',
                    'assets/css/admin-user-management.css',
                    'assets/css/global-search.css',
                    'assets/css/modal.css',
                    'assets/css/toast.css'
                ],
                js: [
                    'assets/js/main.js',
                    'assets/js/auth.js',
                    'assets/js/global-search.js',
                    'assets/js/admin.js',
                    'assets/js/admin-pr-scan.js',
                    'assets/js/admin-search.js',
                    'assets/js/admin-user-management.js'
                ]
            }
        };
    }

    /**
     * Initialize the dynamic asset loader
     */
    init() {
        this.interceptNavigation();
        this.loadPageAssets(window.location.pathname);
    }

    /**
     * Intercept navigation and load assets dynamically
     */
    interceptNavigation() {
        // Override the existing navigation function from auth.js
        if (window.forceReloadOnNavigation) {
            // Disable the force reload behavior
            window.forceReloadOnNavigation = () => { };
        }

        // Handle navigation links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) {
                return;
            }

            // Check if this is an internal page navigation
            if (this.pageAssets[href] || this.pageAssets[href.replace('.html', '')]) {
                e.preventDefault();
                this.navigateToPage(href);
            }
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.loadPageAssets(e.state.page, false);
            }
        });
    }

    /**
     * Navigate to a new page and load its assets
     */
    async navigateToPage(path) {
        try {
            // Start page-out animation and loading bar
            this.startPageTransition();
            this.showLoadingBar();

            // Wait for page-out animation to complete
            await this.waitForPageOut();

            // Load page assets
            await this.loadPageAssets(path);

            // Update browser history
            window.history.pushState({ page: path }, '', path);

            // Complete loading bar and start page-in animation
            this.completeLoadingBar();
            await this.startPageIn();

            // Trigger page-specific initialization
            this.initializePageScripts(path);

        } catch (error) {
            console.error('Navigation error:', error);
            this.hideLoadingBar();
            // Fallback to regular navigation
            window.location.href = path;
        }
    }

    /**
     * Load assets for a specific page
     */
    async loadPageAssets(path, updateHistory = true) {
        const assets = this.pageAssets[path] || this.pageAssets[path.replace('.html', '')];
        if (!assets) {
            console.warn(`No assets defined for path: ${path}`);
            return;
        }

        // Remove current page assets that are not needed for the new page
        this.cleanupUnusedAssets(assets);

        // Load new CSS files
        await this.loadCSSFiles(assets.css);

        // Load new JS files
        await this.loadJSFiles(assets.js);

        // Update current page assets
        this.currentPageAssets = new Set([...assets.css, ...assets.js]);

        // Re-initialize common scripts
        this.reinitializeCommonScripts();
    }

    /**
     * Remove assets that are not needed for the new page
     */
    cleanupUnusedAssets(newAssets) {
        const newAssetSet = new Set([...newAssets.css, ...newAssets.js]);

        // Remove CSS files that are not needed
        this.currentPageAssets.forEach(asset => {
            if (asset.endsWith('.css') && !newAssetSet.has(asset)) {
                const link = document.querySelector(`link[href="${asset}"]`);
                if (link && !link.dataset.permanent) {
                    link.remove();
                    this.loadedAssets.delete(asset);
                }
            }
        });
    }

    /**
     * Load CSS files dynamically
     */
    async loadCSSFiles(cssFiles) {
        const promises = cssFiles.map(cssFile => {
            if (this.loadedAssets.has(cssFile)) {
                return Promise.resolve();
            }

            return new Promise((resolve, reject) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = cssFile;
                link.dataset.dynamicAsset = 'true';

                link.onload = () => {
                    this.loadedAssets.add(cssFile);
                    resolve();
                };

                link.onerror = () => {
                    console.error(`Failed to load CSS: ${cssFile}`);
                    reject(new Error(`Failed to load CSS: ${cssFile}`));
                };

                document.head.appendChild(link);
            });
        });

        await Promise.all(promises);
    }

    /**
     * Load JS files dynamically
     */
    async loadJSFiles(jsFiles) {
        for (const jsFile of jsFiles) {
            if (this.loadedAssets.has(jsFile)) {
                continue;
            }

            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = jsFile;
                script.dataset.dynamicAsset = 'true';

                script.onload = () => {
                    this.loadedAssets.add(jsFile);
                    resolve();
                };

                script.onerror = () => {
                    console.error(`Failed to load JS: ${jsFile}`);
                    reject(new Error(`Failed to load JS: ${jsFile}`));
                };

                document.head.appendChild(script);
            });
        }
    }

    /**
     * Initialize page-specific scripts after navigation
     */
    initializePageScripts(path) {
        // Dispatch custom event for page initialization
        const event = new CustomEvent('pageAssetsLoaded', {
            detail: { path, assets: this.pageAssets[path] || this.pageAssets[path.replace('.html', '')] }
        });
        document.dispatchEvent(event);

        // Re-run common initialization functions
        if (typeof checkAuthStatus === 'function') {
            checkAuthStatus();
        }

        // Page-specific initialization
        switch (path) {
            case '/projects':
                if (typeof initializeProjectsPage === 'function') {
                    initializeProjectsPage();
                }
                break;
            case '/events':
                if (typeof initializeEventsPage === 'function') {
                    initializeEventsPage();
                }
                break;
            case '/leaderboard':
                if (typeof initializeLeaderboardPage === 'function') {
                    initializeLeaderboardPage();
                }
                break;
            case '/profile':
                if (typeof fetchUserProfile === 'function') {
                    fetchUserProfile();
                }
                break;
            case '/contact':
                if (typeof initializeContactPage === 'function') {
                    initializeContactPage();
                }
                break;
            case '/admin':
                if (typeof checkAdminAuth === 'function') {
                    checkAdminAuth();
                }
                break;
        }
    }

    /**
     * Re-initialize common scripts that need to run on every page
     */
    reinitializeCommonScripts() {
        // Re-initialize navigation
        if (typeof updateNavigation === 'function') {
            updateNavigation();
        }

        // Re-initialize global search if available
        if (typeof initializeGlobalSearch === 'function') {
            initializeGlobalSearch();
        }

        // Re-initialize scroll reveal
        if (typeof ScrollReveal !== 'undefined') {
            ScrollReveal().reveal('.section, .card, .item', {
                origin: 'top',
                distance: '30px',
                duration: 1000,
                delay: 100
            });
        }

        // Re-initialize Swiper if available
        if (typeof Swiper !== 'undefined') {
            // Destroy existing swipers
            document.querySelectorAll('.swiper').forEach(swiperEl => {
                if (swiperEl.swiper) {
                    swiperEl.swiper.destroy();
                }
            });

            // Re-initialize swipers
            setTimeout(() => {
                if (document.querySelector('.home-swiper')) {
                    new Swiper('.home-swiper', {
                        spaceBetween: 30,
                        loop: true,
                        pagination: {
                            el: '.swiper-pagination',
                            clickable: true,
                        },
                    });
                }

                if (document.querySelector('.new-swiper')) {
                    new Swiper('.new-swiper', {
                        centeredSlides: true,
                        slidesPerView: 'auto',
                        loop: true,
                        spaceBetween: 16,
                    });
                }

                if (document.querySelector('.team-swiper')) {
                    new Swiper('.team-swiper', {
                        loop: true,
                        grabCursor: true,
                        spaceBetween: 32,
                        pagination: {
                            el: '.swiper-pagination',
                            clickable: true,
                        },
                        autoplay: {
                            delay: 3500,
                            disableOnInteraction: false,
                        }
                    });
                }
            }, 100);
        }
    }

    /**
     * Show GitHub-style loading bar
     */
    showLoadingBar() {
        // Remove existing loading bar if any
        this.hideLoadingBar();

        const loadingBar = document.createElement('div');
        loadingBar.id = 'github-loading-bar';
        loadingBar.innerHTML = `
            <div class="loading-bar-container">
                <div class="loading-bar-progress"></div>
            </div>
            <style>
                .loading-bar-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    background: rgba(255, 255, 255, 0.1);
                    z-index: 10001;
                    overflow: hidden;
                }
                
                .loading-bar-progress {
                    height: 100%;
                    background: linear-gradient(90deg, #0066cc, #4285f4, #0066cc);
                    background-size: 200% 100%;
                    width: 0%;
                    transition: width 0.3s ease;
                    animation: loadingBarShimmer 1.5s infinite;
                }
                
                @keyframes loadingBarShimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                
                .loading-bar-progress.complete {
                    width: 100% !important;
                    transition: width 0.2s ease;
                }
            </style>
        `;
        document.body.appendChild(loadingBar);

        // Animate progress
        const progressBar = loadingBar.querySelector('.loading-bar-progress');
        setTimeout(() => progressBar.style.width = '30%', 50);
        setTimeout(() => progressBar.style.width = '60%', 200);
        setTimeout(() => progressBar.style.width = '80%', 400);
    }

    /**
     * Complete and hide GitHub-style loading bar
     */
    completeLoadingBar() {
        const loadingBar = document.getElementById('github-loading-bar');
        if (loadingBar) {
            const progressBar = loadingBar.querySelector('.loading-bar-progress');
            progressBar.classList.add('complete');

            setTimeout(() => {
                this.hideLoadingBar();
            }, 300);
        }
    }

    /**
     * Hide loading bar
     */
    hideLoadingBar() {
        const loadingBar = document.getElementById('github-loading-bar');
        if (loadingBar) {
            loadingBar.remove();
        }
    }

    /**
     * Start page transition (page-out effect)
     */
    startPageTransition() {
        // Add page-out class to trigger animation
        document.body.classList.add('page-out');
    }

    /**
     * Wait for page-out animation to complete
     */
    waitForPageOut() {
        return new Promise(resolve => {
            // Wait for page-out animation duration
            setTimeout(resolve, 300);
        });
    }

    /**
     * Start page-in animation
     */
    async startPageIn() {
        // Remove page-out and add page-in
        document.body.classList.remove('page-out');
        document.body.classList.add('page-in');

        // Remove page-in class after animation
        setTimeout(() => {
            document.body.classList.remove('page-in');
        }, 600);
    }

    /**
     * Add a new asset to the map
     */
    addAsset(path, type, asset) {
        if (!this.pageAssets[path]) {
            this.pageAssets[path] = { css: [], js: [] };
        }
        if (!this.pageAssets[path][type].includes(asset)) {
            this.pageAssets[path][type].push(asset);
        }
    }

    /**
     * Remove an asset from the map
     */
    removeAsset(path, type, asset) {
        if (this.pageAssets[path] && this.pageAssets[path][type]) {
            const index = this.pageAssets[path][type].indexOf(asset);
            if (index > -1) {
                this.pageAssets[path][type].splice(index, 1);
            }
        }
    }

    /**
     * Get loaded assets for debugging
     */
    getLoadedAssets() {
        return Array.from(this.loadedAssets);
    }

    /**
     * Get current page assets for debugging
     */
    getCurrentPageAssets() {
        return Array.from(this.currentPageAssets);
    }
}

// Initialize the dynamic asset loader when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if not already initialized
    if (!window.dynamicAssetLoader) {
        window.dynamicAssetLoader = new DynamicAssetLoader();
        window.dynamicAssetLoader.init();
        console.log('Dynamic Asset Loader initialized');
    }
});

// Also try to initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    // Do nothing, wait for DOMContentLoaded
} else {
    // DOM is already loaded
    if (!window.dynamicAssetLoader) {
        window.dynamicAssetLoader = new DynamicAssetLoader();
        window.dynamicAssetLoader.init();
        console.log('Dynamic Asset Loader initialized (DOM already loaded)');
    }
}

// Export for potential external use
window.DynamicAssetLoader = DynamicAssetLoader;
