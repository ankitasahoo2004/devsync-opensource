async function checkAuthStatus() {
    try {
        // Show loading state
        const loginButton = document.querySelector('.button.button--ghost') ||
            document.querySelector('.nav__profile');

        if (loginButton) {
            loginButton.classList.add('loading');
        }

        const response = await fetch('https://devsync-backend-6fe4.onrender.com/api/user', {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Auth status:', data);

        if (loginButton) {
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

                // Store user info in localStorage for other pages
                localStorage.setItem('user', JSON.stringify({
                    name: data.user.displayName,
                    avatar: data.user.photos[0].value,
                    isAuthenticated: true
                }));
            } else {
                // Keep the original login button style
                loginButton.className = 'button button--ghost';
                loginButton.innerHTML = 'Login';
                loginButton.href = 'login.html';

                // Clear user info
                localStorage.removeItem('user');
            }

            // Remove loading state
            loginButton.classList.remove('loading');
        }

        return data.isAuthenticated;
    } catch (error) {
        console.error('Auth check failed:', error);

        // Handle error and reset button
        const loginButton = document.querySelector('.button.button--ghost') ||
            document.querySelector('.nav__profile');
        if (loginButton) {
            loginButton.className = 'button button--ghost';
            loginButton.innerHTML = 'Login';
            loginButton.href = 'login.html';
            loginButton.classList.remove('loading');
        }

        // Check if we have cached user data to fall back on
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
            try {
                const userData = JSON.parse(cachedUser);
                if (userData.isAuthenticated) {
                    // Use cached data
                    updateUIWithUserData(userData);
                    return true;
                }
            } catch (e) {
                console.error('Failed to parse cached user data:', e);
                localStorage.removeItem('user');
            }
        }

        return false;
    }
}

// Update UI with user data
function updateUIWithUserData(userData) {
    const loginButton = document.querySelector('.button.button--ghost') ||
        document.querySelector('.nav__profile');

    if (loginButton && userData.isAuthenticated) {
        loginButton.className = 'nav__profile';
        loginButton.innerHTML = `
            <img src="${userData.avatar}" 
                 alt="Profile" 
                 class="nav__profile-img">
            <span class="nav__profile-name">${userData.name}</span>
        `;
        loginButton.href = 'profile.html';
    }
}

// Check for auth token in URL (for OAuth callback)
function checkAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);

    // Check for token in URL (from backend callback)
    if (urlParams.has('token')) {
        const token = urlParams.get('token');

        // Store token in localStorage
        localStorage.setItem('auth_token', token);

        // Remove token from URL
        window.history.replaceState({}, document.title, window.location.pathname);

        // Check for redirect destination
        const redirectUrl = localStorage.getItem('redirect_after_login') || 'profile.html';
        window.location.href = redirectUrl;

        return true;
    }

    // Check for authorization code (GitHub OAuth callback)
    if (urlParams.has('code')) {
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        console.log('Received OAuth code:', code);

        // Exchange code for token (this should be handled by the backend)
        // In the meantime, show the user we're processing the login
        document.getElementById('login-status').style.display = 'block';

        // The backend should redirect back with a token
        return true;
    }

    return false;
}

// Initialize auth check on non-login pages
if (!window.location.pathname.includes('login.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        checkAuthStatus();
    });
}
