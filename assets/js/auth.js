const API_BASE_URL = 'https://devsync-fpekg0cggua3abdp.centralus-01.azurewebsites.net';

async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/user`, {
            credentials: 'include'
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Auth check failed:', error);
        return { isAuthenticated: false };
    }
}

// Update login redirect
function redirectToGitHubLogin() {
    window.location.href = `${API_BASE_URL}/auth/github`;
}

async function updateLoginButton() {
    const data = await checkAuthStatus();
    const loginButton = document.querySelector('.button.button--ghost');

    if (data.isAuthenticated) {
        // Create a more sophisticated profile button
        loginButton.className = 'nav__profile';
        loginButton.innerHTML = `
            <img src="${data.user.photos[0].value}" 
                 alt="Profile" 
                 class="nav__profile-img">
            <span class="nav__profile-name">${data.user.displayName}</span>
        `;
        loginButton.href = 'profile.html';
    } else {
        // Keep the original login button style
        loginButton.className = 'button button--ghost';
        loginButton.innerHTML = 'Login';
        loginButton.href = `${API_BASE_URL}/auth/github`;
    }
}

// Check auth status when page loads
document.addEventListener('DOMContentLoaded', updateLoginButton);
