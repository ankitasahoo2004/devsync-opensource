# Backend Architecture Documentation

## 🏗️ Backend Overview

DevSync's backend is built using Node.js and Express.js, following a modular MVC (Model-View-Controller) architecture. The system is designed for scalability, maintainability, and clear separation of concerns, with robust authentication, data validation, and API management.

## 📁 Project Structure

```
backend/
├── app.js                 # Express app configuration
├── index.js              # Server entry point and setup
├── config/               # Configuration files
│   ├── passport.js       # Authentication strategies
│   └── octokit.js        # GitHub API configuration
├── controllers/          # Business logic controllers
│   ├── adminController.js
│   └── githubController.js
├── middleware/           # Custom middleware functions
│   ├── authMiddleware.js
│   └── adminMiddleware.js
├── models/              # MongoDB schema definitions
│   ├── User.js
│   ├── Repo.js
│   ├── PendingPR.js
│   ├── Event.js
│   └── Ticket.js
├── routes/              # API route definitions
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── projectRoutes.js
│   ├── adminRoutes.js
│   └── [others...]
├── services/            # Business logic services
│   ├── emailService.js
│   └── 404page.js
├── utils/               # Utility functions
│   ├── pointCalculator.js
│   ├── badgeAssigner.js
│   ├── githubHelpers.js
│   └── [others...]
└── jobs/                # Background jobs
    └── ticketCleanup.js
```

## 🔧 Core Components

### 1. Application Setup (`app.js`)

The main Express application configuration handles:

```javascript
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");
const MongoStore = require("connect-mongo");

const app = express();

// Middleware Configuration
app.use(express.json());                    // JSON parsing
app.use(express.static("public"));          // Static file serving
app.use(cors({                              // CORS configuration
  origin: [process.env.SERVER_URL, process.env.FRONTEND_URL],
  credentials: true
}));

// Session Management
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({                // MongoDB session store
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60                       // 24 hour TTL
  }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Passport Authentication
require("./config/passport")(passport);
app.use(passport.initialize());
app.use(passport.session());
```

### 2. Authentication System

#### Passport Configuration (`config/passport.js`)

```javascript
const GitHubStrategy = require("passport-github2").Strategy;
const { Octokit } = require("@octokit/rest");
const User = require("../models/User");

module.exports = function (passport) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL,
    scope: ["user", "user:email"]
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // GitHub user authentication and profile creation
      const userOctokit = new Octokit({ auth: accessToken });
      
      // Fetch user emails
      const { data: emails } = await userOctokit.rest.users.listEmailsForAuthenticatedUser();
      const primaryEmail = emails.find(email => email.primary)?.email;

      // Create or update user
      let user = await User.findOne({ githubId: profile.id });
      if (!user) {
        user = await User.create({
          githubId: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          email: primaryEmail,
          avatarUrl: profile.photos[0]?.value
        });
        
        // Send welcome email
        await emailService.sendWelcomeEmail(primaryEmail, profile.username);
      }

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));

  // Session serialization
  passport.serializeUser((user, done) => done(null, user.githubId));
  passport.deserializeUser(async (githubId, done) => {
    try {
      const user = await User.findOne({ githubId });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
```

#### Authentication Middleware (`middleware/authMiddleware.js`)

```javascript
const isAuthenticated = (req, res, next) => {
  // Check session authentication
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Check API key authentication
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === process.env.API_SECRET_KEY) {
    return next();
  }
  
  res.status(401).json({ 
    error: 'Unauthorized',
    message: 'Valid API key or authentication required'
  });
};

const isAdmin = (req, res, next) => {
  const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
  if (req.user && adminIds.includes(req.user.username)) {
    return next();
  }
  res.status(403).json({ 
    error: 'Forbidden',
    message: 'Admin access required'
  });
};
```

### 3. Route Architecture

#### Base Route Pattern
```javascript
const express = require('express');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');
const router = express.Router();

// Public routes
router.get('/public-endpoint', publicHandler);

// Authenticated routes
router.get('/protected-endpoint', isAuthenticated, protectedHandler);

// Admin routes
router.get('/admin-endpoint', isAuthenticated, isAdmin, adminHandler);

module.exports = router;
```

#### Route Organization
- **Auth Routes** (`authRoutes.js`): GitHub OAuth flow
- **User Routes** (`userRoutes.js`): User profile and statistics
- **Project Routes** (`projectRoutes.js`): Repository management
- **Admin Routes** (`adminRoutes.js`): Administrative functions
- **GitHub Routes** (`githubRoutes.js`): GitHub API integration
- **Event Routes** (`eventsRoutes.js`): Event management
- **Ticket Routes** (`ticketRoutes.js`): Support system

### 4. Controller Layer

Controllers handle business logic and coordinate between routes and services:

```javascript
// Example: GitHub Controller
class GitHubController {
  static async getUserContributions(req, res) {
    try {
      const { username } = req.params;
      
      // Validate input
      if (!username) {
        return res.status(400).json({ 
          error: 'Username required' 
        });
      }

      // Fetch data from GitHub API
      const contributions = await githubService.getUserContributions(username);
      
      // Process and return data
      res.json({
        username,
        contributions,
        totalCount: contributions.length
      });
    } catch (error) {
      console.error('Error fetching contributions:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to fetch contributions'
      });
    }
  }
}
```

### 5. Service Layer

Services encapsulate business logic and external integrations:

#### Email Service (`services/emailService.js`)
```javascript
class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD
      }
    });
    this.templates = {};
  }

  async loadTemplate(templateName) {
    if (!this.templates[templateName]) {
      const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
      const template = await fs.readFile(templatePath, 'utf8');
      this.templates[templateName] = handlebars.compile(template);
    }
    return this.templates[templateName];
  }

  async sendWelcomeEmail(userEmail, username) {
    try {
      const template = await this.loadTemplate('welcomeEmail');
      const html = template({ username });

      await this.transporter.sendMail({
        from: process.env.GMAIL_EMAIL,
        to: userEmail,
        subject: 'Welcome to DevSync!',
        html
      });

      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }
}
```

### 6. Utility Functions

#### Point Calculator (`utils/pointCalculator.js`)
```javascript
async function calculatePoints(mergedPRs, userId) {
  try {
    let totalPoints = 0;

    for (const pr of mergedPRs) {
      const repo = await Repo.findOne({ repoLink: pr.repoId });
      if (repo && repo.userId !== userId) {
        totalPoints += repo.successPoints || 50;
      }
    }

    return totalPoints;
  } catch (error) {
    console.error('Point calculation error:', error);
    return 0;
  }
}
```

#### Badge Assigner (`utils/badgeAssigner.js`)
```javascript
async function assignBadges(user) {
  const badges = ['Newcomer'];
  const validContributions = user.mergedPRs.length;
  const points = user.points;

  // Contribution-based badges
  if (validContributions >= 1) badges.push('First Contribution');
  if (validContributions >= 5) badges.push('Active Contributor');
  if (validContributions >= 10) badges.push('Super Contributor');

  // Point-based level badges
  if (points >= 100) badges.push('Explorer');
  if (points >= 500) badges.push('Crafter');
  if (points >= 1000) badges.push('Architect');
  // ... more badge logic

  return [...new Set(badges)]; // Remove duplicates
}
```

### 7. Background Jobs

#### Ticket Cleanup Job (`jobs/ticketCleanup.js`)
```javascript
const cron = require('node-cron');
const Ticket = require('../models/Ticket');

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const now = new Date();
    
    // Delete tickets scheduled for deletion
    const result = await Ticket.deleteMany({
      scheduledForDeletion: { $lte: now }
    });

    console.log(`Cleaned up ${result.deletedCount} tickets`);
  } catch (error) {
    console.error('Ticket cleanup error:', error);
  }
});
```

## 🔐 Security Implementation

### 1. Input Validation
```javascript
const validateProjectSubmission = (req, res, next) => {
  const { repoLink, ownerName, technology, description } = req.body;
  
  // Required field validation
  if (!repoLink || !ownerName || !technology || !description) {
    return res.status(400).json({ 
      error: 'Missing required fields' 
    });
  }
  
  // GitHub URL validation
  const githubUrlPattern = /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+$/;
  if (!githubUrlPattern.test(repoLink)) {
    return res.status(400).json({ 
      error: 'Invalid GitHub URL format' 
    });
  }
  
  next();
};
```

### 2. Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Stricter limit for auth endpoints
  message: 'Too many authentication attempts'
});

app.use('/api/', apiLimiter);
app.use('/auth/', authLimiter);
```

### 3. Environment Configuration
```javascript
// Environment variables validation
const requiredEnvVars = [
  'MONGODB_URI',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'SESSION_SECRET',
  'GMAIL_EMAIL',
  'GMAIL_PASSWORD'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});
```

## 🚀 Performance Optimization

### 1. Database Optimization
- **Indexing Strategy**: Strategic index creation for frequent queries
- **Connection Pooling**: MongoDB connection pool management
- **Query Optimization**: Efficient aggregation pipelines
- **Data Pagination**: Large dataset handling

### 2. Caching Strategy
```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cached = cache.get(key);
    
    if (cached) {
      return res.json(cached);
    }
    
    // Override res.json to cache response
    const originalJson = res.json;
    res.json = function(data) {
      cache.set(key, data, duration);
      originalJson.call(this, data);
    };
    
    next();
  };
};
```

### 3. Async Operations
```javascript
// Example: Parallel processing
async function processUserUpdates(users) {
  const promises = users.map(async (user) => {
    const [points, badges] = await Promise.all([
      calculatePoints(user.mergedPRs, user.githubId),
      assignBadges(user)
    ]);
    
    return User.findByIdAndUpdate(user._id, { points, badges });
  });
  
  return Promise.all(promises);
}
```

## 🧪 Error Handling Strategy

### 1. Global Error Handler
```javascript
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: Object.values(err.errors).map(e => e.message).join(', ')
    });
  }
  
  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate Entry',
      message: 'Resource already exists'
    });
  }
  
  // Default error response
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
};

app.use(errorHandler);
```

### 2. Async Error Wrapper
```javascript
const asyncWrapper = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Usage
router.get('/users', asyncWrapper(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));
```

## 📊 Monitoring & Logging

### 1. Request Logging
```javascript
const morgan = require('morgan');

// Custom log format
morgan.token('user', (req) => req.user ? req.user.username : 'anonymous');

app.use(morgan(':method :url :status :res[content-length] - :response-time ms :user'));
```

### 2. Performance Monitoring
```javascript
const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) { // Log slow requests
      console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
};
```

This backend architecture documentation provides a comprehensive guide to DevSync's server-side implementation, enabling developers to understand, maintain, and extend the system effectively.
