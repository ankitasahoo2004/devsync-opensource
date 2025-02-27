const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : 'https://devsync-backend.vercel.app';

// Function to update UI based on auth state
function updateAuthUI(userData) {
    const loginButton = document.querySelector('.button.button--ghost');
    if (userData) {
        loginButton.className = 'nav__profile';
        loginButton.innerHTML = `
            <img src="${userData.avatarUrl}" 
                 alt="Profile" 
                 class="nav__profile-img">
            <span class="nav__profile-name">${userData.displayName}</span>
        `;
        loginButton.href = 'profile.html';
    } else {
        loginButton.className = 'button button--ghost';
        loginButton.innerHTML = 'Login';
        loginButton.href = `${API_URL}/auth/github`;
    }
}

// Function to check URL parameters for auth success
function checkAuthFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
        const userDataParam = urlParams.get('userData');
        if (userDataParam) {
            const userData = JSON.parse(decodeURIComponent(userDataParam));
            localStorage.setItem('userData', JSON.stringify(userData));
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

// Function to check auth state
async function checkAuthState() {
    try {
        // First check localStorage
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
            updateAuthUI(JSON.parse(storedUserData));
            return;
        }

        // If no stored data, check with server
        const response = await fetch(`${API_URL}/api/user`, {
            credentials: 'include'
        });
        const data = await response.json();

        if (data.isAuthenticated && data.user) {
            const userData = {
                id: data.user.id,
                username: data.user.username,
                displayName: data.user.displayName || data.user.username,
                avatarUrl: data.user.photos[0].value
            };
            localStorage.setItem('userData', JSON.stringify(userData));
            updateAuthUI(userData);
        } else {
            localStorage.removeItem('userData');
            updateAuthUI(null);
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('userData');
        updateAuthUI(null);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuthFromURL();
    checkAuthState();
});

// Handle logout
document.addEventListener('click', (e) => {
    if (e.target.matches('.logout-button')) {
        e.preventDefault();
        localStorage.removeItem('userData');
        window.location.href = `${API_URL}/logout`;
    }
});
