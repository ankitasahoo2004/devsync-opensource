const config = {
    API_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
        : 'https://devsync-backend.vercel.app',
    FRONTEND_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5500'
        : 'https://devsync-frontend.vercel.app'
};

// Prevent accidental modifications
Object.freeze(config);

export default config;
