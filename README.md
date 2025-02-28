# DevSync Project

A platform for connecting developers with open-source projects.

## Deployment Instructions

This project is configured to be deployed on Vercel.

### Steps to deploy:

1. **Install Vercel CLI** (optional, for local testing):
   ```
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```
   vercel login
   ```

3. **Deploy from local directory**:
   ```
   vercel
   ```

4. **Deploy to production**:
   ```
   vercel --prod
   ```

### Alternative: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and login
2. Click "New Project"
3. Import your repository from GitHub, GitLab, or Bitbucket
4. Keep the default settings that will be auto-detected from your vercel.json
5. Click "Deploy"

## Environment Variables

If you need to add environment variables:

1. In Vercel dashboard, go to your project
2. Click Settings > Environment Variables
3. Add any required environment variables

## Domains

To configure a custom domain:
1. In Vercel dashboard, go to your project
2. Click Settings > Domains
3. Add your domain and follow the verification steps
