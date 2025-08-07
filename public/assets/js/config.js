// API Configuration
const API_CONFIG = {
    // Server URLs - dynamically set by config service
    serverUrl: window.location.origin, // fallback, will be updated by config service

    // API Endpoints
    endpoints: {
        contact: '/api/contact/inquiry',
        sponsorship: '/api/sponsorship/inquiry',
        user: '/api/user',
        tickets: '/api/tickets',
        myTickets: '/api/tickets/my',
        adminVerify: '/api/admin/verify',
        config: '/api/config'
    }
};

// Load configuration from backend when available
if (window.configService) {
    window.configService.loadConfig().then(config => {
        API_CONFIG.serverUrl = config.serverUrl;
    }).catch(error => {
        console.warn('Failed to load server config, using default:', error);
    });
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
} else {
    window.API_CONFIG = API_CONFIG;
}
