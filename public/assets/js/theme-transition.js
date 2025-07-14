/**
 * Smooth Theme Transition System
 * Creates a flowing, water-like animation when switching between light and dark themes
 */

class ThemeTransition {
    constructor() {
        this.isTransitioning = false;
        this.currentTheme = this.getCurrentTheme();
        this.transitionDuration = 1200; // ms
        this.rippleCount = 3; // Number of ripple waves

        this.init();
    }

    init() {
        this.createTransitionOverlay();
        this.bindThemeToggle();
        this.applyInitialTheme();

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme-preference')) {
                this.setTheme(e.matches ? 'dark' : 'light', true);
            }
        });
    }

    getCurrentTheme() {
        const saved = localStorage.getItem('theme-preference');
        if (saved) return saved;

        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    createTransitionOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'theme-transition-overlay';
        overlay.innerHTML = `
            <div class="ripple-container">
                ${Array.from({ length: this.rippleCount }, (_, i) =>
            `<div class="ripple ripple-${i + 1}"></div>`
        ).join('')}
            </div>
        `;
        document.body.appendChild(overlay);
        this.overlay = overlay;
    }

    bindThemeToggle() {
        const toggles = document.querySelectorAll('[mode-toggle]');

        toggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.isTransitioning) {
                    this.toggleTheme(e);
                }
            });
        });

        // Also bind to any other theme toggle buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-theme-toggle]') ||
                e.target.closest('[data-theme-toggle]')) {
                e.preventDefault();
                if (!this.isTransitioning) {
                    this.toggleTheme(e);
                }
            }
        });
    }

    toggleTheme(event) {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme, true, event);
    }

    setTheme(theme, animate = false, event = null) {
        if (this.isTransitioning) return;

        this.currentTheme = theme;
        localStorage.setItem('theme-preference', theme);

        if (animate && event) {
            this.animateThemeChange(theme, event);
        } else {
            this.applyTheme(theme);
        }
    }

    async animateThemeChange(newTheme, event) {
        this.isTransitioning = true;

        // Get click position for ripple origin
        const rect = event.target.getBoundingClientRect();
        const clickX = rect.left + rect.width / 2;
        const clickY = rect.top + rect.height / 2;

        // Calculate the maximum distance to cover entire screen
        const maxDistance = Math.max(
            Math.sqrt(Math.pow(clickX, 2) + Math.pow(clickY, 2)),
            Math.sqrt(Math.pow(window.innerWidth - clickX, 2) + Math.pow(clickY, 2)),
            Math.sqrt(Math.pow(clickX, 2) + Math.pow(window.innerHeight - clickY, 2)),
            Math.sqrt(Math.pow(window.innerWidth - clickX, 2) + Math.pow(window.innerHeight - clickY, 2))
        );

        // Set up the overlay
        this.overlay.style.display = 'block';
        this.overlay.classList.add('active');

        // Position ripples at click point
        const ripples = this.overlay.querySelectorAll('.ripple');
        ripples.forEach((ripple, index) => {
            ripple.style.left = clickX + 'px';
            ripple.style.top = clickY + 'px';
            ripple.style.setProperty('--max-scale', (maxDistance * 2 / 100));
            ripple.style.setProperty('--delay', `${index * 150}ms`);
        });

        // Set the new theme color for the overlay
        this.overlay.style.setProperty('--target-bg',
            newTheme === 'dark' ? 'var(--main-dark)' : 'var(--main-light)'
        );

        // Start the ripple animation
        await this.sleep(50); // Small delay for setup
        this.overlay.classList.add('rippling');

        // Apply theme at the peak of the animation
        setTimeout(() => {
            this.applyTheme(newTheme);
        }, this.transitionDuration * 0.6);

        // Clean up after animation
        setTimeout(() => {
            this.overlay.classList.remove('active', 'rippling');
            this.overlay.style.display = 'none';
            this.isTransitioning = false;
        }, this.transitionDuration);
    }

    applyTheme(theme) {
        const html = document.documentElement;

        // Remove all theme classes
        html.classList.remove('dark', 'light');

        // Add new theme class
        html.classList.add(theme);

        // Update toggle states
        this.updateToggleStates(theme);

        // Trigger custom event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme }
        }));
    }

    updateToggleStates(theme) {
        const toggles = document.querySelectorAll('[mode-toggle]');

        toggles.forEach(toggle => {
            toggle.setAttribute('mode-toggle', theme);
            toggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');

            // Update visual state
            if (theme === 'dark') {
                toggle.classList.add('is-dark');
            } else {
                toggle.classList.remove('is-dark');
            }
        });
    }

    applyInitialTheme() {
        this.applyTheme(this.currentTheme);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// CSS for the transition overlay and animations
const themeTransitionCSS = `
    .theme-transition-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 9999;
        display: none;
        overflow: hidden;
    }

    .ripple-container {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .ripple {
        position: absolute;
        border-radius: 50%;
        background: var(--target-bg, var(--main-dark));
        transform: translate(-50%, -50%) scale(0);
        opacity: 0;
        pointer-events: none;
        width: 100px;
        height: 100px;
    }

    .theme-transition-overlay.rippling .ripple {
        animation: rippleExpand var(--duration, 1200ms) cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        animation-delay: var(--delay, 0ms);
    }

    .ripple-1 {
        animation-duration: 1200ms;
        opacity: 0.9;
    }

    .ripple-2 {
        animation-duration: 1000ms;
        opacity: 0.7;
        width: 80px;
        height: 80px;
    }

    .ripple-3 {
        animation-duration: 800ms;
        opacity: 0.5;
        width: 60px;
        height: 60px;
    }

    @keyframes rippleExpand {
        0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: var(--ripple-opacity, 0.8);
        }
        50% {
            opacity: var(--ripple-opacity, 0.8);
        }
        100% {
            transform: translate(-50%, -50%) scale(var(--max-scale, 20));
            opacity: 0;
        }
    }

    /* Enhanced smooth transitions for theme elements */
    * {
        transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                   color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                   border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                   box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                   fill 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Theme toggle enhanced styling */
    [mode-toggle] {
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    [mode-toggle]:hover {
        transform: scale(1.05);
    }

    .mode-toggle-track {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .mode-toggle-btn {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Smooth background transitions */
    body {
        transition: background-color 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Smooth gradient transitions */
    [gradient-evolve]::before {
        transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Performance optimizations for transitions */
    .theme-transition-overlay,
    .ripple {
        will-change: transform, opacity;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
    }

    /* Reduce motion for users who prefer it */
    @media (prefers-reduced-motion: reduce) {
        .theme-transition-overlay {
            display: none !important;
        }
        
        .ripple {
            animation: none !important;
        }
        
        * {
            transition-duration: 0.1s !important;
        }
    }
`;

// Inject CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = themeTransitionCSS;
document.head.appendChild(styleSheet);

// Initialize theme system
let themeTransition;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        themeTransition = new ThemeTransition();
    });
} else {
    themeTransition = new ThemeTransition();
}

// Export for external use
window.themeTransition = themeTransition;
window.ThemeTransition = ThemeTransition;
