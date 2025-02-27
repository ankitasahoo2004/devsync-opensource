const API_URL = 'https://devsync-backend.vercel.app';

async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_URL}/api/user`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Auth check failed');
        }

        const data = await response.json();
        const loginButton = document.querySelector('.button.button--ghost');

        updateUIBasedOnAuth(data, loginButton);
    } catch (error) {
        console.error('Auth check failed:', error);
        handleUnauthenticatedState();
    }
}

function updateUIBasedOnAuth(data, loginButton) {
    if (data.isAuthenticated && data.user) {
        // User is authenticated
        loginButton.className = 'nav__profile';
        loginButton.innerHTML = `
            <img src="${data.user.photos[0].value}" 
                 alt="Profile" 
                 class="nav__profile-img">
            <span class="nav__profile-name">${data.user.displayName || data.user.username}</span>
        `;
        loginButton.href = 'profile.html';

        // Store auth state
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userData', JSON.stringify(data.user));
    } else {
        handleUnauthenticatedState();
    }
}

function handleUnauthenticatedState() {
    const loginButton = document.querySelector('.button.button--ghost');
    loginButton.className = 'button button--ghost';
    loginButton.innerHTML = 'Login';
    loginButton.href = `${API_URL}/auth/github`;

    // Clear auth state
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userData');

    // Redirect to login if on protected pages
    const protectedPages = ['profile.html', 'projects.html'];
    const currentPage = window.location.pathname.split('/').pop();
    if (protectedPages.includes(currentPage)) {
        window.location.href = 'login.html';
    }
}

// Check auth status when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if we just returned from auth
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth') === 'success';

    if (authSuccess) {
        // Remove query params
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    checkAuthStatus();
});

// Recheck auth status when localStorage changes
window.addEventListener('storage', (event) => {
    if (event.key === 'isAuthenticated') {
        checkAuthStatus();
    }
});
