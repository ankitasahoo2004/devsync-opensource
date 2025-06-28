const { verifyApiKey, verifyVpnKey, rateLimit } = require('./middleware/apiAuth');

/**
 * Security Configuration for DevSync API Routes
 * 
 * This file defines the security requirements for each route prefix.
 * Security levels:
 * - 'public': No API key required
 * - 'api-key': Requires API key authentication
 * - 'vpn-key': Requires VPN key authentication (highest security)
 * - 'session': Requires session authentication only (no API key)
 * - 'api-session': Requires both API key and session authentication
 */

const SECURITY_CONFIG = {
    // Auth routes - these should be public to allow login
    '/auth/github': 'public',
    '/auth/github/callback': 'public',
    '/auth/logout': 'public',
    
    // User authentication endpoints - these need to be accessible for login flow
    '/api/user': 'session', // Only require session, not API key
    
    // API routes that require API key
    '/api/leaderboard': 'api-key',
    '/api/events': 'api-key',
    '/api/accepted-projects': 'api-key',
    '/api/users': 'api-key', 
    '/api/stats': 'api-key',
    '/api/github': 'api-key',
    '/api/projects': 'api-key',
    '/api/sponsorship': 'api-key',
    '/api/tickets': 'api-key',
    
    // High-security routes requiring VPN key
    '/api/admin': 'vpn-key',
    
    // Special routes (handled separately)
    '/api/protected': 'api-key',
    '/api/vpn': 'vpn-key',
    
    // Health monitoring endpoint
    '/api/health': 'api-key'
};

/**
 * Apply security middleware to Express app
 * @param {Express} app - Express application instance
 */
function applySecurityMiddleware(app) {
    console.log('🔒 Applying API security middleware...');
    
    // Apply rate limiting to all API routes first
    app.use('/api', rateLimit);
    console.log('   ✅ Rate limiting applied to /api/*');
    
    // Apply security middleware for each route
    Object.entries(SECURITY_CONFIG).forEach(([routePath, securityLevel]) => {
        switch (securityLevel) {
            case 'api-key':
                app.use(routePath, verifyApiKey);
                console.log(`   🔑 API key required: ${routePath}`);
                break;
            case 'vpn-key':
                app.use(routePath, verifyVpnKey);
                console.log(`   🛡️  VPN key required: ${routePath}`);
                break;
            case 'session':
                // For session-only routes, we don't apply any middleware here
                // The routes themselves will check for authentication
                console.log(`   🔐 Session auth: ${routePath}`);
                break;
            case 'public':
                console.log(`   🌐 Public access: ${routePath}`);
                break;
            default:
                console.log(`   ⚠️  Unknown security level for ${routePath}: ${securityLevel}`);
        }
    });
    
    console.log('✅ Security middleware applied successfully\n');
}

/**
 * Get security level for a route
 * @param {string} routePath - The route path
 * @returns {string} Security level
 */
function getSecurityLevel(routePath) {
    return SECURITY_CONFIG[routePath] || 'unknown';
}

/**
 * Check if route requires authentication
 * @param {string} routePath - The route path
 * @returns {boolean} True if authentication required
 */
function requiresAuthentication(routePath) {
    const level = SECURITY_CONFIG[routePath];
    return level && level !== 'public';
}

/**
 * Get all routes and their security configuration
 * @returns {Object} Route security mapping
 */
function getAllRoutesSecurity() {
    return { ...SECURITY_CONFIG };
}

module.exports = {
    SECURITY_CONFIG,
    applySecurityMiddleware,
    getSecurityLevel,
    requiresAuthentication,
    getAllRoutesSecurity
};
