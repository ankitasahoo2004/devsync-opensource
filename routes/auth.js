const express = require('express');
const passport = require('passport');
const router = express.Router();

// GitHub authentication route
router.get('/github', passport.authenticate('github', {
    scope: ['user:email'],
    prompt: 'consent'
}));

// GitHub callback route with proper error handling
router.get('/github/callback',
    passport.authenticate('github', {
        failureRedirect: '/'
    }),
    (req, res) => {
        // Successful authentication
        const redirectUrl = process.env.NODE_ENV === 'production'
            ? 'https://devsync-frontend.vercel.app/profile.html'
            : 'http://localhost:5500/profile.html';

        res.redirect(redirectUrl);
    }
);

// Logout route
router.get('/logout', (req, res) => {
    req.logout(function (err) {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.redirect(process.env.NODE_ENV === 'production'
            ? 'https://devsync-frontend.vercel.app'
            : 'http://localhost:5500');
    });
});

// Auth status check
router.get('/status', (req, res) => {
    res.json({
        isAuthenticated: req.isAuthenticated(),
        user: req.user ? {
            username: req.user.username,
            displayName: req.user.displayName
        } : null
    });
});

module.exports = router;
