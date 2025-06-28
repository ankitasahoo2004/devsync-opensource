const crypto = require('crypto');

const securityConfig = {
    development: {
        apiKeyRequired: true,
        vpnKeyRequired: false,
        rateLimitEnabled: true,
        rateLimitRequests: 1000, // Higher limit for development
        rateLimitWindow: 60 * 60 * 1000 // 1 hour
    },
    production: {
        apiKeyRequired: true,
        vpnKeyRequired: true,
        rateLimitEnabled: true,
        rateLimitRequests: 100, // Lower limit for production
        rateLimitWindow: 60 * 60 * 1000, // 1 hour
        ipWhitelist: ['127.0.0.1', 'your-server-ip'] // Add your allowed IPs
    }
};

// IP whitelist middleware
const ipWhitelist = (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        const clientIp = req.ip || req.connection.remoteAddress;
        const allowedIps = securityConfig.production.ipWhitelist;
        
        if (!allowedIps.includes(clientIp)) {
            return res.status(403).json({
                success: false,
                message: 'IP address not authorized'
            });
        }
    }
    next();
};

module.exports = {
    securityConfig,
    ipWhitelist
};