const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Check if user is authenticated
router.get('/', (req, res) => {
    if (req.isAuthenticated() && req.user) {
        return res.json({
            isAuthenticated: true,
            user: req.user
        });
    } else {
        return res.json({ isAuthenticated: false });
    }
});

// Get user profile with GitHub data
router.get('/profile', async (req, res) => {
    try {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = req.user.id;
        const user = await User.findOne({ githubId: userId });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            points: user.points,
            badges: user.badges,
            mergedPRs: user.mergedPRs.length,
            cancelledPRs: user.cancelledPRs.length
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const users = await User.find({})
            .sort({ points: -1 })
            .limit(20)
            .select('username displayName avatarUrl points badges');

        res.json(users);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

module.exports = router;
