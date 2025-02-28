/**
 * Handles redirects between pages with proper state management
 */

/**
 * Redirects to a specified page while preserving auth state
 * @param {string} page - The page to redirect to
 * @param {Object} params - Optional URL parameters
 */
function redirectToPage(page, params = {}) {
    // Construct URL with parameters
    let url = page;
    if (Object.keys(params).length > 0) {
        const urlParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            urlParams.append(key, value);
        }
        url += '?' + urlParams.toString();
    }

    // Perform redirect
    window.location.href = url;
}

/**
 * Check if user has access to a protected page and redirect if needed
 * @param {boolean} requiresAuth - Whether the current page requires authentication
 */
function checkPageAccess(requiresAuth = false) {
    if (requiresAuth) {
        // Check if we have user data in localStorage
        const userData = localStorage.getItem('user');

        if (!userData || !JSON.parse(userData).isAuthenticated) {
            // Redirect to login page if not authenticated
            localStorage.setItem('redirect_after_login', window.location.href);
            redirectToPage('login.html', { message: 'Please log in to access this page' });
        }
    }
}

/**
 * Handle logout process
 */
function handleLogout() {
    // Clear user data from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');

    // Redirect to home page
    redirectToPage('index.html', { message: 'You have been logged out' });
}

// Export functions if using modules
if (typeof module !== 'undefined') {
    module.exports = {
        redirectToPage,
        checkPageAccess,
        handleLogout
    };
}
