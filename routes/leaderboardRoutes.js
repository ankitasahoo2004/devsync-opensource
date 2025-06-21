const express = require('express');
const User = require('../models/User');
const { calculateTrends } = require('../utils/trendCalculator');
const app = express();
const dotenv = require('dotenv');
dotenv.config();

// Update leaderboard endpoint
app.get('/api/leaderboard', async (req, res) => {
    try {
        // Add cache control headers
        res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        const users = await User.find({})
            .select('username points badges mergedPRs')
            .lean();

        // Format user data with required fields only
        let formattedUsers = users.map(user => ({
            username: user.username,
            points: user.points || 0,
            mergedPRs: (user.mergedPRs || []).map(pr => ({
                title: pr.title,
                mergedAt: pr.mergedAt
            })),
            badges: user.badges || ['Newcomer'],
            trend: 0
        }));

        // Calculate and add trends
        formattedUsers = await calculateTrends(formattedUsers);

        // Sort by points and add ranks
        formattedUsers.sort((a, b) => b.points - a.points);
        formattedUsers = formattedUsers.map((user, index) => ({
            ...user,
            rank: index + 1
        }));

        res.json(formattedUsers);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

module.exports = app;