/**
 * Page Initialization Script for Dynamic Asset Loading
 * This script handles page-specific initialization after assets are loaded dynamically
 */

class PageInitializer {
    constructor() {
        this.initialized = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for dynamic page loads
        document.addEventListener('pageAssetsLoaded', (event) => {
            this.handlePageLoad(event.detail.path);
        });

        // Listen for DOMContentLoaded for initial page load
        document.addEventListener('DOMContentLoaded', () => {
            this.handlePageLoad(window.location.pathname);
        });

        // Listen for the custom dynamic page loaded event
        document.addEventListener('dynamicPageLoaded', (event) => {
            this.handlePageLoad(event.pageKey);
        });
    }

    handlePageLoad(path) {
        // Normalize the path
        const normalizedPath = this.normalizePath(path);

        console.log(`[PageInitializer] Initializing page: ${normalizedPath}`);

        // Wait a bit for all assets to be loaded
        setTimeout(() => {
            this.initializePage(normalizedPath);
        }, 100);
    }

    normalizePath(path) {
        // Remove .html extension if present
        path = path.replace('.html', '');

        // Default to home page if empty
        if (path === '' || path === '/') {
            return '/';
        }

        return path;
    }

    async initializePage(path) {
        // Re-initialize common functionality
        this.initializeCommonFeatures();

        // Initialize page-specific functionality
        switch (path) {
            case '/':
                this.initializeHomePage();
                break;
            case '/about':
                this.initializeAboutPage();
                break;
            case '/projects':
                this.initializeProjectsPage();
                break;
            case '/events':
                this.initializeEventsPage();
                break;
            case '/leaderboard':
                this.initializeLeaderboardPage();
                break;
            case '/profile':
                this.initializeProfilePage();
                break;
            case '/contact':
                this.initializeContactPage();
                break;
            case '/login':
                this.initializeLoginPage();
                break;
            case '/admin':
                this.initializeAdminPage();
                break;
            default:
                console.warn(`[PageInitializer] No initialization defined for path: ${path}`);
        }
    }

    initializeCommonFeatures() {
        // Re-initialize auth status
        if (typeof checkAuthStatus === 'function') {
            checkAuthStatus();
        }

        // Re-initialize global search
        if (typeof GlobalSearch !== 'undefined') {
            if (window.globalSearch) {
                window.globalSearch.init();
            } else {
                window.globalSearch = new GlobalSearch();
            }
        }

        // Re-initialize navigation
        if (typeof updateNavigation === 'function') {
            updateNavigation();
        }

        // Re-initialize scroll effects
        this.initializeScrollEffects();

        // Re-initialize mobile menu
        this.initializeMobileMenu();
    }

    initializeScrollEffects() {
        // Re-initialize scroll reveal if available
        if (typeof ScrollReveal !== 'undefined') {
            const sr = ScrollReveal({
                origin: 'top',
                distance: '60px',
                duration: 2500,
                delay: 400,
            });

            sr.reveal('.section', { interval: 100 });
            sr.reveal('.card', { interval: 200 });
            sr.reveal('.item', { interval: 300 });
        }

        // Re-initialize scroll header
        if (typeof scrollHeader === 'function') {
            window.addEventListener('scroll', scrollHeader);
        }

        // Re-initialize scroll active
        if (typeof scrollActive === 'function') {
            window.addEventListener('scroll', scrollActive);
        }
    }

    initializeMobileMenu() {
        // Re-initialize mobile menu functionality
        const navMenu = document.getElementById('nav-menu');
        const navToggle = document.getElementById('nav-toggle');
        const navClose = document.getElementById('nav-close');

        if (navToggle && navMenu) {
            navToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                navMenu.classList.toggle('show-menu');
            });
        }

        if (navClose && navMenu) {
            navClose.addEventListener('click', () => {
                navMenu.classList.remove('show-menu');
            });
        }

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (navMenu && navMenu.classList.contains('show-menu')) {
                if (!e.target.closest('.nav__menu') && !e.target.closest('#nav-toggle')) {
                    navMenu.classList.remove('show-menu');
                }
            }
        });
    }

    initializeHomePage() {
        // Initialize home page specific features
        this.initializeSwiper();
        this.initializeRecognition();
        this.initializeLeaderboardPreview();
    }

    initializeSwiper() {
        // Re-initialize Swiper components
        if (typeof Swiper !== 'undefined') {
            // Destroy existing swipers first
            document.querySelectorAll('.swiper').forEach(swiperEl => {
                if (swiperEl.swiper) {
                    swiperEl.swiper.destroy();
                }
            });

            // Initialize home swiper
            const homeSwiper = document.querySelector('.home-swiper');
            if (homeSwiper) {
                new Swiper('.home-swiper', {
                    spaceBetween: 30,
                    loop: true,
                    pagination: {
                        el: '.swiper-pagination',
                        clickable: true,
                    },
                });
            }

            // Initialize new swiper
            const newSwiper = document.querySelector('.new-swiper');
            if (newSwiper) {
                new Swiper('.new-swiper', {
                    centeredSlides: true,
                    slidesPerView: 'auto',
                    loop: true,
                    spaceBetween: 16,
                });
            }
        }
    }

    initializeRecognition() {
        // Initialize recognition functionality if available
        if (typeof initializeRecognition === 'function') {
            initializeRecognition();
        }
    }

    initializeLeaderboardPreview() {
        // Initialize leaderboard preview if available
        if (typeof loadLeaderboardPreview === 'function') {
            loadLeaderboardPreview();
        }
    }

    initializeAboutPage() {
        // Initialize about page specific features
        console.log('[PageInitializer] About page initialized');
    }

    initializeProjectsPage() {
        // Initialize projects page
        if (typeof checkAuthAndInitialize === 'function') {
            checkAuthAndInitialize();
        }
    }

    initializeEventsPage() {
        // Initialize events page
        if (typeof initializeEventsPage === 'function') {
            initializeEventsPage();
        }
    }

    initializeLeaderboardPage() {
        // Initialize leaderboard page
        if (typeof loadLeaderboard === 'function') {
            loadLeaderboard();
        }
    }

    initializeProfilePage() {
        // Initialize profile page
        if (typeof fetchUserProfile === 'function') {
            fetchUserProfile();
        }
    }

    initializeContactPage() {
        // Initialize contact page
        if (typeof initializeContactForm === 'function') {
            initializeContactForm();
        }
    }

    initializeLoginPage() {
        // Initialize login page
        console.log('[PageInitializer] Login page initialized');
    }

    initializeAdminPage() {
        // Initialize admin page
        if (typeof checkAdminAuth === 'function') {
            checkAdminAuth();
        }
    }

    // Public method to manually initialize a page
    manualInitialize(path) {
        this.handlePageLoad(path);
    }
}

// Initialize the page initializer
window.pageInitializer = new PageInitializer();

// Export for potential external use
window.PageInitializer = PageInitializer;
