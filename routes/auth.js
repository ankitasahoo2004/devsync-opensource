const express = require('express');
const passport = require('passport');
const router = express.Router();

// GitHub authentication route
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

// GitHub callback route
router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res) => {
        // Successful authentication
        res.redirect(process.env.NODE_ENV === 'production'
            ? 'https://devsync-frontend.vercel.app/profile.html'
            : 'http://localhost:5500/profile.html');
    }
);

// Logout route
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.redirect(process.env.NODE_ENV === 'production'
            ? 'https://devsync-frontend.vercel.app'
            : 'http://localhost:5500');
    });
});

module.exports = router;
