const express = require('express');
const User = require('../models/User');
const Repo = require('../models/Repo');
const app = express(); 
const dotenv = require('dotenv');
dotenv.config();

// Add global stats endpoint
app.get('/api/stats/global', async (req, res) => {
    try {
        // Get all users and accepted repos
        const [users, acceptedRepos] = await Promise.all([
            User.find({}),
            Repo.find({ reviewStatus: 'accepted' })
        ]);

        // Calculate total merged PRs
        const totalMergedPRs = users.reduce((total, user) => total + user.mergedPRs.length, 0);

        // Count active users (users with at least 1 merged PR)
        const activeUsers = users.filter(user => user.mergedPRs.length > 0).length;

        // Count registered repos
        const registeredRepos = acceptedRepos.length;

        res.json({
            totalMergedPRs,
            activeUsers,
            registeredRepos
        });
    } catch (error) {
        console.error('Error fetching global stats:', error);
        res.status(500).json({ error: 'Failed to fetch global stats' });
    }
});

module.exports = app;