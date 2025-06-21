const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const path = require('path');
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');
const Repo = require('../models/Repo');
const User = require('../models/User');
const emailService = require('../services/emailService');
const app = express();
dotenv.config();
const router = express.Router();
const adminController = require('../controllers/adminController');

// Admin verification endpoint
app.get('/api/admin/verify', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ isAdmin: false });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    const isAdmin = adminIds.includes(req.user.username);

    res.json({ isAdmin });
});

// Admin projects endpoint
app.get('/api/admin/projects', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const allProjects = await Repo.find({}).sort({ submittedAt: -1 });
        res.json(allProjects);
    } catch (error) {
        console.error('Error fetching all projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});

// Add review project endpoint
app.post('/api/admin/projects/:projectId/review', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { status, rejectionReason } = req.body;
        const project = await Repo.findById(req.params.projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        project.reviewStatus = status;
        project.reviewedAt = new Date();
        project.reviewedBy = req.user.username;

        if (status === 'accepted') {
            project.successPoints = project.successPoints || 50;
        }

        await project.save();

        // Send appropriate email based on review status
        const projectOwner = await User.findOne({ githubId: project.userId });
        if (projectOwner) {
            if (status === 'accepted') {
                await emailService.sendProjectAcceptedEmail(projectOwner.email, project);
            } else if (status === 'rejected') {
                await emailService.sendProjectRejectedEmail(projectOwner.email, project, rejectionReason);
            }
        }

        res.json({
            ...project.toObject(),
            emailSent: true
        });
    } catch (error) {
        console.error('Error reviewing project:', error);
        res.status(500).json({ error: 'Failed to review project' });
    }
});

// Update points update endpoint
app.patch('/api/admin/projects/:projectId/points', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { successPoints } = req.body;
        const project = await Repo.findById(req.params.projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const previousPoints = project.successPoints || 50;
        project.successPoints = successPoints;
        await project.save();

        // Send points update email
        const projectOwner = await User.findOne({ githubId: project.userId });
        if (projectOwner) {
            await emailService.sendProjectPointsUpdateEmail(
                projectOwner.email,
                project,
                previousPoints,
                successPoints,
                req.user.username
            );
        }

        res.json(project);
    } catch (error) {
        console.error('Error updating project points:', error);
        res.status(500).json({ error: 'Failed to update project points' });
    }
});

// Admin endpoint to get pending PRs with enhanced formatting
app.get('/api/admin/pending-prs', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const pendingPRs = await PendingPR.find({ status: 'pending' })
            .sort({ submittedAt: -1 })
            .lean(); // Use lean() for better performance

        // Enrich with user data and ensure proper JSON formatting
        const enrichedPRs = await Promise.all(pendingPRs.map(async (pr) => {
            try {
                const user = await User.findOne({ githubId: pr.userId }).lean();

                // Ensure all fields are properly formatted for JSON
                const enrichedPR = {
                    _id: pr._id.toString(),
                    userId: pr.userId,
                    username: pr.username,
                    repoId: pr.repoId || pr.repoUrl,
                    repoUrl: pr.repoUrl,
                    prNumber: pr.prNumber,
                    title: pr.title,
                    mergedAt: pr.mergedAt.toISOString(),
                    suggestedPoints: pr.suggestedPoints || 50,
                    status: pr.status,
                    submittedAt: pr.submittedAt.toISOString(),
                    reviewedBy: pr.reviewedBy || null,
                    reviewedAt: pr.reviewedAt ? pr.reviewedAt.toISOString() : null,
                    rejectionReason: pr.rejectionReason || null,
                    user: {
                        avatar_url: user ? user.avatarUrl : `https://github.com/${pr.username}.png`,
                        login: pr.username,
                        displayName: user ? user.displayName : pr.username
                    },
                    repository: pr.repoUrl.replace('https://github.com/', '')
                };

                return enrichedPR;
            } catch (userError) {
                console.error(`Error enriching PR data for ${pr.username}:`, userError);

                // Return minimal data structure on error
                return {
                    _id: pr._id.toString(),
                    userId: pr.userId,
                    username: pr.username,
                    repoUrl: pr.repoUrl,
                    prNumber: pr.prNumber,
                    title: pr.title,
                    mergedAt: pr.mergedAt.toISOString(),
                    suggestedPoints: pr.suggestedPoints || 50,
                    status: pr.status,
                    submittedAt: pr.submittedAt.toISOString(),
                    user: {
                        avatar_url: `https://github.com/${pr.username}.png`,
                        login: pr.username,
                        displayName: pr.username
                    },
                    repository: pr.repoUrl.replace('https://github.com/', '')
                };
            }
        }));

        // Filter out any null results and ensure clean JSON
        const validPRs = enrichedPRs.filter(pr => pr !== null);

        res.json(validPRs);
    } catch (error) {
        console.error('Error fetching pending PRs:', error);
        res.status(500).json({ error: 'Failed to fetch pending PRs' });
    }
});

// Admin endpoint to approve PR
app.post('/api/admin/pr/:prId/approve', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const pendingPR = await PendingPR.findById(req.params.prId);
        if (!pendingPR) {
            return res.status(404).json({ error: 'PR not found' });
        }

        // Update PR status to approved
        pendingPR.status = 'approved';
        pendingPR.reviewedBy = req.user.username;
        pendingPR.reviewedAt = new Date();
        await pendingPR.save();

        // Update user's points and badges based on approved PRs
        const user = await User.findOne({ githubId: pendingPR.userId });
        if (user) {
            const approvedMergedPRs = await getApprovedMergedPRs(pendingPR.userId);
            user.mergedPRs = approvedMergedPRs;
            user.points = await calculatePointsFromApprovedPRs(pendingPR.userId);
            user.badges = await checkBadges(approvedMergedPRs, user.points);
            await user.save();
        }

        res.json({ message: 'PR approved successfully', pr: pendingPR });
    } catch (error) {
        console.error('Error approving PR:', error);
        res.status(500).json({ error: 'Failed to approve PR' });
    }
});

// Admin endpoint to reject PR
app.post('/api/admin/pr/:prId/reject', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { rejectionReason } = req.body;
        const pendingPR = await PendingPR.findById(req.params.prId);

        if (!pendingPR) {
            return res.status(404).json({ error: 'PR not found' });
        }

        // Update PR status to rejected
        pendingPR.status = 'rejected';
        pendingPR.reviewedBy = req.user.username;
        pendingPR.reviewedAt = new Date();
        pendingPR.rejectionReason = rejectionReason || 'No reason provided';
        await pendingPR.save();

        res.json({ message: 'PR rejected successfully', pr: pendingPR });
    } catch (error) {
        console.error('Error rejecting PR:', error);
        res.status(500).json({ error: 'Failed to reject PR' });
    }
});

// Admin endpoint to adjust PR points
app.patch('/api/admin/pr/:prId/points', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { points } = req.body;
        const pendingPR = await PendingPR.findById(req.params.prId);

        if (!pendingPR) {
            return res.status(404).json({ error: 'PR not found' });
        }

        pendingPR.suggestedPoints = points;
        await pendingPR.save();

        // If PR is already approved, update user points
        if (pendingPR.status === 'approved') {
            const user = await User.findOne({ githubId: pendingPR.userId });
            if (user) {
                user.points = await calculatePointsFromApprovedPRs(pendingPR.userId);
                await user.save();
            }
        }

        res.json({ message: 'Points updated successfully', pr: pendingPR });
    } catch (error) {
        console.error('Error updating points:', error);
        res.status(500).json({ error: 'Failed to update points' });
    }
});

// Admin endpoint to get rejected PRs
app.get('/api/admin/rejected-prs', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const rejectedPRs = await PendingPR.find({ status: 'rejected' })
            .sort({ reviewedAt: -1 });

        const enrichedPRs = await Promise.all(rejectedPRs.map(async (pr) => {
            const user = await User.findOne({ githubId: pr.userId });
            return {
                ...pr.toObject(),
                user: {
                    avatar_url: user ? user.avatarUrl : `https://github.com/${pr.username}.png`,
                    login: pr.username
                },
                repository: pr.repoUrl.replace('https://github.com/', '')
            };
        }));

        res.json(enrichedPRs);
    } catch (error) {
        console.error('Error fetching rejected PRs:', error);
        res.status(500).json({ error: 'Failed to fetch rejected PRs' });
    }
});

// Admin endpoint to delete rejected PR
app.delete('/api/admin/pr/:prId', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const pendingPR = await PendingPR.findById(req.params.prId);

        if (!pendingPR) {
            return res.status(404).json({ error: 'PR not found' });
        }

        if (pendingPR.status !== 'rejected') {
            return res.status(400).json({ error: 'Can only delete rejected PRs' });
        }

        await PendingPR.findByIdAndDelete(req.params.prId);
        res.json({ message: 'Rejected PR deleted successfully' });
    } catch (error) {
        console.error('Error deleting rejected PR:', error);
        res.status(500).json({ error: 'Failed to delete rejected PR' });
    }
});

// Admin endpoint to get all PRs (approved, pending, rejected)
app.get('/api/admin/all-prs', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const allPRs = await PendingPR.find({})
            .sort({ submittedAt: -1 })
            .lean();

        const enrichedPRs = await Promise.all(allPRs.map(async (pr) => {
            try {
                const user = await User.findOne({ githubId: pr.userId }).lean();

                return {
                    _id: pr._id.toString(),
                    userId: pr.userId,
                    username: pr.username,
                    repoId: pr.repoId || pr.repoUrl,
                    repoUrl: pr.repoUrl,
                    prNumber: pr.prNumber,
                    title: pr.title,
                    mergedAt: pr.mergedAt.toISOString(),
                    suggestedPoints: pr.suggestedPoints || 50,
                    status: pr.status,
                    submittedAt: pr.submittedAt.toISOString(),
                    reviewedBy: pr.reviewedBy || null,
                    reviewedAt: pr.reviewedAt ? pr.reviewedAt.toISOString() : null,
                    rejectionReason: pr.rejectionReason || null,
                    user: {
                        avatar_url: user ? user.avatarUrl : `https://github.com/${pr.username}.png`,
                        login: pr.username,
                        displayName: user ? user.displayName : pr.username
                    },
                    repository: pr.repoUrl.replace('https://github.com/', '')
                };
            } catch (userError) {
                console.error(`Error enriching PR data for ${pr.username}:`, userError);
                return {
                    _id: pr._id.toString(),
                    userId: pr.userId,
                    username: pr.username,
                    repoUrl: pr.repoUrl,
                    prNumber: pr.prNumber,
                    title: pr.title,
                    mergedAt: pr.mergedAt.toISOString(),
                    suggestedPoints: pr.suggestedPoints || 50,
                    status: pr.status,
                    submittedAt: pr.submittedAt.toISOString(),
                    user: {
                        avatar_url: `https://github.com/${pr.username}.png`,
                        login: pr.username,
                        displayName: pr.username
                    },
                    repository: pr.repoUrl.replace('https://github.com/', '')
                };
            }
        }));

        const validPRs = enrichedPRs.filter(pr => pr !== null);
        res.json(validPRs);
    } catch (error) {
        console.error('Error fetching all PRs:', error);
        res.status(500).json({ error: 'Failed to fetch all PRs' });
    }
});

// Add dedicated admin users endpoint with comprehensive data
app.get('/api/admin/users', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        // Fetch all users with comprehensive data
        const users = await User.find({})
            .select('githubId username displayName email avatarUrl mergedPRs cancelledPRs points totalPoints badges badge isAdmin createdAt lastLogin welcomeEmailSent')
            .sort({ createdAt: -1 })
            .lean();

        // Get admin usernames for comparison
        const adminUsernames = process.env.ADMIN_GITHUB_IDS.split(',');

        // Enrich user data with additional statistics
        const enrichedUsers = await Promise.all(users.map(async (user) => {
            try {
                // Get pending PRs count for this user
                const pendingPRsCount = await PendingPR.countDocuments({
                    $or: [
                        { userId: user.githubId },
                        { username: user.username }
                    ],
                    status: 'pending'
                });

                // Get approved PRs count
                const approvedPRsCount = await PendingPR.countDocuments({
                    $or: [
                        { userId: user.githubId },
                        { username: user.username }
                    ],
                    status: 'approved'
                });

                // Get rejected PRs count
                const rejectedPRsCount = await PendingPR.countDocuments({
                    $or: [
                        { userId: user.githubId },
                        { username: user.username }
                    ],
                    status: 'rejected'
                });

                // Calculate total points from approved PRs (more accurate)
                const approvedPRs = await PendingPR.find({
                    $or: [
                        { userId: user.githubId },
                        { username: user.username }
                    ],
                    status: 'approved'
                }).select('suggestedPoints').lean();

                const calculatedPoints = approvedPRs.reduce((sum, pr) => sum + (pr.suggestedPoints || 50), 0);

                // Get current badge based on points
                const currentBadge = await getCurrentBadge(calculatedPoints);

                return {
                    _id: user._id,
                    githubId: user.githubId,
                    username: user.username || 'unknown',
                    displayName: user.displayName || user.username || 'Unknown User',
                    email: user.email || 'No email provided',
                    avatarUrl: user.avatarUrl || `https://github.com/${user.username || 'unknown'}.png`,
                    isAdmin: adminUsernames.includes(user.username),

                    // Points and achievements
                    points: user.points || 0,
                    totalPoints: calculatedPoints, // More accurate calculation
                    badge: currentBadge,
                    badges: user.badges || ['Newcomer'],

                    // PR Statistics
                    mergedPRs: user.mergedPRs || [],
                    cancelledPRs: user.cancelledPRs || [],
                    pendingPRsCount,
                    approvedPRsCount,
                    rejectedPRsCount,
                    totalPRsSubmitted: pendingPRsCount + approvedPRsCount + rejectedPRsCount,

                    // Activity information
                    createdAt: user.createdAt || new Date(),
                    lastLogin: user.lastLogin || null,
                    welcomeEmailSent: user.welcomeEmailSent || false,

                    // Profile completeness
                    profileCompleteness: calculateProfileCompleteness(user),

                    // Activity status
                    isActive: (user.mergedPRs && user.mergedPRs.length > 0) || approvedPRsCount > 0,
                    isNewUser: user.createdAt && (Date.now() - new Date(user.createdAt).getTime()) < (30 * 24 * 60 * 60 * 1000) // 30 days
                };
            } catch (userError) {
                console.error(`Error enriching user data for ${user.username}:`, userError);

                // Return basic user data on error
                return {
                    _id: user._id,
                    githubId: user.githubId,
                    username: user.username || 'unknown',
                    displayName: user.displayName || user.username || 'Unknown User',
                    email: user.email || 'No email provided',
                    avatarUrl: user.avatarUrl || `https://github.com/${user.username || 'unknown'}.png`,
                    isAdmin: adminUsernames.includes(user.username),
                    points: user.points || 0,
                    totalPoints: user.totalPoints || user.points || 0,
                    badge: user.badge || 'Beginner',
                    badges: user.badges || ['Newcomer'],
                    mergedPRs: user.mergedPRs || [],
                    cancelledPRs: user.cancelledPRs || [],
                    pendingPRsCount: 0,
                    approvedPRsCount: 0,
                    rejectedPRsCount: 0,
                    totalPRsSubmitted: 0,
                    createdAt: user.createdAt || new Date(),
                    lastLogin: user.lastLogin || null,
                    welcomeEmailSent: user.welcomeEmailSent || false,
                    profileCompleteness: calculateProfileCompleteness(user),
                    isActive: false,
                    isNewUser: false,
                    error: 'Partial data due to processing error'
                };
            }
        }));

        // Sort by creation date (newest first) and add additional metadata
        const sortedUsers = enrichedUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Add summary statistics
        const summary = {
            totalUsers: enrichedUsers.length,
            adminUsers: enrichedUsers.filter(u => u.isAdmin).length,
            activeUsers: enrichedUsers.filter(u => u.isActive).length,
            newUsers: enrichedUsers.filter(u => u.isNewUser).length,
            usersWithPendingPRs: enrichedUsers.filter(u => u.pendingPRsCount > 0).length,
            usersWithPoints: enrichedUsers.filter(u => u.totalPoints > 0).length,
            totalPointsAwarded: enrichedUsers.reduce((sum, u) => sum + u.totalPoints, 0),
            totalPRsSubmitted: enrichedUsers.reduce((sum, u) => sum + u.totalPRsSubmitted, 0)
        };

        res.json({
            users: sortedUsers,
            summary,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching admin users:', error);
        res.status(500).json({
            error: 'Failed to fetch users',
            details: error.message
        });
    }
});

// Add PR submission endpoint for advanced scanner
router.post('/submit-pr', adminController.submitPr);
// app.post('/api/admin/submit-pr', async (req, res) => {
//     if (!req.isAuthenticated()) {
//         return res.status(401).json({ error: 'Unauthorized' });
//     }

//     const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
//     if (!adminIds.includes(req.user.username)) {
//         return res.status(403).json({ error: 'Not authorized' });
//     }

//     try {
//         const { userId, username, repoUrl, prNumber, title, mergedAt } = req.body;        // Check if this PR already exists - use more comprehensive duplicate checking
//         const existingPR = await PendingPR.findOne({
//             $or: [
//                 { userId: userId, repoUrl: repoUrl, prNumber: prNumber },
//                 { username: username, repoUrl: repoUrl, prNumber: prNumber }
//             ]
//         });

//         if (existingPR) {
//             return res.status(409).json({
//                 error: 'PR already exists',
//                 pr: existingPR
//             });
//         }

//         // Get repo details for suggested points
//         const repo = await Repo.findOne({ repoLink: repoUrl });
//         const suggestedPoints = repo ? repo.successPoints || 50 : 50;

//         const pendingPR = await PendingPR.create({
//             userId: userId,
//             username: username,
//             repoId: repoUrl,
//             repoUrl: repoUrl,
//             prNumber: prNumber,
//             title: title,
//             mergedAt: new Date(mergedAt),
//             suggestedPoints: suggestedPoints
//         });

//         res.status(201).json({
//             message: 'PR submitted for approval',
//             pr: pendingPR
//         });
//     } catch (error) {
//         console.error('Error submitting PR:', error);
//         res.status(500).json({
//             error: 'Failed to submit PR',
//             details: error.message
//         });
//     }
// });

router.post('/sync-pending-prs', adminController.syncPendingPRs);
// Add new endpoint for PendingPR to User table synchronization
// app.post('/api/admin/sync-pending-prs', async (req, res) => {
//     if (!req.isAuthenticated()) {
//         return res.status(401).json({ error: 'Unauthorized' });
//     }

//     const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
//     if (!adminIds.includes(req.user.username)) {
//         return res.status(403).json({ error: 'Not authorized' });
//     }

//     try {
//         console.log(`Admin ${req.user.username} initiated PendingPR to User sync`);

//         // Optional: Create backup before sync
//         if (req.body.createBackup) {
//             await dbSync.backupUserTable();
//         }

//         // Perform the synchronization
//         const syncResults = await dbSync.syncPendingPRsToUserTable();

//         // Validate integrity after sync
//         const validation = await dbSync.validateSyncIntegrity();

//         const duration = syncResults.endTime - syncResults.startTime;

//         res.json({
//             success: true,
//             message: 'PendingPR to User table synchronization completed',
//             results: {
//                 ...syncResults,
//                 duration: `${Math.round(duration / 1000)}s`,
//                 validation
//             },
//             timestamp: new Date().toISOString(),
//             performedBy: req.user.username
//         });

//     } catch (error) {
//         console.error('PendingPR sync failed:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to sync PendingPR data to User table',
//             details: error.message,
//             timestamp: new Date().toISOString()
//         });
//     }
// });

// Add admin email sending endpoint
app.post('/api/admin/send-email', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { to, subject, message, recipientName, templateData } = req.body;

        // Validate required fields
        if (!to || !subject || !message) {
            return res.status(400).json({
                error: 'Missing required fields',
                details: 'Recipient email, subject, and message are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return res.status(400).json({
                error: 'Invalid email format'
            });
        }

        // Send the email using the EmailService
        const emailService = require('./services/emailService');
        const result = await emailService.sendMessageEmail(
            to,
            recipientName || 'DevSync User',
            subject,
            message,
            templateData
        );

        res.status(200).json({
            success: true,
            message: 'Email sent successfully',
            result: {
                messageId: result.messageId,
                recipient: result.recipient,
                subject: result.subject,
                sentAt: new Date().toISOString(),
                sentBy: req.user.username
            }
        });

    } catch (error) {
        console.error('Error in admin email sending:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send email',
            details: error.message
        });
    }
});

// Add admin user update endpoint
app.patch('/api/admin/users/:userId', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');

    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { userId } = req.params;
        const updates = req.body;

        // Validate input
        if (updates.totalPoints && updates.totalPoints < 0) {
            return res.status(400).json({ error: 'Points cannot be negative' });
        }

        if (updates.email && !isValidEmail(updates.email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Find and update user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Apply updates
        const allowedUpdates = [
            'displayName', 'email', 'avatarUrl', 'totalPoints',
            'badge', 'welcomeEmailSent', 'isActive', 'adminNotes'
        ];

        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                if (field === 'totalPoints') {
                    user.points = updates[field];
                } else {
                    user[field] = updates[field];
                }
            }
        });

        // Update badges if points changed
        if (updates.totalPoints !== undefined) {
            user.badges = await checkBadges(user.mergedPRs || [], updates.totalPoints);
        }

        user.lastModified = new Date();
        user.lastModifiedBy = req.user.username;

        await user.save();

        res.json({
            success: true,
            message: 'User updated successfully',
            user: {
                _id: user._id,
                displayName: user.displayName,
                email: user.email,
                avatarUrl: user.avatarUrl,
                points: user.points,
                badge: user.badge,
                welcomeEmailSent: user.welcomeEmailSent,
                isActive: user.isActive,
                adminNotes: user.adminNotes
            }
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            error: 'Failed to update user',
            details: error.message
        });
    }
});

// Reset user authentication endpoint
app.post('/api/admin/users/:userId/reset-auth', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Clear any session data for this user (implementation depends on session store)
        // For now, we'll just update a flag
        user.authResetAt = new Date();
        user.authResetBy = req.user.username;
        await user.save();

        res.json({
            success: true,
            message: 'User authentication reset successfully'
        });

    } catch (error) {
        console.error('Error resetting user auth:', error);
        res.status(500).json({ error: 'Failed to reset user authentication' });
    }
});

// Resync user data endpoint
app.post('/api/admin/users/:userId/resync', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Resync PR data for this user
        const prData = await fetchPRDetails(user.username);
        const newSubmissions = [];

        const acceptedRepos = await Repo.find({ reviewStatus: 'accepted' }, 'repoLink').lean();

        for (const pr of prData.items) {
            const [owner, repo] = pr.repository_url.split('/repos/')[1].split('/');
            const repoUrl = `https://github.com/${owner}/${repo}`;

            const registeredRepo = acceptedRepos.find(repo => repo.repoLink === repoUrl);

            if (registeredRepo) {
                const existingPR = await PendingPR.findOne({
                    userId: user.githubId,
                    repoUrl: repoUrl,
                    prNumber: pr.number
                });

                if (!existingPR) {
                    const prDetails = await octokit.pulls.get({
                        owner,
                        repo,
                        pull_number: pr.number
                    });

                    if (prDetails.data.merged) {
                        const submission = await submitPRForApproval(
                            user.githubId,
                            user.username,
                            repoUrl,
                            prDetails.data
                        );

                        if (submission) {
                            newSubmissions.push(submission);
                        }
                    }
                }
            }
        }

        res.json({
            success: true,
            message: 'User data resynchronized successfully',
            newPRs: newSubmissions.length
        });

    } catch (error) {
        console.error('Error resyncing user data:', error);
        res.status(500).json({ error: 'Failed to resync user data' });
    }
});

// Resend welcome email endpoint
app.post('/api/admin/users/:userId/welcome-email', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.email) {
            return res.status(400).json({ error: 'User has no email address' });
        }

        // Send welcome email
        const emailSent = await emailService.sendWelcomeEmail(user.email, user.username);

        if (emailSent) {
            user.welcomeEmailSent = true;
            user.welcomeEmailSentAt = new Date();
            await user.save();
        }

        res.json({
            success: true,
            message: 'Welcome email sent successfully'
        });

    } catch (error) {
        console.error('Error sending welcome email:', error);
        res.status(500).json({ error: 'Failed to send welcome email' });
    }
});

// Suspend user endpoint
app.post('/api/admin/users/:userId/suspend', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if trying to suspend an admin
        if (adminIds.includes(user.username)) {
            return res.status(403).json({ error: 'Cannot suspend admin users' });
        }

        user.isActive = false;
        user.suspendedAt = new Date();
        user.suspendedBy = req.user.username;
        await user.save();

        res.json({
            success: true,
            message: 'User suspended successfully'
        });

    } catch (error) {
        console.error('Error suspending user:', error);
        res.status(500).json({ error: 'Failed to suspend user' });
    }
});

// Delete user endpoint
app.delete('/api/admin/users/:userId', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if trying to delete an admin
        if (adminIds.includes(user.username)) {
            return res.status(403).json({ error: 'Cannot delete admin users' });
        }

        // Delete associated data
        await PendingPR.deleteMany({
            $or: [
                { userId: user.githubId },
                { username: user.username }
            ]
        });

        // Delete user
        await User.findByIdAndDelete(userId);

        res.json({
            success: true,
            message: 'User and associated data deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = app;