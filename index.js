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
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
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
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..')));
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? 'https://devsync-frontend.vercel.app'
        : 'http://localhost:5500',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60 // 1 day
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport configuration
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV === 'production'
        ? 'https://devsync-backend.vercel.app/auth/github/callback'
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
                badges: ['Newcomer'],
                accessToken
            });
        } else {
            user.accessToken = accessToken;
            await user.save();
        }

        return done(null, { ...profile, userData: user });
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// Auth routes
app.use('/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/github', require('./routes/github'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;