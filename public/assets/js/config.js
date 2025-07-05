// API Configuration
const API_CONFIG = {
    // Server URLs - uncomment the one you want to use
    // serverUrl: 'https://devsync-opensource.tech',
    serverUrl: 'https://www.devsync.club',
    // serverUrl: 'http://localhost:3000',

    // API Endpoints
    endpoints: {
        contact: '/api/contact/inquiry',
        sponsorship: '/api/sponsorship/inquiry',
        user: '/api/user',
        tickets: '/api/tickets',
        myTickets: '/api/tickets/my',
        adminVerify: '/api/admin/verify'
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
} else {
    window.API_CONFIG = API_CONFIG;
}
