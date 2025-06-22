const express = require('express');
const User = require('../models/User');
const router = express.Router();
const dotenv = require('dotenv');
dotenv.config();

router.get('/', async (req, res) => {
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

module.exports = router;