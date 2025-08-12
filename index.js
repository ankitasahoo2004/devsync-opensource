require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const rateLimit = require('express-rate-limit');
const Repo = require('./models/Repo');
const Ticket = require('./models/Ticket'); // Add Ticket model
const MongoStore = require('connect-mongo');
const emailService = require('./services/emailService');
const serverUrl = process.env.SERVER_URL;

const app = express();

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

// Middleware setup
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));
app.use(cors({
    origin: ['https://devsync.club', 'https://www.devsync.club', 'http://localhost:3000','https://cdn.devsync.club'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));

// Added session management
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

require('./config/passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

// API Key Authentication Middleware
const API_SECRET_KEY = process.env.API_SECRET_KEY;

// Log API key configuration status (but not the actual key)
if (!API_SECRET_KEY) {
    console.warn('⚠️  WARNING: API_SECRET_KEY is not configured. All API endpoints will be inaccessible without authentication.');
} else {
    console.log('✅ API_SECRET_KEY is configured');
}

// Rate limiting middleware for API endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: {
        error: 'Too many requests from this IP',
        message: 'Please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 25, // limit each IP to 25 auth attempts per windowMs
    message: {
        error: 'Too many authentication attempts',
        message: 'Please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// General rate limiter for public endpoints
const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 500 requests per windowMs for public endpoints
    message: {
        error: 'Too many requests from this IP',
        message: 'Please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware to check API key or session authentication
const requireApiKeyOrAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    // First check if API_SECRET_KEY is configured
    if (!API_SECRET_KEY) {
        return res.status(500).json({
            error: 'Server configuration error',
            message: 'API key not configured on server'
        });
    }

    // Check if API key is provided and valid
    if (apiKey && apiKey === API_SECRET_KEY) {
        // Set a flag to indicate API key authentication
        req.isApiAuthenticated = true;
        // Override isAuthenticated method for this request
        const originalIsAuthenticated = req.isAuthenticated;
        req.isAuthenticated = function () {
            return this.isApiAuthenticated || originalIsAuthenticated.call(this);
        };
        return next();
    }

    // Check if user is authenticated via session
    if (req.isAuthenticated()) {
        return next();
    }

    // Neither API key nor session authentication found
    return res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid API key (x-api-key header) or authentication required'
    });
};

// Auth routes (no authentication required for login/logout)
const authRoutes = require('./routes/authRoutes');
app.use("/api/auth", authLimiter, authRoutes);

// Config endpoint for frontend (public with rate limiting)
const configRoutes = require('./routes/configRoutes');
app.use('/api/config', publicLimiter, configRoutes);

// API Status endpoint (public with rate limiting)
app.get('/api/status', publicLimiter, (req, res) => {
    res.json({
        status: 'ok',
        message: 'API is running',
        authentication: {
            apiKeyRequired: !!API_SECRET_KEY,
            sessionAuthSupported: true
        },
        rateLimit: {
            window: '15 minutes',
            apiLimits: 100,
            authLimits: 10,
            publicLimits: 50
        },
        timestamp: new Date().toISOString()
    });
});

// Protected API routes - require authentication or API key
const userRoutes = require('./routes/userRoutes');
app.use('/api/user', apiLimiter, requireApiKeyOrAuth, userRoutes);

// Update leaderboard endpoint (public endpoint)
const leaderboard = require('./routes/leaderboardRoutes');
app.use('/api/leaderboard', publicLimiter, leaderboard);

// Add global stats endpoint (public endpoint)
const statsRoutes = require('./routes/statsRoutes');
app.use('/api/stats', publicLimiter, statsRoutes);

app.get('/api/auth/logout', (req, res, next) => {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});

// Update GitHub API routes with Octokit
const githubRoutes = require('./routes/githubRoutes');
app.use('/api/github', apiLimiter, requireApiKeyOrAuth, githubRoutes);

// Update the project submission route
// Added
const projectRoutes = require('./routes/projectRoutes');
app.use('/api/projects', apiLimiter, requireApiKeyOrAuth, projectRoutes);

// Get all accepted projects (public endpoint)
const acceptedProjectsRoutes = require('./routes/acceptedprojects');
app.use('/api/accepted-projects', publicLimiter, acceptedProjectsRoutes);

// Events routes (public endpoint for viewing events)
const eventsRoutes = require('./routes/eventsRoutes');
app.use('/api/events', publicLimiter, eventsRoutes);

// Admin verification endpoint
// Added
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', apiLimiter, requireApiKeyOrAuth, adminRoutes);

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

// Middleware to log request details (for debugging)
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
});

// Get all registered users endpoint
const usersRoutes = require('./routes/usersRoutes');
app.use('/api/users', publicLimiter, usersRoutes);

// Add sponsorship inquiry endpoint
const sponsorshipRoutes = require('./routes/sponsorshipRoutes');
app.use('/api/sponsorship', publicLimiter, sponsorshipRoutes); // Public endpoint with rate limiting only

// Add ticket routes BEFORE the catch-all route and AFTER other API routes
const ticketRoutes = require('./routes/ticketRoutes');
app.use('/api/tickets', apiLimiter, requireApiKeyOrAuth, ticketRoutes);

// Add ambassador routes
const ambassadorRoutes = require('./routes/ambassadorRoutes');
app.use('/api/ambassadors', publicLimiter, ambassadorRoutes);

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

        // Handle clean URLs - serve specific HTML files for clean routes
        app.get('/about', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'about.html'));
        });

        app.get('/projects', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'projects.html'));
        });

        app.get('/events', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'events.html'));
        });

        app.get('/leaderboard', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
        });

        app.get('/profile', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'profile.html'));
        });

        app.get('/contact', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'contact.html'));
        });

        app.get('/login', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'login.html'));
        });

        app.get('/admin', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'admin.html'));
        });

        app.get('/ambassadors', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'ambassadors.html'));
        })

        // Catch-all route for SPA - must be LAST after ALL API routes
        // Added
        app.get('*', (req, res) => {
            if (req.path.startsWith('/api/')) {
                res.status(404).json({ error: 'API endpoint not found' });
            } else {
                // Define valid frontend routes
                const validRoutes = [
                    '/', '/about', '/projects', '/events', '/leaderboard',
                    '/profile', '/contact', '/login', '/admin', '/ambassadors'
                ];

                // Check if the requested path is a valid route
                if (validRoutes.includes(req.path)) {
                    res.sendFile(path.join(__dirname, 'public', 'index.html'));
                } else {
                    // Serve 404 page for invalid routes
                    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
                }
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

// Helper function to validate email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
