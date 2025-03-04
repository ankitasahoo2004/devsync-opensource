# Deployment Package Checklist

## Required Files
- [ ] index.js
- [ ] package.json
- [ ] package-lock.json
- [ ] web.config
- [ ] iisnode.yml
- [ ] config.js
- [ ] .env
- [ ] models/User.js
- [ ] models/Repo.js

## Pre-deployment Steps
1. Update environment variables in .env
2. Set NODE_ENV to 'production'
3. Update config.js with production URLs
4. Ensure all dependencies are in package.json
5. Check MongoDB connection string
6. Verify GitHub OAuth settings

## Create Deployment Package
1. Open PowerShell in server directory
2. Run the deployment script:
```powershell
.\deploy.ps1
```
3. Verify deployment.zip contains all files
4. Check file permissions

## Azure Upload Steps
1. Log into Azure Portal
2. Navigate to App Service
3. Go to 'Advanced Tools' (Kudu)
4. Upload deployment.zip
5. Extract the package
6. Verify deployment

## Post-deployment Verification
1. Check application logs
2. Verify MongoDB connection
3. Test GitHub authentication
4. Check API endpoints
5. Monitor performance
