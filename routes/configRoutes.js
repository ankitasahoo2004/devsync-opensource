const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

const router = express.Router();

// Serve frontend configuration (non-sensitive environment variables only)
router.get('/', (req, res) => {
    const config = {
        serverUrl: process.env.SERVER_URL || process.env.FRONTEND_URL || 'http://localhost:3000',
        adminIds: process.env.ADMIN_GITHUB_IDS ? process.env.ADMIN_GITHUB_IDS.split(',') : []
    };
    
    res.json(config);
});

module.exports = router;
