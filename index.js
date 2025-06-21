require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { Octokit } = require('@octokit/rest');
const User = require('./models/User');
const Repo = require('./models/Repo');
const Event = require('./models/Event');
const PendingPR = require('./models/PendingPR');
const Ticket = require('./models/Ticket'); // Add Ticket model
const MongoStore = require('connect-mongo');
const emailService = require('./services/emailService');
const dbSync = require('./utils/dbSync');
const PORT = process.env.PORT || 5500;
const serverUrl = process.env.SERVER_URL;

const app = express();

// DevSync program start date - all contributions are tracked from this date
const PROGRAM_START_DATE = '2025-03-14';

// Create authenticated Octokit instance
const octokit = new Octokit({
    auth: process.env.GITHUB_ACCESS_TOKEN
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB');

        // Clean up old indexes that might cause issues
        try {
            const Ticket = require('./models/Ticket');
            await Ticket.cleanupOldIndexes();

            // Also try to drop the specific problematic index
            try {
                await mongoose.connection.db.collection('tickets').dropIndex('ticketId_1');
                console.log('Dropped problematic ticketId_1 index');
            } catch (dropError) {
                console.log('Note: ticketId_1 index may not exist or was already dropped');
            }
        } catch (error) {
            console.log('Note: Could not clean up old indexes:', error.message);
        }
    })
    .catch(err => console.error('MongoDB connection error:', err));

// Calculate points based on contributions from registered repos
async function calculatePoints(mergedPRs, userId) {
    try {
        let totalPoints = 0;

        // Calculate points for merged PRs only
        for (const pr of mergedPRs) {
            const repo = await Repo.findOne({ repoLink: pr.repoId });
            if (repo) {
                // Skip points if user is the maintainer
                if (repo.userId === userId) {
                    continue;
                }
                totalPoints += repo.successPoints || 50;
            }
        }

        return totalPoints;
    } catch (error) {
        console.error('Error calculating points:', error);
        return 0;
    }
}

// Check and assign badges based on valid contributions
async function checkBadges(mergedPRs, points) {
    try {
        const registeredRepos = await Repo.find({}, 'repoLink');
        const registeredRepoIds = registeredRepos.map(repo => repo.repoLink);
        const validMergedPRsCount = mergedPRs.filter(pr => registeredRepoIds.includes(pr.repoId)).length;

        const badges = ['Newcomer'];
        const levelBadges = [];

        // Contribution badges
        if (validMergedPRsCount >= 1) badges.push('First Contribution');
        if (validMergedPRsCount >= 5) badges.push('Active Contributor');
        if (validMergedPRsCount >= 10) badges.push('Super Contributor');

        // Level badges - add all badges up to current points level
        if (points >= 0) levelBadges.push('Cursed Newbie | Just awakened.....');
        if (points >= 100) levelBadges.push('Graveyard Shifter | Lost but curious');
        if (points >= 250) levelBadges.push('Night Stalker | Shadows are friends');
        if (points >= 500) levelBadges.push('Skeleton of Structure | Casts magic on code');
        if (points >= 1000) levelBadges.push('Phantom Architect | Builds from beyond');
        if (points >= 2000) levelBadges.push('Haunted Debugger | Haunting every broken line');
        if (points >= 3500) levelBadges.push('Lord of Shadows | Master of the unseen');
        if (points >= 5000) levelBadges.push('Dark Sorcerer | Controls the dark arts');
        if (points >= 7500) levelBadges.push('Demon Crafter | Shapes the cursed world');
        if (points >= 10000) levelBadges.push('Eternal Revenge | Undying ghost');

        return [...badges, ...levelBadges];
    } catch (error) {
        console.error('Error checking badges:', error);
        return ['Newcomer'];
    }
}

// Update user data when PRs are merged or cancelled
async function updateUserPRStatus(userId, repoId, prData, status) {
    try {
        const user = await User.findOne({ githubId: userId });
        if (!user) return;

        if (status === 'merged') {
            user.mergedPRs.push({
                repoId,
                prNumber: prData.number,
                title: prData.title,
                mergedAt: new Date()
            });
        }

        user.points = await calculatePoints(user.mergedPRs, user.githubId);
        user.badges = await checkBadges(user.mergedPRs, user.points);

        await user.save();
    } catch (error) {
        console.error('Error updating user PR status:', error);
    }
}

// Middleware setup
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));
app.use(cors({
    origin: [serverUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));

// Added
app.use(session({
    secret: process.env.SESSION_SECRET || 'your_session_secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60, // Session TTL in seconds (1 day)
        autoRemove: 'native' // Enable automatic removal of expired sessions
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    },
    name: 'devsync.sid' // Custom session cookie name
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL,
    scope: ['user', 'user:email']  // Add email scope
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Create Octokit instance with the user's access token
        const userOctokit = new Octokit({
            auth: accessToken
        });

        // Try to get authenticated user's emails with the updated endpoint
        let primaryEmail;
        try {
            const { data: emails } = await userOctokit.rest.users.listEmailsForAuthenticatedUser();
            primaryEmail = emails.find(email => email.primary)?.email;

            if (!primaryEmail) {
                // Fallback to public email if available
                const { data: userData } = await userOctokit.rest.users.getAuthenticated();
                primaryEmail = userData.email;
            }
        } catch (emailError) {
            console.error('Error fetching user emails:', emailError);
            // Fallback to profile email if available
            primaryEmail = profile.emails?.[0]?.value;
        }

        if (!primaryEmail) {
            return done(new Error('No email found for user'));
        }

        let user = await User.findOne({ githubId: profile.id });

        if (!user) {
            // Create new user with verified email
            user = await User.create({
                githubId: profile.id,
                username: profile.username,
                displayName: profile.displayName,
                email: primaryEmail,
                avatarUrl: profile.photos?.[0]?.value || '',
                mergedPRs: [],
                cancelledPRs: [],
                points: 0,
                badges: ['Newcomer']
            });

            // Send welcome email only for new users
            const emailSent = await emailService.sendWelcomeEmail(primaryEmail, profile.username);
            if (emailSent) {
                user.welcomeEmailSent = true;
                await user.save();
            }
        }

        return done(null, { ...profile, userData: user });
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Auth routes
app.get('/auth/github',
    passport.authenticate('github', { scope: ['user'] })
);

app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect(process.env.FRONTEND_URL);
    }
);

app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            isAuthenticated: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                displayName: req.user.displayName,
                photos: req.user.photos
            }
        });
    } else {
        res.json({ isAuthenticated: false });
    }
});

app.get('/api/user/stats', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const user = await User.findOne({ githubId: req.user.id });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            mergedPRs: user.mergedPRs,
            cancelledPRs: user.cancelledPRs,
            points: user.points,
            badges: user.badges
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
});

// Add helper function to calculate trends
async function calculateTrends(users) {
    try {
        // Get previous rankings from 24 hours ago
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const oldRankings = await User.find(
            { 'mergedPRs.mergedAt': { $lt: oneDayAgo } },
            'username points'
        ).lean();

        // Sort old rankings by points
        const oldRanked = oldRankings.sort((a, b) => b.points - a.points);
        const oldRankMap = new Map(oldRanked.map((user, index) => [user.username, index + 1]));

        // Sort current users by points
        const currentRanked = users.sort((a, b) => b.points - a.points);

        // Calculate trend for each user
        return currentRanked.map((user, currentRank) => {
            const oldRank = oldRankMap.get(user.username) || currentRank + 1;
            const rankChange = oldRank - (currentRank + 1);
            const trend = oldRank !== 0 ? Math.round((rankChange / oldRank) * 100) : 0;
            return {
                ...user,
                trend
            };
        });
    } catch (error) {
        console.error('Error calculating trends:', error);
        return users.map(user => ({ ...user, trend: 0 }));
    }
}

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

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect(`${serverUrl}/index.html`);
});

// Update GitHub API routes with Octokit
app.get('/api/github/user/:username', async (req, res) => {
    try {
        const { data: userData } = await octokit.users.getByUsername({
            username: req.params.username
        });

        // Get user's contributions using GraphQL API
        const { data: contributionsData } = await octokit.graphql(`
            query($username: String!) {
                user(login: $username) {
                    contributionsCollection {
                        totalCommitContributions
                    }
                }
            }
        `, { username: req.params.username });

        res.json({
            ...userData,
            contributions: contributionsData.user.contributionsCollection.totalCommitContributions
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch GitHub data' });
    }
});

app.get('/api/github/contributions/:username', async (req, res) => {
    try {
        const response = await fetch(
            `https://github-contributions-api.now.sh/v1/${req.params.username}`
        );
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch contribution data' });
    }
});

// Add this helper function near other helpers
async function normalizeAndValidateGitHubUrl(url) {
    try {
        // Handle URLs without protocol
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        const urlObj = new URL(url);
        if (!urlObj.hostname.toLowerCase().endsWith('github.com')) {
            throw new Error('Not a GitHub repository URL');
        }

        // Clean and split path
        const cleanPath = urlObj.pathname
            .toLowerCase()                    // Convert to lowercase
            .replace(/\.git$/, '')           // Remove .git suffix
            .replace(/\/$/, '')              // Remove trailing slash
            .split('/')
            .filter(Boolean);                // Remove empty parts

        if (cleanPath.length < 2) {
            throw new Error('Invalid repository URL format');
        }

        const [owner, repo] = cleanPath;

        // Verify repo exists and is public using Octokit
        try {
            const { data: repoData } = await octokit.repos.get({
                owner,
                repo
            });

            if (repoData.private) {
                throw new Error('Private repositories are not allowed');
            }

            // Return canonical URL format using actual case from GitHub API
            return `https://github.com/${repoData.owner.login}/${repoData.name}`;
        } catch (error) {
            if (error.status === 404) {
                throw new Error('Repository not found');
            }
            throw error;
        }
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error('Invalid URL format');
        }
        throw error;
    }
}

// Update the project submission route
// Added
app.post('/api/projects', async (req, res) => {
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
// Added
app.delete('/api/projects/:projectId', async (req, res) => {
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

// Get user's projects
// Added
app.get('/api/projects/:userId', async (req, res) => {
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

// Admin verification endpoint
// Added
app.get('/api/admin/verify', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ isAdmin: false });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    const isAdmin = adminIds.includes(req.user.username);

    res.json({ isAdmin });
});

// Admin projects endpoint
// Added
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
// Added
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
// Added
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

// Helper function to check if repo is registered and accepted
async function isRegisteredRepo(repoFullName) {
    const repoUrl = `https://github.com/${repoFullName}`;
    const repo = await Repo.find({
        repoLink: repoUrl,
        reviewStatus: 'accepted'
    });
    return repo ? repo : null;
}

// Add new helper functions for caching and rate limiting
const prCache = new Map();
const PR_CACHE_TTL = 1000 * 60 * 60; // 1 hour cache TTL

// Helper function to implement exponential backoff for rate limits
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let retries = 0;
    while (true) {
        try {
            return await fn();
        } catch (error) {
            if (error.status === 403 && error.response?.data?.message?.includes('API rate limit exceeded')) {
                const resetTime = error.response?.headers?.['x-ratelimit-reset'];
                if (resetTime) {
                    const waitTime = (parseInt(resetTime) * 1000) - Date.now();
                    if (waitTime > 0 && waitTime < 15 * 60 * 1000) { // Wait up to 15 minutes
                        console.log(`Rate limit hit. Waiting for ${Math.ceil(waitTime / 1000)} seconds until reset...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime + 1000)); // Add 1 second buffer
                        continue;
                    }
                }

                retries++;
                if (retries >= maxRetries) throw error;

                const delay = initialDelay * Math.pow(2, retries);
                console.log(`Rate limit hit. Retrying in ${delay}ms (attempt ${retries} of ${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
}

// Helper function to fetch PRs with caching and rate limit handling
async function fetchPRDetails(username) {
    try {
        // Check cache first
        const cacheKey = `prs:${username}`;
        const cachedData = prCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp) < PR_CACHE_TTL) {
            console.log(`Using cached PR data for ${username}`);
            return cachedData.data;
        }

        // Fetch with retry logic for rate limits
        const data = await retryWithBackoff(async () => {
            const response = await octokit.search.issuesAndPullRequests({
                q: `type:pr+author:${username}+is:merged+created:>=${PROGRAM_START_DATE}`,
                per_page: 100
            });
            return response.data;
        });

        // Cache the result
        prCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    } catch (error) {
        console.error(`Error fetching PRs for ${username}:`, error);
        // Return empty results on error after retries
        return { items: [] };
    }
}

// Helper function to get approved merged PRs for a user
async function getApprovedMergedPRs(userId) {
    try {
        const approvedPRs = await PendingPR.find({
            userId: userId,
            status: 'approved'
        });

        return approvedPRs.map(pr => ({
            repoId: pr.repoUrl,
            prNumber: pr.prNumber,
            title: pr.title,
            mergedAt: pr.mergedAt,
            points: pr.suggestedPoints
        }));
    } catch (error) {
        console.error('Error getting approved merged PRs:', error);
        return [];
    }
}

// Helper function to calculate points from approved PRs
async function calculatePointsFromApprovedPRs(userId) {
    try {
        const approvedPRs = await PendingPR.find({
            userId: userId,
            status: 'approved'
        });

        return approvedPRs.reduce((total, pr) => total + (pr.suggestedPoints || 50), 0);
    } catch (error) {
        console.error('Error calculating points from approved PRs:', error);
        return 0;
    }
}

// Modified function to submit PRs for admin approval with better duplicate checking
async function submitPRForApproval(userId, username, repoUrl, prData) {
    try {
        // Enhanced duplicate check - check all possible combinations
        const existingPR = await PendingPR.findOne({
            $or: [
                {
                    userId: userId,
                    repoUrl: repoUrl,
                    prNumber: prData.number
                },
                {
                    userId: userId,
                    repoId: repoUrl,
                    prNumber: prData.number
                },
                {
                    username: username,
                    repoUrl: repoUrl,
                    prNumber: prData.number
                }
            ]
        });

        if (existingPR) {
            console.log(`PR already exists in database: ${username} - ${repoUrl}#${prData.number} (Status: ${existingPR.status})`);
            return existingPR;
        }

        // Get repo details for suggested points
        const repo = await Repo.findOne({ repoLink: repoUrl });
        const suggestedPoints = repo ? (repo.successPoints || 50) : 50;

        // Create new pending PR with all required fields
        const pendingPRData = {
            userId: userId,
            username: username,
            repoId: repoUrl,  // Keep for backward compatibility
            repoUrl: repoUrl, // Primary field
            prNumber: prData.number,
            title: prData.title,
            mergedAt: new Date(prData.merged_at),
            suggestedPoints: suggestedPoints,
            status: 'pending',
            submittedAt: new Date()
        };

        const pendingPR = await PendingPR.create(pendingPRData);

        console.log(`New PR submitted for approval: ${username} - ${repoUrl}#${prData.number}`);
        return pendingPR;
    } catch (error) {
        // Handle duplicate key errors gracefully
        if (error.code === 11000) {
            console.log(`Duplicate key error - PR already exists: ${username} - ${repoUrl}#${prData.number}`);

            // Try to find and return the existing PR
            const existingPR = await PendingPR.findOne({
                userId: userId,
                repoUrl: repoUrl,
                prNumber: prData.number
            });

            return existingPR;
        }

        console.error('Error submitting PR for approval:', error);
        return null;
    }
}

// Middleware to log request details (for debugging)
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
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

// Modified PR status update endpoint with better error handling
app.get('/api/github/prs/update', async (req, res) => {
    try {
        const users = await User.find({}).lean();
        const results = [];

        const acceptedRepos = await Repo.find({
            reviewStatus: 'accepted'
        }, 'repoLink successPoints userId').lean();

        // Process users in batches to avoid hitting rate limits
        const BATCH_SIZE = 3; // Reduced batch size for better error handling
        const BATCH_DELAY = 6000; // Increased delay between batches

        for (let i = 0; i < users.length; i += BATCH_SIZE) {
            const userBatch = users.slice(i, i + BATCH_SIZE);

            const batchResults = await Promise.allSettled(userBatch.map(async (user) => {
                try {
                    console.log(`Processing user: ${user.username}`);

                    const prData = await fetchPRDetails(user.username);
                    const newSubmissions = [];
                    const skippedDuplicates = [];

                    for (const pr of prData.items) {
                        try {
                            const [owner, repo] = pr.repository_url.split('/repos/')[1].split('/');
                            const repoUrl = `https://github.com/${owner}/${repo}`;

                            const registeredRepo = acceptedRepos.find(repo => repo.repoLink === repoUrl);

                            if (registeredRepo) {
                                // Check if PR already exists before making API call
                                const existingPR = await PendingPR.findOne({
                                    $or: [
                                        { userId: user.githubId, repoUrl: repoUrl, prNumber: pr.number },
                                        { username: user.username, repoUrl: repoUrl, prNumber: pr.number }
                                    ]
                                });

                                if (existingPR) {
                                    skippedDuplicates.push({
                                        prNumber: pr.number,
                                        repoUrl: repoUrl,
                                        status: existingPR.status
                                    });
                                    continue;
                                }

                                const prDetails = await retryWithBackoff(async () => {
                                    const response = await octokit.pulls.get({
                                        owner,
                                        repo,
                                        pull_number: pr.number
                                    });
                                    return response.data;
                                });

                                if (prDetails.merged) {
                                    const submission = await submitPRForApproval(
                                        user.githubId,
                                        user.username,
                                        repoUrl,
                                        prDetails
                                    );

                                    if (submission && submission._id) {
                                        newSubmissions.push({
                                            prNumber: submission.prNumber,
                                            repoUrl: submission.repoUrl,
                                            title: submission.title
                                        });
                                    }
                                }
                            }
                        } catch (prError) {
                            console.error(`Error processing PR ${pr.number} for ${user.username}:`, prError.message);
                            continue;
                        }
                    }

                    // Update user's data based on approved PRs only
                    const approvedMergedPRs = await getApprovedMergedPRs(user.githubId);
                    const updatedPoints = await calculatePointsFromApprovedPRs(user.githubId);
                    const updatedBadges = await checkBadges(approvedMergedPRs, updatedPoints);

                    await User.findOneAndUpdate(
                        { githubId: user.githubId },
                        {
                            mergedPRs: approvedMergedPRs,
                            points: updatedPoints,
                            badges: updatedBadges
                        }
                    );

                    return {
                        username: user.username,
                        status: 'success',
                        newSubmissions: newSubmissions.length,
                        skippedDuplicates: skippedDuplicates.length,
                        approvedCount: approvedMergedPRs.length,
                        points: updatedPoints,
                        details: {
                            newSubmissions,
                            skippedDuplicates: skippedDuplicates.slice(0, 5) // Limit for response size
                        }
                    };
                } catch (userError) {
                    console.error(`Error processing user ${user.username}:`, userError.message);
                    return {
                        username: user.username,
                        status: 'error',
                        error: userError.message
                    };
                }
            }));

            // Handle both fulfilled and rejected promises
            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    const user = userBatch[index];
                    results.push({
                        username: user.username,
                        status: 'error',
                        error: result.reason?.message || 'Unknown error'
                    });
                }
            });

            // Delay between batches
            if (i + BATCH_SIZE < users.length) {
                console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}. Waiting before next batch...`);
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }
        }

        // Generate summary statistics
        const summary = {
            totalUsers: users.length,
            successfulUsers: results.filter(r => r.status === 'success').length,
            errorUsers: results.filter(r => r.status === 'error').length,
            totalNewSubmissions: results.reduce((sum, r) => sum + (r.newSubmissions || 0), 0),
            totalSkippedDuplicates: results.reduce((sum, r) => sum + (r.skippedDuplicates || 0), 0)
        };

        res.json({
            message: 'PR status update completed with improved duplicate handling',
            summary,
            results: results.slice(0, 50), // Limit response size
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in PR status update:', error);
        res.status(500).json({
            error: 'Failed to update PR status',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Enhanced GitHub API routes with Octokit
app.get('/api/github/user/:username', async (req, res) => {
    try {
        // Get basic user data
        const { data: userData } = await octokit.users.getByUsername({
            username: req.params.username
        });

        // Get contribution data using GraphQL
        const { data: { user } } = await octokit.graphql(`
            query($username: String!) {
                user(login: $username) {
                    contributionsCollection {
                        totalCommitContributions
                        contributionCalendar {
                            totalContributions
                            weeks {
                                contributionDays {
                                    contributionCount
                                    date
                                }
                            }
                        }
                    }
                }
            }
        `, {
            username: req.params.username
        });

        res.json({
            ...userData,
            contributions: user.contributionsCollection
        });
    } catch (error) {
        console.error('Error fetching GitHub user data:', error);
        res.status(500).json({ error: 'Failed to fetch GitHub data' });
    }
});

app.get('/api/github/events/:username/pushes', async (req, res) => {
    try {
        const { data } = await octokit.activity.listPublicEventsForUser({
            username: req.params.username,
            per_page: 10
        });

        const pushEvents = data.filter(event => event.type === 'PushEvent');
        res.json(pushEvents);
    } catch (error) {
        console.error('Error fetching push events:', error);
        res.status(500).json({ error: 'Failed to fetch push events' });
    }
});

app.get('/api/github/events/:username/prs', async (req, res) => {
    try {
        const { data } = await octokit.search.issuesAndPullRequests({
            q: `type:pr+author:${req.params.username}`,
            per_page: 10,
            sort: 'updated',
            order: 'desc'
        });
        res.json(data.items);
    } catch (error) {
        console.error('Error fetching PRs:', error);
        res.status(500).json({ error: 'Failed to fetch pull requests' });
    }
});

app.get('/api/github/events/:username/merges', async (req, res) => {
    try {
        const { data } = await octokit.search.issuesAndPullRequests({
            q: `type:pr+author:${req.params.username}+is:merged`,
            per_page: 10,
            sort: 'updated',
            order: 'desc'
        });
        res.json(data.items);
    } catch (error) {
        console.error('Error fetching merges:', error);
        res.status(500).json({ error: 'Failed to fetch merged PRs' });
    }
});

// Add new comprehensive user profile endpoint
app.get('/api/user/profile/:username', async (req, res) => {
    try {
        // Get GitHub user data and DevSync data
        const [userData, acceptedRepos, user] = await Promise.all([
            octokit.users.getByUsername({ username: req.params.username }),
            Repo.find({ reviewStatus: 'accepted' }, 'repoLink'),
            User.findOne({ username: req.params.username }, 'mergedPRs cancelledPRs')
        ]);

        const { data } = await octokit.search.issuesAndPullRequests({
            q: `type:pr+author:${req.params.username}+created:>=${PROGRAM_START_DATE}`,
            per_page: 10,
            sort: 'updated',
            order: 'desc'
        });

        const pullRequests = await Promise.all(data.items.map(async (pr) => {
            const repoUrl = `https://github.com/${pr.repository_url.split('/repos/')[1]}`;
            const isDevSyncRepo = acceptedRepos.some(repo => repo.repoLink === repoUrl);

            // Get additional PR details
            const [owner, repo] = pr.repository_url.split('/repos/')[1].split('/');
            const { data: prDetails } = await octokit.pulls.get({
                owner,
                repo,
                pull_number: pr.number
            });

            // Check if PR is detected by DevSync (approved)
            const isDevSyncDetected = user?.mergedPRs.some(
                mergedPr => mergedPr.repoId === repoUrl && mergedPr.prNumber === pr.number
            );

            // Check if PR is in cancelled/rejected list
            const isRejected = user?.cancelledPRs.some(
                cancelledPr => cancelledPr.repoId === repoUrl && cancelledPr.prNumber === pr.number
            );

            return {
                id: pr.id,
                title: pr.title,
                number: pr.number,
                state: pr.state,
                createdAt: pr.created_at,
                url: pr.html_url,
                repository: pr.repository_url.split('/repos/')[1],
                isDevSyncRepo,
                merged: prDetails.merged,
                closed: pr.state === 'closed' && !prDetails.merged,
                isDevSyncDetected: isDevSyncRepo ? isDevSyncDetected : false,
                isRejected: isDevSyncRepo ? isRejected : false
            };
        }));

        const profileData = {
            ...userData.data,
            pullRequests,
            programStartDate: PROGRAM_START_DATE // Add start date to response
        };

        res.json(profileData);
    } catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).json({ error: 'Failed to fetch profile data' });
    }
});

// Get all registered users endpoint
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

// Helper function to calculate profile completeness
function calculateProfileCompleteness(user) {
    let completeness = 0;
    const fields = ['username', 'displayName', 'email', 'avatarUrl'];

    fields.forEach(field => {
        if (user[field] && user[field].trim() !== '') {
            completeness += 25; // Each field is worth 25%
        }
    });

    return Math.min(completeness, 100);
}

// Helper function to get current badge based on points
async function getCurrentBadge(points) {
    if (points >= 10000) return 'Eternal Revenge | Undying ghost';
    if (points >= 7500) return 'Demon Crafter | Shapes the cursed world';
    if (points >= 5000) return 'Dark Sorcerer | Controls the dark arts';
    if (points >= 3500) return 'Lord of Shadows | Master of the unseen';
    if (points >= 2000) return 'Haunted Debugger | Haunting every broken line';
    if (points >= 1000) return 'Phantom Architect | Builds from beyond';
    if (points >= 500) return 'Skeleton of Structure | Casts magic on code';
    if (points >= 250) return 'Night Stalker | Shadows are friends';
    if (points >= 100) return 'Graveyard Shifter | Lost but curious';
    if (points >= 0) return 'Cursed Newbie | Just awakened.....';
    return 'Beginner';
}

// Create event
app.post('/api/events', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify admin status
    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const eventData = {
            ...req.body,
            createdBy: req.user.username
        };
        const event = await Event.create(eventData);
        res.status(201).json(event);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// Get all events
app.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find({}).sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Update event slots
app.patch('/api/events/:eventId/slots', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { filledSlots } = req.body;
        const event = await Event.findById(req.params.eventId);

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (filledSlots > event.totalSlots) {
            return res.status(400).json({ error: 'Filled slots cannot exceed total slots' });
        }

        event.filledSlots = filledSlots;
        await event.save();
        res.json(event);
    } catch (error) {
        console.error('Error updating event slots:', error);
        res.status(500).json({ error: 'Failed to update slots' });
    }
});

// Delete event
app.delete('/api/events/:eventId', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const event = await Event.findByIdAndDelete(req.params.eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

// Add sponsorship inquiry endpoint
app.post('/api/sponsorship/inquiry', async (req, res) => {
    try {
        if (!req.body.email || !req.body.organization || !req.body.sponsorshipType) {
            return res.status(400).json({
                error: 'Missing required fields',
                details: 'Email, organization name, and sponsorship type are required'
            });
        }

        const success = await emailService.sendSponsorshipInquiryEmail(req.body);

        if (success) {
            res.status(200).json({
                message: 'Sponsorship inquiry sent successfully',
                status: 'success'
            });
        } else {
            throw new Error('Failed to send sponsorship inquiry');
        }
    } catch (error) {
        console.error('Error processing sponsorship inquiry:', error);
        res.status(500).json({
            error: 'Failed to process sponsorship inquiry',
            details: error.message
        });
    }
});

// Add ticket routes BEFORE the catch-all route and AFTER other API routes
const ticketRoutes = require('./routes/ticketRoutes');
app.use('/api/tickets', ticketRoutes);

// Add ticket cleanup job
const cleanupExpiredTickets = async () => {
    try {
        const now = new Date();
        const expiredTickets = await Ticket.find({
            scheduledForDeletion: { $lte: now },
            status: 'closed'
        });

        if (expiredTickets.length > 0) {
            await Ticket.deleteMany({
                scheduledForDeletion: { $lte: now },
                status: 'closed'
            });

            console.log(`Cleaned up ${expiredTickets.length} expired tickets`);
        }
    } catch (error) {
        console.error('Error cleaning up expired tickets:', error);
    }
};

// Run cleanup every hour
setInterval(cleanupExpiredTickets, 60 * 60 * 1000);

// Run cleanup on startup
cleanupExpiredTickets();

// Update static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Update cors configuration to handle frontend requests
app.use(cors({
    origin: [serverUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));

// Initialize and start server
async function startServer() {
    try {
        const PORT = process.env.PORT || 3000;

        // Ensure all routes are registered before the catch-all

        // Catch-all route for SPA - must be LAST after ALL API routes
        // Added
        app.get('*', (req, res) => {
            // Only serve index.html for non-API routes
            if (!req.path.startsWith('/api/')) {
                res.sendFile(path.join(__dirname, 'public', 'index.html'));
            } else {
                res.status(404).json({ error: 'API endpoint not found' });
            }
        });

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log('Serving frontend from', path.join(__dirname, 'public'));
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use`);
                process.exit(1);
            } else {
                throw err;
            }
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();

// Add GraphQL proxy endpoint for admin PR scanning
app.post('/api/github/graphql', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { query, variables } = req.body;

        const response = await octokit.graphql(query, variables);
        res.json({ data: response });
    } catch (error) {
        console.error('GraphQL query error:', error);
        res.status(500).json({
            error: 'GraphQL query failed',
            details: error.message
        });
    }
});

// Add PR submission endpoint for advanced scanner
app.post('/api/admin/submit-pr', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { userId, username, repoUrl, prNumber, title, mergedAt } = req.body;        // Check if this PR already exists - use more comprehensive duplicate checking
        const existingPR = await PendingPR.findOne({
            $or: [
                { userId: userId, repoUrl: repoUrl, prNumber: prNumber },
                { username: username, repoUrl: repoUrl, prNumber: prNumber }
            ]
        });

        if (existingPR) {
            return res.status(409).json({
                error: 'PR already exists',
                pr: existingPR
            });
        }

        // Get repo details for suggested points
        const repo = await Repo.findOne({ repoLink: repoUrl });
        const suggestedPoints = repo ? repo.successPoints || 50 : 50;

        const pendingPR = await PendingPR.create({
            userId: userId,
            username: username,
            repoId: repoUrl,
            repoUrl: repoUrl,
            prNumber: prNumber,
            title: title,
            mergedAt: new Date(mergedAt),
            suggestedPoints: suggestedPoints
        });

        res.status(201).json({
            message: 'PR submitted for approval',
            pr: pendingPR
        });
    } catch (error) {
        console.error('Error submitting PR:', error);
        res.status(500).json({
            error: 'Failed to submit PR',
            details: error.message
        });
    }
});

// Add new endpoint for PendingPR to User table synchronization
app.post('/api/admin/sync-pending-prs', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        console.log(`Admin ${req.user.username} initiated PendingPR to User sync`);

        // Optional: Create backup before sync
        if (req.body.createBackup) {
            await dbSync.backupUserTable();
        }

        // Perform the synchronization
        const syncResults = await dbSync.syncPendingPRsToUserTable();

        // Validate integrity after sync
        const validation = await dbSync.validateSyncIntegrity();

        const duration = syncResults.endTime - syncResults.startTime;

        res.json({
            success: true,
            message: 'PendingPR to User table synchronization completed',
            results: {
                ...syncResults,
                duration: `${Math.round(duration / 1000)}s`,
                validation
            },
            timestamp: new Date().toISOString(),
            performedBy: req.user.username
        });

    } catch (error) {
        console.error('PendingPR sync failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync PendingPR data to User table',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

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

// Helper function to validate email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
