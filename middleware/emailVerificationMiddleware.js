const User = require('../models/User');

/**
 * Middleware to check if user's email is verified
 * Blocks access to protected features if email is not verified
 */
const requireEmailVerification = async (req, res, next) => {
    try {
        // Check if user is authenticated first
        if (!req.isAuthenticated()) {
            return res.status(401).json({
                error: 'Authentication required',
                emailVerificationRequired: false
            });
        }

        // Get user data from database
        const user = await User.findOne({ githubId: req.user.id });

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                emailVerificationRequired: false
            });
        }

        // Check if email is verified
        if (!user.emailVerified) {
            return res.status(403).json({
                error: 'Email verification required',
                emailVerificationRequired: true,
                message: 'Please verify your email address to access this feature',
                userEmail: user.email,
                verificationEmailSent: user.verificationEmailSent || false
            });
        }

        // Email is verified, continue to next middleware
        req.verifiedUser = user; // Add verified user data to request
        next();
    } catch (error) {
        console.error('Error in email verification middleware:', error);
        res.status(500).json({
            error: 'Internal server error',
            emailVerificationRequired: false
        });
    }
};

/**
 * Middleware to add email verification status to user data
 * This doesn't block access but adds verification info
 */
const addEmailVerificationStatus = async (req, res, next) => {
    try {
        if (req.isAuthenticated()) {
            const user = await User.findOne({ githubId: req.user.id });
            if (user) {
                req.emailVerificationStatus = {
                    verified: user.emailVerified || false,
                    verificationEmailSent: user.verificationEmailSent || false,
                    verificationEmailSentAt: user.verificationEmailSentAt || null,
                    email: user.email
                };
            }
        }
        next();
    } catch (error) {
        console.error('Error adding email verification status:', error);
        next(); // Continue even if there's an error
    }
};

/**
 * Check if user is admin and has verified email
 */
const requireVerifiedAdmin = async (req, res, next) => {
    try {
        // First check authentication
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Check admin status
        const adminIds = process.env.ADMIN_GITHUB_IDS ? process.env.ADMIN_GITHUB_IDS.split(',') : [];
        if (!adminIds.includes(req.user.username)) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        // Get user data and check email verification
        const user = await User.findOne({ githubId: req.user.id });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.emailVerified) {
            return res.status(403).json({
                error: 'Email verification required for admin access',
                emailVerificationRequired: true,
                isAdmin: true
            });
        }

        req.verifiedAdmin = user;
        next();
    } catch (error) {
        console.error('Error in verified admin middleware:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    requireEmailVerification,
    addEmailVerificationStatus,
    requireVerifiedAdmin
};
