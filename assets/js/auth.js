const CONFIG = {
    development: {
        apiUrl: 'http://localhost:3000'
    },
    production: {
        apiUrl: 'https://devsync-fpekg0cggua3abdp.centralus-01.azurewebsites.net'
    }
};

const environment = window.location.hostname === 'localhost' ? 'development' : 'production';
const apiUrl = CONFIG[environment].apiUrl;

async function checkAuthStatus() {
    try {
        const response = await fetch(`${apiUrl}/api/user`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        const data = await response.json();

        const loginButton = document.querySelector('.button.button--ghost');

        if (data.isAuthenticated) {
            loginButton.className = 'nav__profile';
            loginButton.innerHTML = `
                <img src="${data.user.photos[0].value}" 
                     alt="Profile" 
                     class="nav__profile-img">
                <span class="nav__profile-name">${data.user.displayName}</span>
            `;
            loginButton.href = 'profile.html';
        } else {
            loginButton.className = 'button button--ghost';
            loginButton.innerHTML = 'Login';
            loginButton.href = `${apiUrl}/auth/github`;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

document.addEventListener('DOMContentLoaded', checkAuthStatus);
