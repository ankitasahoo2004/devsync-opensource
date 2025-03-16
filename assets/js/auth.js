const API_BASE_URL = 'https://devsync-fpekg0cggua3abdp.centralus-01.azurewebsites.net';
// const API_BASE_URL = 'http://localhost:8000/auth/github';

// No require statements in browser JavaScript
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/user`, {
            method: 'GET',
            credentials: 'include',  // This ensures cookies are sent with the request
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
            // Removing mode: 'cors' as it might be causing issues with cookie handling
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Auth check failed:', error);
        return { isAuthenticated: false };
    }
}

// Update login redirect to use SameSite=None cookie
function redirectToGitHubLogin() {
    const loginUrl = `${API_BASE_URL}/auth/github`;

    // Add a timestamp parameter to prevent caching issues
    const timestampedUrl = `${loginUrl}?t=${Date.now()}`;
    window.location.href = timestampedUrl;
}

async function updateLoginButton() {
    const data = await checkAuthStatus();
    const loginButton = document.querySelector('.button.button--ghost');

    if (!loginButton) {
        console.warn('Login button not found in the DOM');
        return;
    }

    if (data.isAuthenticated && data.user) {
        // Check if user.photos exists before accessing it
        const avatarUrl = data.user.photos && data.user.photos[0] ?
            data.user.photos[0].value :
            'assets/img/default-avatar.png';

        // Create a more sophisticated profile button
        loginButton.className = 'nav__profile';
        loginButton.innerHTML = `
            <img src="${avatarUrl}" 
                 alt="Profile" 
                 class="nav__profile-img">
            <span class="nav__profile-name">${data.user.displayName || data.user.username}</span>
        `;
        loginButton.href = 'profile.html';
    } else {
        // Keep the original login button style
        loginButton.className = 'button button--ghost';
        loginButton.innerHTML = 'Login';
        loginButton.onclick = function (e) {
            e.preventDefault();
            redirectToGitHubLogin();
            return false;
        };
    }
}

// Export functions for use in other scripts
window.DevSyncAuth = {
    checkAuthStatus,
    redirectToGitHubLogin,
    updateLoginButton
};

// Check auth status when page loads
document.addEventListener('DOMContentLoaded', updateLoginButton);
