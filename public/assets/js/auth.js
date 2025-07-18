// const serverUrl = 'https://devsync-opensource.tech';
// const serverUrl = 'https://www.devsync.club';
const serverUrl = 'http://localhost:3000';

/**
 * Extract the first word/name from a full name or username
 * @param {string} fullName - Full name or username
 * @returns {string} First word of the name
 */
function getFirstName(fullName) {
    if (!fullName) return 'User';
    return fullName.trim().split(' ')[0];
}

// Page transition animation functions
function getOrCreatePageWipeElement() {
    // First check if the page wipe already exists in the DOM (from index.html)
    let pageWipe = document.querySelector('.page-wipe-w');

    if (pageWipe) {
        // Reset any previous styles to ensure clean state
        pageWipe.style.visibility = 'visible';
        pageWipe.style.opacity = '1';
        return pageWipe;
    }

    // If not found, create the page wipe structure to match index.html exactly
    pageWipe = document.createElement('div');
    pageWipe.className = 'page-wipe-w';
    pageWipe.setAttribute('pointer-none', '');

    const pageWipeInner = document.createElement('div');
    pageWipeInner.className = 'page-wipe-inner';
    pageWipeInner.setAttribute('pointer-auto', '');
    pageWipeInner.setAttribute('page-wipe-block', '');

    const pageWipeObjectW = document.createElement('div');
    pageWipeObjectW.className = 'page-wipe-object-w';
    pageWipeObjectW.setAttribute('page-wipe-object', '');

    const wipeOutlineW = document.createElement('div');
    wipeOutlineW.className = 'wipe-outline-w w-embed';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('version', '1.1');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('x', '0');
    svg.setAttribute('y', '0');
    svg.setAttribute('viewBox', '0 0 162 162');
    svg.setAttribute('xml:space', 'preserve');

    const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path1.className = 'page-wipe-path';
    path1.setAttribute('d', 'M108 88.7c-10.8 0-19.7 8.8-19.7 19.7v47.4c0 1.9-1.5 3.4-3.4 3.4h-8.6c-1.9 0-3.4-1.5-3.4-3.4v-47.4c0-10.8-8.8-19.7-19.7-19.7H6.4c-1.9 0-3.4-1.5-3.4-3.4v-8c0-1.9 1.5-3.4 3.4-3.4h46.9c10.8 0 19.7-8.8 19.6-19.7V6.4c0-1.9 1.5-3.4 3.4-3.4H85c1.9 0 3.4 1.5 3.4 3.4v47.8c0 10.8 8.8 19.7 19.7 19.7h46.6c1.9 0 3.4 1.5 3.4 3.4v8c0 1.9-1.5 3.4-3.4 3.4H108z');

    const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path2.className = 'page-wipe-path';
    path2.setAttribute('d', 'M146.1 134.4h-.7c-6.5 0-11.9 5.3-11.9 11.9v.7c0 6.7 5.5 12.2 12.2 12.2s12.2-5.5 12.2-12.2v-.7c0-6.6-5.2-11.9-11.8-11.9z');

    svg.appendChild(path1);
    svg.appendChild(path2);
    wipeOutlineW.appendChild(svg);
    pageWipeObjectW.appendChild(wipeOutlineW);
    pageWipeInner.appendChild(pageWipeObjectW);
    pageWipe.appendChild(pageWipeInner);

    // Add to HUD container if it exists, otherwise to body
    const hudW = document.querySelector('.hud-w');
    if (hudW) {
        hudW.appendChild(pageWipe);
    } else {
        document.body.appendChild(pageWipe);
    }

    return pageWipe;
}

function showPageWipeAnimation() {
    return new Promise((resolve) => {
        const pageWipe = getOrCreatePageWipeElement();

        // Reset any existing styles and set initial state - hidden off screen (bottom)
        pageWipe.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            pointer-events: none;
            transform: translateY(100%);
            transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            visibility: visible;
            opacity: 1;
        `;

        // Force a reflow to ensure the initial state is applied
        pageWipe.offsetHeight;

        // Trigger animation - slide up from bottom to cover the screen
        requestAnimationFrame(() => {
            pageWipe.style.transform = 'translateY(0%)';
        });

        // Resolve when animation completes
        setTimeout(() => {
            resolve();
        }, 800);
    });
}

function hidePageWipeAnimation() {
    return new Promise((resolve) => {
        const pageWipe = document.querySelector('.page-wipe-w');
        if (pageWipe) {
            // Add transition if not already present
            if (!pageWipe.style.transition) {
                pageWipe.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            }

            // Slide back down off screen
            pageWipe.style.transform = 'translateY(100%)';

            setTimeout(() => {
                // If it's the original page wipe element (from index.html), just hide it
                if (pageWipe.hasAttribute('data-original')) {
                    pageWipe.style.visibility = 'hidden';
                    pageWipe.style.opacity = '0';
                    // Reset transform so it's ready for next use
                    setTimeout(() => {
                        pageWipe.style.transform = 'translateY(100%)';
                    }, 100);
                } else {
                    // If it's a dynamically created element, remove it
                    if (pageWipe.parentNode) {
                        pageWipe.parentNode.removeChild(pageWipe);
                    }
                }
                resolve();
            }, 800);
        } else {
            resolve();
        }
    });
}

function triggerAuthWithAnimation(authUrl) {
    // Show the animation first
    showPageWipeAnimation().then(() => {
        // Store the current page URL for return navigation
        sessionStorage.setItem('authReturnUrl', window.location.href);

        // Navigate to auth after animation completes
        window.location.href = authUrl;
    });
}

// Handle logout with animation
function triggerLogoutWithAnimation() {
    // Show the animation first
    showPageWipeAnimation().then(() => {
        // Navigate to logout endpoint
        window.location.href = `${serverUrl}/auth/logout`;
    });
}

// Enhanced auth status check with optional callback
async function checkAuthStatusWithCallback(onComplete) {
    try {
        const response = await fetch(`${serverUrl}/api/user`, {
            credentials: 'include'
        });
        const data = await response.json();

        // Update main auth button in header
        updateAuthButton('#auth-button', data);

        // Update menu auth button
        updateAuthButton('#menu-auth-button', data);

        // Update CTA buttons
        updateCtaButton('#cta-auth-button-1', data);
        updateCtaButton('#cta-auth-button-2', data);

        // Update footer auth button
        updateAuthButton('#footer-auth-button', data);

        if (onComplete) onComplete(data);

    } catch (error) {
        console.error('Auth check failed:', error);
        // Fallback to login state for all buttons
        setLoginState();
        if (onComplete) onComplete({ isAuthenticated: false });
    }
}

// Check if returning from auth and handle animation
function handleAuthReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth');
    const returnUrl = sessionStorage.getItem('authReturnUrl');

    if (authSuccess === 'success' || authSuccess === 'error') {
        // Clear the return URL
        sessionStorage.removeItem('authReturnUrl');

        // Show animation covering the screen, then hide it to reveal the logged-in state
        const pageWipe = getOrCreatePageWipeElement();
        pageWipe.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            pointer-events: none;
            transform: translateY(0%);
            transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            visibility: visible;
            opacity: 1;
        `;

        setTimeout(() => {
            hidePageWipeAnimation().then(() => {
                // Clean up URL parameters
                const cleanUrl = window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);

                // Refresh auth status
                checkAuthStatus();
            });
        }, 500);
    }
}

async function checkAuthStatus() {
    try {
        const response = await fetch(`${serverUrl}/api/user`, {
            credentials: 'include'
        });
        const data = await response.json();

        // Update main auth button in header
        updateAuthButton('#auth-button', data);

        // Update menu auth button
        updateAuthButton('#menu-auth-button', data);

        // Update CTA buttons
        updateCtaButton('#cta-auth-button-1', data);
        updateCtaButton('#cta-auth-button-2', data);

        // Update footer auth button
        updateAuthButton('#footer-auth-button', data);

    } catch (error) {
        console.error('Auth check failed:', error);
        // Fallback to login state for all buttons
        setLoginState();
    }
}

function updateAuthButton(selector, data) {
    const button = document.querySelector(selector);
    if (!button) return;

    // Add loading state
    button.classList.add('auth-button-loading');

    setTimeout(() => {
        if (data.isAuthenticated) {
            // Update to profile button with user's full name
            const isMainButton = selector === '#auth-button';
            const fullUserName = data.user.displayName || data.user.username || 'Profile';
            // Use full name with ellipsis handling in CSS

            if (isMainButton) {
                button.innerHTML = `
                    <div class="btn-inner">
                        <div class="o-hidden">
                            <div split-text="" stagger-text="" class="btn-txt auth-user-name" title="${fullUserName}">${fullUserName}</div>
                        </div>
                        <div class="btn-icon-w">
                            <img src="${data.user.photos[0].value}" 
                                 alt="Profile" 
                                 style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;">
                        </div>
                    </div>
                    <div class="btn-bg-w">
                        <div class="btn-bg-fill"></div>
                    </div>
                `;
            } else {
                button.innerHTML = `
                    <div class="o-hidden page-link-inner">
                        <div split-text="" stagger-text="" class="text-small btn-txt auth-user-name" title="${fullUserName}">${fullUserName}</div>
                        <div class="btn-icon-w">
                            <img src="${data.user.photos[0].value}" 
                                 alt="Profile" 
                                 style="width: 16px; height: 16px; border-radius: 50%; object-fit: cover;">
                        </div>
                    </div>
                    <div class="link-track">
                        <div class="link-track-fill"></div>
                    </div>
                `;
            }
            button.href = '/profile';
            button.classList.add('authenticated', 'auth-button');

            // Add click event listener to ensure redirect works
            button.onclick = function (e) {
                e.preventDefault();
                window.location.href = '/profile';
            };
        } else {
            // Keep the login button
            const isMainButton = selector === '#auth-button';
            if (isMainButton) {
                button.innerHTML = `
                    <div class="btn-inner">
                        <div class="o-hidden">
                            <div split-text="" stagger-text="" class="btn-txt">Login</div>
                        </div>
                        <div class="btn-icon-w">
                            <div class="btn-txt">-&gt;</div>
                        </div>
                    </div>
                    <div class="btn-bg-w">
                        <div class="btn-bg-fill"></div>
                    </div>
                `;

                // Add click handler for animated auth
                button.onclick = function (e) {
                    e.preventDefault();
                    triggerAuthWithAnimation(`${serverUrl}/auth/github`);
                };
            } else {
                button.innerHTML = `
                    <div class="o-hidden page-link-inner">
                        <div split-text="" stagger-text="" class="text-small btn-txt">Login</div>
                        <div class="btn-icon-w">
                            <div class="text-small btn-txt">-&gt;</div>
                        </div>
                    </div>
                    <div class="link-track">
                        <div class="link-track-fill"></div>
                    </div>
                `;
            }
            button.href = `${serverUrl}/auth/github`;

            // Add click handler for animated auth
            button.onclick = function (e) {
                e.preventDefault();
                triggerAuthWithAnimation(`${serverUrl}/auth/github`);
            };

            button.classList.remove('authenticated');
        }

        // Remove loading state and add update animation
        button.classList.remove('auth-button-loading');
        button.classList.add('auth-button-updated');

        // Remove animation class after animation completes
        setTimeout(() => {
            button.classList.remove('auth-button-updated');
        }, 300);
    }, 100);
}

function updateCtaButton(selector, data) {
    const button = document.querySelector(selector);
    if (!button) return;

    if (data.isAuthenticated) {
        // Update to personalized dashboard button
        const fullUserName = data.user.displayName || data.user.username || 'User';
        const firstName = fullUserName.split(' ')[0] || 'User';
        // Use full name with proper greeting and ellipsis handling

        button.innerHTML = `
            <div class="btn-inner">
                <div class="o-hidden">
                    <div split-text="" stagger-text="" class="btn-txt cta-user-name" title="Welcome, ${firstName}!">Welcome, ${firstName}!</div>
                </div>
                <div class="btn-icon-w">
                    <div class="text-small btn-txt">-&gt;</div>
                </div>
            </div>
            <div class="btn-bg-w">
                <div class="btn-bg-fill"></div>
            </div>        `;
        button.href = '/profile';
        button.classList.add('cta-auth-welcome');

        // Add click event listener to ensure redirect works
        button.onclick = function (e) {
            e.preventDefault();
            window.location.href = '/profile';
        };
    } else {
        // Keep the "Join DevSync" button
        button.innerHTML = `
            <div class="btn-inner">
                <div class="o-hidden">
                    <div split-text="" stagger-text="" class="btn-txt">Join DevSync</div>
                </div>
                <div class="btn-icon-w">
                    <div class="text-small btn-txt">-&gt;</div>
                </div>
            </div>
            <div class="btn-bg-w">
                <div class="btn-bg-fill"></div>
            </div>
        `;
        button.href = `${serverUrl}/auth/github`;

        // Add click handler for animated auth
        button.onclick = function (e) {
            e.preventDefault();
            triggerAuthWithAnimation(`${serverUrl}/auth/github`);
        };
    }
}

function setLoginState() {
    // Fallback function to set all buttons to login state
    const buttons = [
        '#auth-button',
        '#menu-auth-button',
        '#footer-auth-button'
    ];

    buttons.forEach(selector => {
        const button = document.querySelector(selector);
        if (button) {
            button.href = `${serverUrl}/auth/github`;
        }
    });

    const ctaButtons = [
        '#cta-auth-button-1',
        '#cta-auth-button-2'
    ];

    ctaButtons.forEach(selector => {
        const button = document.querySelector(selector);
        if (button) {
            button.href = `${serverUrl}/auth/github`;
        }
    });
}

// Force page reload for internal navigation
function forceReloadOnNavigation() {
    // Get all internal navigation links
    const internalLinks = document.querySelectorAll('a[href*=".html"], a[href="/"], a[href^="/"][href$=".html"]');

    internalLinks.forEach(link => {
        // Skip external links and links that already have target="_blank"
        if (!link.target || link.target !== '_blank') {
            link.addEventListener('click', function (e) {
                const href = this.getAttribute('href');

                // Only handle internal pages (not external links or anchor links)
                if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
                    e.preventDefault();

                    // Force reload by setting window.location
                    window.location.href = href;
                }
            });
        }
    });
}

// Also force reload when using browser back/forward buttons
window.addEventListener('popstate', function (event) {
    // Force a full page reload
    window.location.reload();
});

// Check auth status when page loads
document.addEventListener('DOMContentLoaded', function () {
    // Mark the original page wipe element if it exists
    const originalPageWipe = document.querySelector('.page-wipe-w');
    if (originalPageWipe) {
        originalPageWipe.setAttribute('data-original', 'true');
    }

    // Add a small delay to ensure all elements are properly loaded
    setTimeout(checkAuthStatus, 100);

    // Initialize navigation reload functionality
    forceReloadOnNavigation();

    // Also check when the page becomes visible (for better SPA-like behavior)
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) {
            checkAuthStatus();
        }
    });
});

// Also call checkAuthStatus when navigating back to the page
window.addEventListener('pageshow', function (event) {
    checkAuthStatus();

    // Force reload if coming from cache
    if (event.persisted) {
        window.location.reload();
    }
});

// Handle authentication return with animation
handleAuthReturn();

