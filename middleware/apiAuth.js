const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

// Generate a secure API key (run this once to generate your key)
function generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
}

// Middleware to verify API key
const verifyApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const validApiKey = process.env.API_SECRET_KEY;
    
    if (!apiKey) {
        return res.status(401).json({
            success: false,
            message: 'API key is required. Please provide x-api-key header or apiKey query parameter.'
        });
    }
    
    if (apiKey !== validApiKey) {
        return res.status(403).json({
            success: false,
            message: 'Invalid API key. Access denied.'
        });
    }
    
    next();
};

// VPN-level authentication (more secure)
const verifyVpnKey = (req, res, next) => {
    const vpnKey = req.headers['x-vpn-key'];
    const validVpnKey = process.env.VPN_API_KEY;
    
    if (!vpnKey || vpnKey !== validVpnKey) {
        return res.status(403).json({
            success: false,
            message: 'VPN access required. Invalid or missing VPN key.'
        });
    }
    
    next();
};

// Rate limiting for API calls
const rateLimiter = {};
const RATE_LIMIT = 100; // requests per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

const rateLimit = (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    const currentTime = Date.now();
    
    if (!rateLimiter[clientIp]) {
        rateLimiter[clientIp] = { count: 1, resetTime: currentTime + RATE_WINDOW };
    } else if (currentTime > rateLimiter[clientIp].resetTime) {
        rateLimiter[clientIp] = { count: 1, resetTime: currentTime + RATE_WINDOW };
    } else {
        rateLimiter[clientIp].count++;
    }
    
    if (rateLimiter[clientIp].count > RATE_LIMIT) {
        return res.status(429).json({
            success: false,
            message: 'Rate limit exceeded. Please try again later.'
        });
    }
    
    next();
};

module.exports = {
    verifyApiKey,
    verifyVpnKey,
    rateLimit,
    generateApiKey
};