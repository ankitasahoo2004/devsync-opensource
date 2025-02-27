require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const User = require('./models/User');
const Repo = require('./models/Repo');
const MongoStore = require('connect-mongo');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Calculate points based on contributions from registered repos
async function calculatePoints(mergedPRs, cancelledPRs) {
    try {
        const registeredRepos = await Repo.find({}, 'repoLink');
        const registeredRepoIds = registeredRepos.map(repo => repo.repoLink);

        const validMergedPRs = mergedPRs.filter(pr => registeredRepoIds.includes(pr.repoId));
        const validCancelledPRs = cancelledPRs.filter(pr => registeredRepoIds.includes(pr.repoId));

        return (validMergedPRs.length * 10) + (validCancelledPRs.length * -2);
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
        if (validMergedPRsCount >= 1) badges.push('First Contribution');
        if (validMergedPRsCount >= 5) badges.push('Active Contributor');
        if (validMergedPRsCount >= 10) badges.push('Super Contributor');
        if (points >= 100) badges.push('Point Master');
        if (points >= 500) badges.push('DevSync Champion');

        return badges;
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
        } else if (status === 'cancelled') {
            user.cancelledPRs.push({
                repoId,
                prNumber: prData.number,
                title: prData.title,
                cancelledAt: new Date()
            });
        }

        user.points = await calculatePoints(user.mergedPRs, user.cancelledPRs);
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
    origin: ['https://sayan-dev731.github.io', 'http://localhost:5500'],
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60 // 1 day
    })
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production'
        ? 'https://devsync-server.onrender.com/auth/github/callback'
        : 'http://localhost:3000/auth/github/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ githubId: profile.id });

        if (!user) {
            user = await User.create({
                githubId: profile.id,
                username: profile.username,
                displayName: profile.displayName,
                email: profile.emails?.[0]?.value || '',
                avatarUrl: profile.photos?.[0]?.value || '',
                mergedPRs: [],
                cancelledPRs: [],
                points: 0,
                badges: ['Newcomer']
            });
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
        res.redirect(process.env.NODE_ENV === 'production'
            ? 'https://sayan-dev731.github.io/devsync-opensource'
            : 'http://localhost:5500/index.html'
        );
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

app.get('/api/leaderboard', async (req, res) => {
    try {
        const users = await User.find({})
            .sort('-points')
            .limit(10)
            .select('username points badges mergedPRs');

        const leaderboard = users.map((user, index) => ({
            rank: index + 1,
            username: user.username,
            points: user.points,
            badges: user.badges,
            mergedPRs: user.mergedPRs.length
        }));

        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect(process.env.NODE_ENV === 'production'
        ? 'https://sayan-dev731.github.io/DevSync'
        : 'http://localhost:5500/index.html'
    );
});

// GitHub API routes
app.get('/api/github/user/:username', async (req, res) => {
    try {
        const response = await fetch(`https://api.github.com/users/${req.params.username}`, {
            headers: {
                'Authorization': `token ${req.user.accessToken}`
            }
        });
        const userData = await response.json();

        const contributionsResponse = await fetch(
            `https://github-contributions-api.now.sh/v1/${req.params.username}`
        );
        const contributionsData = await contributionsResponse.json();

        res.json({
            ...userData,
            contributions: contributionsData.total
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

// Project submission route
app.post('/api/projects', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const projectData = {
            ...req.body,
            userId: req.user.id,
            submittedAt: new Date()
        };

        if (!projectData.repoLink || !projectData.ownerName || !projectData.technology || !projectData.description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const project = await Repo.create(projectData);
        res.status(200).json({ success: true, project });
    } catch (error) {
        console.error('Error saving project:', error);
        res.status(500).json({ error: 'Failed to save project' });
    }
});

// Initialize and start server
async function start() {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

start();
