require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const { Octokit } = require('@octokit/rest');
const cron = require('node-cron');
const User = require('./models/User');
const Repo = require('./models/Repo');
const Event = require('./models/Event');
const PendingPR = require('./models/PendingPR');
const MongoStore = require('connect-mongo');
const emailService = require('./services/emailService');
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
    .then(() => console.log('Connected to MongoDB'))
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

// Replace the existing PR status update endpoint with this improved version
app.get('/api/github/prs/update', async (req, res) => {
    try {
        const users = await User.find({});
        const results = [];

        const acceptedRepos = await Repo.find({
            reviewStatus: 'accepted'
        }, 'repoLink successPoints userId');

        // Process users in batches to avoid hitting rate limits
        const BATCH_SIZE = 5;
        const BATCH_DELAY = 5000; // 5 seconds between batches

        for (let i = 0; i < users.length; i += BATCH_SIZE) {
            const userBatch = users.slice(i, i + BATCH_SIZE);

            // Process each batch concurrently but with rate limiting
            const batchResults = await Promise.all(userBatch.map(async (user) => {
                try {
                    const prData = await fetchPRDetails(user.username);

                    for (const pr of prData.items) {
                        try {
                            const [owner, repo] = pr.repository_url.split('/repos/')[1].split('/');
                            const repoUrl = `https://github.com/${owner}/${repo}`;

                            const registeredRepo = acceptedRepos.find(repo => repo.repoLink === repoUrl);

                            if (registeredRepo) {
                                // Get detailed PR info using Octokit with rate limit handling
                                const prDetails = await retryWithBackoff(async () => {
                                    const response = await octokit.pulls.get({
                                        owner,
                                        repo,
                                        pull_number: pr.number
                                    });
                                    return response.data;
                                });

                                if (prDetails.merged) {
                                    // Create unique PR ID
                                    const prId = `${owner}/${repo}/${pr.number}`;

                                    // Check if this PR is already processed
                                    const existingPR = await PendingPR.findOne({ prId });

                                    if (!existingPR) {
                                        // Store as pending PR for admin review
                                        await PendingPR.create({
                                            prId,
                                            username: user.username,
                                            githubId: user.githubId,
                                            title: pr.title,
                                            repository: `${owner}/${repo}`,
                                            repoUrl,
                                            prNumber: pr.number,
                                            mergedAt: prDetails.merged_at,
                                            suggestedPoints: registeredRepo.successPoints || 50,
                                            userAvatarUrl: user.avatarUrl,
                                            prUrl: pr.html_url
                                        });
                                    }
                                }
                            }
                        } catch (prError) {
                            console.error(`Error processing PR ${pr.number}:`, prError);
                            continue;
                        }
                    }

                    return {
                        username: user.username,
                        status: 'success'
                    };
                } catch (userError) {
                    console.error(`Error processing user ${user.username}:`, userError);
                    return {
                        username: user.username,
                        status: 'error',
                        error: userError.message
                    };
                }
            }));

            results.push(...batchResults);

            // Add delay between batches to avoid rate limits
            if (i + BATCH_SIZE < users.length) {
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }
        }

        res.json({
            message: 'PR status update completed',
            results
        });

    } catch (error) {
        console.error('Error in PR status update:', error);
        res.status(500).json({
            error: 'Failed to update PR status',
            details: error.message
        });
    }
});

// Admin endpoints for PR management
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
            .sort({ submittedAt: -1 });
        res.json(pendingPRs);
    } catch (error) {
        console.error('Error fetching pending PRs:', error);
        res.status(500).json({ error: 'Failed to fetch pending PRs' });
    }
});

app.get('/api/admin/approved-prs', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const approvedPRs = await PendingPR.find({ status: 'approved' })
            .sort({ reviewedAt: -1 });
        res.json(approvedPRs);
    } catch (error) {
        console.error('Error fetching approved PRs:', error);
        res.status(500).json({ error: 'Failed to fetch approved PRs' });
    }
});

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
        res.json(rejectedPRs);
    } catch (error) {
        console.error('Error fetching rejected PRs:', error);
        res.status(500).json({ error: 'Failed to fetch rejected PRs' });
    }
});

app.post('/api/admin/pr/:prId/approve', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { adjustedPoints } = req.body;
        const pendingPR = await PendingPR.findById(req.params.prId);

        if (!pendingPR) {
            return res.status(404).json({ error: 'PR not found' });
        }

        // Update pending PR status
        pendingPR.status = 'approved';
        pendingPR.reviewedBy = req.user.username;
        pendingPR.reviewedAt = new Date();
        if (adjustedPoints) {
            pendingPR.suggestedPoints = adjustedPoints;
        }
        await pendingPR.save();

        // Add to user's merged PRs and update stats
        const user = await User.findOne({ githubId: pendingPR.githubId });
        if (user) {
            user.mergedPRs.push({
                repoId: pendingPR.repoUrl,
                prNumber: pendingPR.prNumber,
                title: pendingPR.title,
                mergedAt: pendingPR.mergedAt
            });

            user.points = await calculatePoints(user.mergedPRs, user.githubId);
            user.badges = await checkBadges(user.mergedPRs, user.points);
            await user.save();
        }

        res.json({ message: 'PR approved successfully', pr: pendingPR });
    } catch (error) {
        console.error('Error approving PR:', error);
        res.status(500).json({ error: 'Failed to approve PR' });
    }
});

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

        // Update pending PR status
        pendingPR.status = 'rejected';
        pendingPR.reviewedBy = req.user.username;
        pendingPR.reviewedAt = new Date();
        pendingPR.rejectionReason = rejectionReason;
        await pendingPR.save();

        res.json({ message: 'PR rejected successfully', pr: pendingPR });
    } catch (error) {
        console.error('Error rejecting PR:', error);
        res.status(500).json({ error: 'Failed to reject PR' });
    }
});

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

        await PendingPR.findByIdAndDelete(req.params.prId);
        res.json({ message: 'PR deleted successfully' });
    } catch (error) {
        console.error('Error deleting PR:', error);
        res.status(500).json({ error: 'Failed to delete PR' });
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for all routes to support client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Update static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Update cors configuration to handle frontend requests
app.use(cors({
    origin: [serverUrl],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));

// Add automatic PR scanning function
async function automaticPRScan() {
    console.log('🔄 Starting automatic PR scan...', new Date().toISOString());

    try {
        const users = await User.find({});
        const acceptedRepos = await Repo.find({
            reviewStatus: 'accepted'
        }, 'repoLink successPoints userId');

        let totalProcessed = 0;
        let newPRsFound = 0;
        let errors = 0;

        // Process users in smaller batches for automatic scanning
        const BATCH_SIZE = 3;
        const BATCH_DELAY = 10000; // 10 seconds between batches for rate limiting

        for (let i = 0; i < users.length; i += BATCH_SIZE) {
            const userBatch = users.slice(i, i + BATCH_SIZE);
            console.log(`📊 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(users.length / BATCH_SIZE)}`);

            const batchResults = await Promise.all(userBatch.map(async (user) => {
                try {
                    totalProcessed++;
                    const prData = await fetchPRDetails(user.username);

                    for (const pr of prData.items) {
                        try {
                            const [owner, repo] = pr.repository_url.split('/repos/')[1].split('/');
                            const repoUrl = `https://github.com/${owner}/${repo}`;

                            const registeredRepo = acceptedRepos.find(repo => repo.repoLink === repoUrl);

                            if (registeredRepo) {
                                const prDetails = await retryWithBackoff(async () => {
                                    const response = await octokit.pulls.get({
                                        owner,
                                        repo,
                                        pull_number: pr.number
                                    });
                                    return response.data;
                                });

                                if (prDetails.merged) {
                                    const prId = `${owner}/${repo}/${pr.number}`;
                                    const existingPR = await PendingPR.findOne({ prId });

                                    if (!existingPR) {
                                        await PendingPR.create({
                                            prId,
                                            username: user.username,
                                            githubId: user.githubId,
                                            title: pr.title,
                                            repository: `${owner}/${repo}`,
                                            repoUrl,
                                            prNumber: pr.number,
                                            mergedAt: prDetails.merged_at,
                                            suggestedPoints: registeredRepo.successPoints || 50,
                                            userAvatarUrl: user.avatarUrl,
                                            prUrl: pr.html_url
                                        });
                                        newPRsFound++;
                                        console.log(`✅ New PR found: ${user.username} - ${pr.title}`);
                                    }
                                }
                            }
                        } catch (prError) {
                            console.error(`❌ Error processing PR ${pr.number} for ${user.username}:`, prError.message);
                            errors++;
                        }
                    }

                    return { username: user.username, status: 'success' };
                } catch (userError) {
                    console.error(`❌ Error processing user ${user.username}:`, userError.message);
                    errors++;
                    return { username: user.username, status: 'error', error: userError.message };
                }
            }));

            // Add delay between batches
            if (i + BATCH_SIZE < users.length) {
                console.log(`⏳ Waiting ${BATCH_DELAY / 1000}s before next batch...`);
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }
        }

        console.log(`✅ Automatic PR scan completed:`, {
            totalUsers: users.length,
            processed: totalProcessed,
            newPRsFound,
            errors,
            timestamp: new Date().toISOString()
        });

        // Send notification email to admins if new PRs are found
        if (newPRsFound > 0) {
            const adminIds = process.env.ADMIN_GITHUB_IDS?.split(',') || [];
            console.log(`📧 ${newPRsFound} new PRs found, notifying admins...`);
        }

    } catch (error) {
        console.error('❌ Automatic PR scan failed:', error);
    }
}

// Initialize and start server
async function startServer() {
    try {
        const PORT = process.env.PORT || 3000;

        // Start automatic PR scanning
        console.log('🚀 Setting up automatic PR scanning...');

        // Run initial scan after 5 minutes of server start
        setTimeout(() => {
            console.log('🔄 Running initial PR scan...');
            automaticPRScan();
        }, 5 * 60 * 1000); // 5 minutes delay

        // Schedule automatic PR scanning every hour
        const scanInterval = process.env.PR_SCAN_INTERVAL || '0 * * * *'; // Every hour at minute 0
        cron.schedule(scanInterval, () => {
            automaticPRScan();
        }, {
            scheduled: true,
            timezone: "UTC"
        });

        console.log(`⏰ Automatic PR scanning scheduled: ${scanInterval} (UTC)`);

        // Manual trigger endpoint for testing (admin only)
        app.post('/api/admin/trigger-pr-scan', async (req, res) => {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const adminIds = process.env.ADMIN_GITHUB_IDS?.split(',') || [];
            if (!adminIds.includes(req.user.username)) {
                return res.status(403).json({ error: 'Not authorized' });
            }

            try {
                // Run scan in background
                automaticPRScan();
                res.json({
                    message: 'PR scan triggered successfully',
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Manual PR scan trigger failed:', error);
                res.status(500).json({ error: 'Failed to trigger PR scan' });
            }
        });

        // Ensure all routes are registered before the catch-all
        app.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        app.listen(PORT, () => {
            console.log(`🌟 Server running on http://localhost:${PORT}`);
            console.log('📁 Serving frontend from', path.join(__dirname, 'public'));
            console.log('🔄 PR scanning will run every hour');
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} is already in use`);
                process.exit(1);
            } else {
                throw err;
            }
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer();