const express = require('express');
const Repo = require('../models/Repo');
const app = express();
const dotenv = require('dotenv');
dotenv.config();

// Get all accepted projects
app.get('/api/accepted-projects', async (req, res) => {
    try {
        const projects = await Repo.find({ reviewStatus: 'accepted' })
            .select('repoLink ownerName technology description reviewStatus reviewedAt')
            .sort({ submittedAt: -1 });
        res.json(projects);
    } catch (error) {
        console.error('Error fetching accepted projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

module.exports = app;