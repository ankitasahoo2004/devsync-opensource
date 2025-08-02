const express = require('express');
const passport = require('passport');
const dotenv = require('dotenv');
const User = require('../models/User');
const emailService = require('../services/emailService');
const {
    createEmailVerificationToken,
    verifyEmailToken,
    resendVerificationEmail
} = require('../utils/emailVerification');
const { addEmailVerificationStatus } = require('../middleware/emailVerificationMiddleware');

dotenv.config();
const router = express.Router();

router.get('/github',
    passport.authenticate('github', { scope: ['user'] })
);

router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect(process.env.FRONTEND_URL);
    }
);

// Get current user's verification status
router.get('/verification-status', addEmailVerificationStatus, (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
        authenticated: true,
        emailVerificationStatus: req.emailVerificationStatus || {
            verified: false,
            verificationEmailSent: false,
            email: null
        }
    });
});

// Email verification endpoint
router.get('/verify-email', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({
                error: 'Verification token is required'
            });
        }

        const result = await verifyEmailToken(token);

        if (result.success) {
            // Send confirmation email
            await emailService.sendEmailVerifiedConfirmationEmail(
                result.user.email,
                result.user.username
            );

            // Redirect to success page or frontend
            res.redirect(`${process.env.FRONTEND_URL}?verification=success`);
        } else {
            res.status(400).json({
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error verifying email:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const result = await resendVerificationEmail(req.user.id);

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        // Generate new verification token
        const token = await createEmailVerificationToken(req.user.id);

        // Send verification email
        const emailResult = await emailService.sendEmailVerificationEmail(
            result.user.email,
            result.user.username,
            token
        );

        if (emailResult.success) {
            res.json({
                message: 'Verification email sent successfully',
                email: result.user.email
            });
        } else {
            res.status(500).json({
                error: 'Failed to send verification email'
            });
        }
    } catch (error) {
        console.error('Error resending verification email:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

module.exports = router;