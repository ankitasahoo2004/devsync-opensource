const express = require('express');
const Repo = require('../models/Repo');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { normalizeAndValidateGitHubUrl } = require('../utils/githubUtils');
const router = express.Router();
const dotenv = require('dotenv');
dotenv.config();

router.post('/', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        let { repoLink, ownerName, technology, description } = req.body;

        if (!repoLink || !ownerName || !technology || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Normalize and validate repository URL
        try {
            repoLink = await normalizeAndValidateGitHubUrl(repoLink);
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }

        // Case-insensitive check for duplicate repository using normalized URL
        const existingProject = await Repo.findOne({
            repoLink: {
                $regex: new RegExp(`^${repoLink.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i')
            }
        });

        if (existingProject) {
            return res.status(400).json({
                error: 'This repository has already been submitted',
                status: existingProject.reviewStatus,
                submitDate: existingProject.submittedAt,
                submittedBy: existingProject.ownerName
            });
        }

        // Create project with normalized URL
        const projectData = {
            repoLink,
            ownerName,
            technology,
            description,
            userId: req.user.id,
            submittedAt: new Date()
        };

        const project = await Repo.create(projectData);

        // Send submission confirmation email
        const user = await User.findOne({ githubId: req.user.id });
        if (user) {
            await emailService.sendProjectSubmissionEmail(user.email, project);
        }

        res.status(201).json(project);
    } catch (error) {
        console.error('Error submitting project:', error);
        res.status(500).json({ error: 'Failed to submit project' });
    }
});

// Delete project route
router.delete('/:projectId', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const project = await Repo.findById(req.params.projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user is admin
        const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
        const isAdmin = adminIds.includes(req.user.username);

        // Allow deletion if user owns the project OR is an admin
        if (project.userId.toString() !== req.user.id && !isAdmin) {
            return res.status(403).json({ error: 'Not authorized to delete this project' });
        }

        // Find project owner before deletion
        const projectOwner = await User.findOne({ githubId: project.userId });

        // Delete the project
        await Repo.findByIdAndDelete(req.params.projectId);

        // Send deletion email if deleted by admin
        if (isAdmin && projectOwner) {
            await emailService.sendProjectDeletedEmail(
                projectOwner.email,
                project,
                req.user.username
            );
        }

        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

router.get('/:userId', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        // Verify the requested userId matches the authenticated user's id
        if (req.params.userId !== req.user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const projects = await Repo.find({ userId: req.params.userId })
            .select('repoLink ownerName technology description reviewStatus reviewedAt')
            .sort({ submittedAt: -1 });
        res.json(projects);
    } catch (error) {
        console.error('Error fetching user projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

module.exports = router;