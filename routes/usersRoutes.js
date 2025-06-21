const express = require('express');
const User = require('../models/User');
const app = express();
const dotenv = require('dotenv');
dotenv.config();

app.get('/api/users', async (req, res) => {
    try {
        const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
        const users = await User.find({}, 'username displayName avatarUrl email')
            .sort({ username: 1 });

        const enrichedUsers = users.map(user => ({
            ...user.toObject(),
            isAdmin: adminIds.includes(user.username)
        }));

        res.json(enrichedUsers);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

module.exports = app;