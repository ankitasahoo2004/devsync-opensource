# Deployment Guide

## 🚀 Deployment Overview

This guide covers various deployment strategies for DevSync, from development to production environments. It includes setup instructions for popular hosting platforms, containerization, and best practices for scaling.

## 🏗️ Deployment Architecture

```
Production Deployment Stack
├── Load Balancer (Nginx/CloudFlare)
├── Application Server (Node.js/PM2)
├── Database (MongoDB Atlas/Self-hosted)
├── File Storage (Cloud Storage/CDN)
├── Email Service (Gmail/SendGrid)
└── Monitoring (Logs/Analytics)
```

## 📋 Pre-deployment Checklist

### 1. Environment Preparation
- [ ] Production environment variables configured
- [ ] Database production instance ready
- [ ] Domain name and SSL certificate acquired
- [ ] GitHub OAuth app configured for production
- [ ] Email service configured
- [ ] API keys generated and secured

### 2. Code Preparation
- [ ] All dependencies updated and audited
- [ ] Production build tested locally
- [ ] Environment-specific configurations set
- [ ] Database migrations completed
- [ ] Security vulnerabilities patched

### 3. Infrastructure Preparation
- [ ] Server provisioned and secured
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring tools installed
- [ ] CI/CD pipeline configured

## 🌐 Platform-Specific Deployments

### 1. Heroku Deployment

Heroku provides a simple platform for deploying Node.js applications.

#### Setup Steps

1. **Install Heroku CLI**
```bash
npm install -g heroku
heroku login
```

2. **Create Heroku Application**
```bash
heroku create devsync-production
```

3. **Configure Environment Variables**
```bash
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/devsync
heroku config:set GITHUB_CLIENT_ID=your-production-client-id
heroku config:set GITHUB_CLIENT_SECRET=your-production-client-secret
heroku config:set GITHUB_CALLBACK_URL=https://your-app.herokuapp.com/auth/github/callback
heroku config:set SESSION_SECRET=your-super-secure-session-secret
heroku config:set GMAIL_EMAIL=your-email@gmail.com
heroku config:set GMAIL_PASSWORD=your-app-password
heroku config:set API_SECRET_KEY=your-api-secret-key
heroku config:set ADMIN_GITHUB_IDS=admin1,admin2,admin3
```

4. **Configure package.json for Heroku**
```json
{
  "scripts": {
    "start": "node index.js",
    "heroku-postbuild": "npm ci"
  },
  "engines": {
    "node": "16.x",
    "npm": "8.x"
  }
}
```

5. **Create Procfile**
```
web: node index.js
```

6. **Deploy Application**
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

7. **Open Application**
```bash
heroku open
```

#### Heroku-Specific Configurations

**Custom Domain Setup:**
```bash
heroku domains:add www.yoursite.com
heroku config:set SERVER_URL=https://www.yoursite.com
heroku config:set FRONTEND_URL=https://www.yoursite.com
```

**Enable Logging:**
```bash
heroku logs --tail
heroku addons:create papertrail:choklad
```

**Database Backup:**
```bash
# If using Heroku MongoDB add-on
heroku addons:create mongolab:sandbox
```

### 2. DigitalOcean Droplet Deployment

Deploy on a DigitalOcean VPS for more control and scalability.

#### Setup Steps

1. **Create and Configure Droplet**
```bash
# Create Ubuntu 20.04 droplet
# SSH into droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
apt install nginx -y

# Install MongoDB (optional, or use Atlas)
wget -qO - https://www.mongodb.org/static/pgp/server-5.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/5.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-5.0.list
apt-get update
apt-get install -y mongodb-org
systemctl start mongod
systemctl enable mongod
```

2. **Deploy Application**
```bash
# Clone repository
git clone https://github.com/your-username/devsync.git
cd devsync

# Install dependencies
npm ci --production

# Create environment file
nano .env
# Add your production environment variables

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

3. **Configure Nginx**
```nginx
# /etc/nginx/sites-available/devsync
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:5500;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/devsync /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

4. **SSL Certificate with Let's Encrypt**
```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Obtain certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### PM2 Configuration

**ecosystem.config.js:**
```javascript
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
      PORT: 5500
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 3. AWS EC2 Deployment

Deploy on Amazon Web Services for enterprise-grade infrastructure.

#### Setup Steps

1. **Launch EC2 Instance**
- Choose Ubuntu Server 20.04 LTS
- Select appropriate instance type (t3.micro for testing)
- Configure security group (ports 22, 80, 443)
- Create and download key pair

2. **Connect and Setup Server**
```bash
# Connect to instance
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Update and install dependencies
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs nginx

# Install PM2
sudo npm install -g pm2
```

3. **Setup Application**
```bash
# Clone and setup application (same as DigitalOcean steps)
git clone https://github.com/your-username/devsync.git
cd devsync
npm ci --production

# Configure environment variables
sudo nano .env

# Start application
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

4. **Configure Load Balancer (Optional)**
```bash
# For high availability, use AWS Application Load Balancer
# Configure target groups and health checks
```

#### AWS-Specific Configurations

**Security Groups:**
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
- SSH (22): Your IP only
- Custom TCP (5500): ALB only

**Route 53 DNS:**
```bash
# Configure DNS records for your domain
# Point to Elastic Load Balancer or EC2 public IP
```

### 4. Vercel Deployment

Deploy frontend with Vercel for global CDN and automatic deployments.

#### Setup Steps

1. **Install Vercel CLI**
```bash
npm install -g vercel
vercel login
```

2. **Configure for Static Deployment**
```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/public/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

3. **Deploy**
```bash
vercel --prod
```

## 🐳 Docker Deployment

Containerize DevSync for consistent deployments across environments.

### 1. Docker Configuration

**Dockerfile:**
```dockerfile
FROM node:16-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Bundle app source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S devsync -u 1001

# Change ownership of the app directory
RUN chown -R devsync:nodejs /app
USER devsync

# Expose port
EXPOSE 5500

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5500/api/status || exit 1

# Start application
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
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - GMAIL_EMAIL=${GMAIL_EMAIL}
      - GMAIL_PASSWORD=${GMAIL_PASSWORD}
      - API_SECRET_KEY=${API_SECRET_KEY}
    depends_on:
      - mongo
    restart: unless-stopped
    networks:
      - devsync-network

  mongo:
    image: mongo:5.0
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
      - MONGO_INITDB_DATABASE=devsync
    volumes:
      - mongo_data:/data/db
      - ./init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js
    ports:
      - "27017:27017"
    restart: unless-stopped
    networks:
      - devsync-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - devsync-network

volumes:
  mongo_data:

networks:
  devsync-network:
    driver: bridge
```

### 2. Docker Compose Deployment

```bash
# Create environment file
cp .env.example .env
# Edit .env with production values

# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale application
docker-compose up -d --scale app=3
```

### 3. Kubernetes Deployment

For large-scale deployments, use Kubernetes:

**deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: devsync-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: devsync-app
  template:
    metadata:
      labels:
        app: devsync-app
    spec:
      containers:
      - name: devsync
        image: your-registry/devsync:latest
        ports:
        - containerPort: 5500
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: devsync-secrets
              key: mongodb-uri
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: devsync-service
spec:
  selector:
    app: devsync-app
  ports:
  - port: 80
    targetPort: 5500
  type: LoadBalancer
```

## 🔧 Production Optimizations

### 1. Performance Optimizations

**Enable Gzip Compression:**
```javascript
const compression = require('compression');
app.use(compression());
```

**Static Asset Caching:**
```javascript
app.use(express.static('public', {
  maxAge: '1y',
  etag: false
}));
```

**Database Connection Pooling:**
```javascript
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});
```

### 2. Security Hardening

**Security Headers:**
```javascript
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

**Rate Limiting:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

### 3. Monitoring and Logging

**Application Monitoring:**
```javascript
// Add monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});
```

**Health Check Endpoint:**
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    - name: Install dependencies
      run: npm ci
    - name: Run tests
      run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: success()
    steps:
    - uses: actions/checkout@v2
    - name: Deploy to Heroku
      uses: akhileshns/heroku-deploy@v3.12.12
      with:
        heroku_api_key: ${{secrets.HEROKU_API_KEY}}
        heroku_app_name: "your-app-name"
        heroku_email: "your-email@example.com"
```

## 🛠️ Troubleshooting Deployment Issues

### Common Problems

1. **Environment Variables Not Set**
   - Verify all required environment variables
   - Check variable names and values
   - Restart application after changes

2. **Database Connection Issues**
   - Verify MongoDB URI format
   - Check network connectivity
   - Ensure database user permissions

3. **Port Conflicts**
   - Check if port is already in use
   - Update port configuration
   - Configure firewall rules

4. **Memory Issues**
   - Monitor memory usage
   - Optimize queries and caching
   - Scale server resources

5. **SSL Certificate Problems**
   - Verify certificate validity
   - Check domain configuration
   - Ensure proper certificate chain

### Monitoring Commands

```bash
# Check application status
pm2 status
pm2 logs

# Monitor system resources
htop
df -h
free -m

# Check network connectivity
netstat -tulpn
curl -I https://your-domain.com

# View Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

This deployment guide provides comprehensive instructions for deploying DevSync across various platforms and environments, ensuring scalable and reliable production deployments.
