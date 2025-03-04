# Azure Portal Deployment Steps

## 1. Package Preparation
1. Zip the following files into `deployment.zip`:
   - index.js
   - package.json
   - package-lock.json
   - web.config
   - iisnode.yml
   - config.js
   - .env
   - models/ directory

## 2. Azure Portal Steps

### Create App Service
1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource"
3. Search for "Web App"
4. Click "Create"
5. Fill in the basics:
   - Subscription: Your subscription
   - Resource Group: devsync-rg
   - Name: your-app-name
   - Runtime stack: Node 16 LTS
   - Operating System: Windows
   - Region: East US
   - Windows Plan (East US): Premium V3 P0V3
   - Pricing Plan: Premium V3 P0V3

### Configure App Service
1. Go to your created App Service
2. Navigate to "Configuration" under Settings
3. Add these Application Settings:
   - MONGODB_URI
   - GITHUB_CLIENT_ID
   - GITHUB_CLIENT_SECRET
   - GITHUB_CALLBACK_URL
   - SESSION_SECRET
   - NODE_ENV=production
   - WEBSITE_NODE_DEFAULT_VERSION=16.x
   - WEBSITE_MEMORY_LIMIT_MB=4096
   - WEBSITE_CPU_LIMIT_CORES=1

### Deploy Code
1. Go to "Deployment Center"
2. Choose "Manual deployment"
3. Click "Upload zip file"
4. Upload your deployment.zip
5. Click "Deploy"

### Post-Deployment
1. Go to "Overview"
2. Click "Restart"
3. Monitor:
   - Go to "Log stream" to watch logs
   - Check "Metrics" for performance
   - View "Diagnose and solve problems"

## 3. Domain and SSL
1. Go to "Custom domains"
2. Add your domain
3. Configure SSL:
   - Go to "TLS/SSL settings"
   - Add certificate or use Azure managed certificate

## 4. Monitoring Setup
1. Go to "Application Insights"
2. Enable application monitoring
3. Set up alerts:
   - Go to "Alerts"
   - Create alert rules for:
     - HTTP 5xx errors
     - Response time > 5s
     - Memory usage > 80%
     - CPU usage > 70%

## 5. Scaling Configuration
1. Go to "Scale up (App Service plan)"
   - Verify Premium V3 P0V3 plan
2. Go to "Scale out (App Service plan)"
   - Set rules:
     - Scale when CPU > 70%
     - Scale when Memory > 80%
     - Min instances: 1
     - Max instances: 3
