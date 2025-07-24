# Environment Setup & Configuration Guide

## 🚀 Getting Started

This guide provides step-by-step instructions for setting up the DevSync development environment, configuring all necessary services, and understanding the deployment process.

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 16.x or higher
- **npm**: Version 8.x or higher (comes with Node.js)
- **MongoDB**: Version 5.0 or higher (local or Atlas)
- **Git**: Latest version
- **Code Editor**: VS Code recommended

### Required Accounts
- **GitHub Account**: For OAuth authentication and API access
- **MongoDB Atlas Account**: For cloud database (optional, can use local MongoDB)
- **Gmail Account**: For email service integration

## 🔧 Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/devsync.git
cd devsync
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

### 4. Configure Environment Variables

Edit the `.env` file with your specific configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=5500
SERVER_URL=http://localhost:5500
FRONTEND_URL=http://localhost:5500

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/devsync
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/devsync

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-here

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:5500/auth/github/callback
GITHUB_ACCESS_TOKEN=your-github-personal-access-token

# Admin Configuration
ADMIN_GITHUB_IDS=admin1,admin2,admin3

# Email Configuration (Gmail)
GMAIL_EMAIL=your-email@gmail.com
GMAIL_PASSWORD=your-app-specific-password

# API Security
API_SECRET_KEY=generate-using-generateApiKey.js
```

## ⚙️ Service Configuration

### 1. MongoDB Setup

#### Option A: Local MongoDB Installation

**Windows:**
```bash
# Download MongoDB Community Server from https://www.mongodb.com/try/download/community
# Install and start MongoDB service
net start MongoDB
```

**macOS:**
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

**Linux (Ubuntu):**
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -

# Create source list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list

# Install MongoDB
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Option B: MongoDB Atlas (Cloud)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Add database user and whitelist your IP
4. Get connection string and update `MONGODB_URI`

### 2. GitHub OAuth App Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in application details:
   - **Application name**: DevSync Local
   - **Homepage URL**: `http://localhost:5500`
   - **Authorization callback URL**: `http://localhost:5500/auth/github/callback`
4. Copy `Client ID` and `Client Secret` to `.env` file

### 3. GitHub Personal Access Token

1. Go to [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` (Full control of private repositories)
   - `user` (Read/write access to profile info)
   - `user:email` (Access user email addresses)
4. Copy token to `GITHUB_ACCESS_TOKEN` in `.env`

### 4. Gmail App Password Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Generate app password for "Mail"
4. Use this password (not your regular Gmail password) in `GMAIL_PASSWORD`

### 5. API Key Generation

Generate a secure API key:
```bash
node generateApiKey.js
```
Copy the generated key to `API_SECRET_KEY` in `.env`

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
# OR
npm start
```

### Testing the Setup
1. Open browser and navigate to `http://localhost:5500`
2. Test GitHub OAuth login
3. Submit a test project
4. Check email functionality

## 🗂️ Project Structure Setup

### Required Directories
```bash
# Create directories if they don't exist
mkdir -p public/assets/{css,js,img}
mkdir -p templates
mkdir -p logs
```

### File Permissions
```bash
# Ensure proper permissions (Linux/macOS)
chmod +x generateApiKey.js
chmod +x testApiAuth.js
```

## 🔐 Security Configuration

### 1. Environment Variables Security

**Never commit `.env` file to version control!**

Add to `.gitignore`:
```gitignore
# Environment variables
.env
.env.local
.env.production

# Logs
logs/
*.log

# Dependencies
node_modules/

# OS files
.DS_Store
Thumbs.db
```

### 2. Production Environment Variables

For production deployment, set environment variables through your hosting platform:

```env
NODE_ENV=production
PORT=80
SERVER_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/devsync
# ... other production values
```

### 3. API Key Rotation

Regular API key rotation:
```bash
# Generate new key
node generateApiKey.js

# Update environment variable
# Restart application
```

## 🧪 Testing Configuration

### API Authentication Test
```bash
node testApiAuth.js
```

### Database Connection Test
```javascript
// test-db.js
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Database connected successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });
```

Run test:
```bash
node test-db.js
```

### Email Service Test
```javascript
// test-email.js
const emailService = require('./services/emailService');
require('dotenv').config();

async function testEmail() {
  try {
    const result = await emailService.sendWelcomeEmail(
      'test@example.com', 
      'testuser'
    );
    console.log('✅ Email sent successfully:', result);
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

testEmail();
```

## 🚢 Deployment Configuration

### 1. Heroku Deployment

**Prepare for Heroku:**
```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create Heroku app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-production-mongo-uri
heroku config:set GITHUB_CLIENT_ID=your-client-id
# ... set all other environment variables

# Deploy
git push heroku main
```

**Heroku-specific configuration:**
```json
// package.json
{
  "scripts": {
    "start": "node index.js",
    "heroku-postbuild": "npm install"
  },
  "engines": {
    "node": "16.x",
    "npm": "8.x"
  }
}
```

### 2. VPS Deployment

**Using PM2 for process management:**
```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'devsync',
    script: 'index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 80
    }
  }]
};
```

**Start application:**
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 3. Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5500

USER node

CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5500:5500"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/devsync
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

volumes:
  mongo_data:
```

**Deploy with Docker:**
```bash
docker-compose up -d
```

## 🔍 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```bash
# Check MongoDB service status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check connection string format
# Ensure IP whitelist includes your IP (Atlas)
```

#### 2. GitHub OAuth Error
- Verify callback URL matches exactly
- Check client ID and secret
- Ensure GitHub app is not suspended

#### 3. Email Service Error
- Verify Gmail app password (not regular password)
- Check 2FA is enabled
- Ensure "Less secure app access" is disabled

#### 4. API Key Issues
```bash
# Regenerate API key
node generateApiKey.js

# Test API access
node testApiAuth.js
```

#### 5. Port Already in Use
```bash
# Find process using port
lsof -i :5500

# Kill process
kill -9 <PID>

# Or use different port
PORT=3000 npm start
```

### Environment Validation

Create a validation script:
```javascript
// validate-env.js
const requiredEnvVars = [
  'MONGODB_URI',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'SESSION_SECRET',
  'GMAIL_EMAIL',
  'GMAIL_PASSWORD',
  'API_SECRET_KEY'
];

const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missing.length > 0) {
  console.error('❌ Missing environment variables:', missing);
  process.exit(1);
}

console.log('✅ All environment variables are set');
```

## 📚 Additional Resources

### Documentation Links
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Guide](https://expressjs.com/en/guide/)
- [Passport.js Documentation](http://www.passportjs.org/docs/)
- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Nodemailer Documentation](https://nodemailer.com/about/)

### Development Tools
- **MongoDB Compass**: GUI for MongoDB
- **Postman**: API testing
- **VS Code Extensions**: 
  - MongoDB for VS Code
  - Thunder Client
  - GitLens
  - Prettier

This setup guide should help you get DevSync running in any environment. For specific deployment scenarios or issues not covered here, refer to the platform-specific documentation or create an issue in the repository.
