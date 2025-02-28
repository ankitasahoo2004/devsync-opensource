# DevSync Project

A platform for connecting developers with open-source projects.

## Project Structure

- `frontend/`: Contains the frontend application code
- `backend/`: Contains the backend API server code

## Deployment Instructions

### Frontend Deployment

The frontend is configured to be deployed on Vercel:

1. **Install Vercel CLI** (optional, for local testing):
   ```
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```
   vercel login
   ```

3. **Deploy from the frontend directory**:
   ```
   cd frontend
   vercel
   ```

4. **Deploy to production**:
   ```
   vercel --prod
   ```

### Backend Deployment

The backend is also configured for Vercel deployment:

1. **Navigate to the backend directory**:
   ```
   cd backend
   ```

2. **Deploy to Vercel**:
   ```
   vercel
   ```

3. **Deploy to production**:
   ```
   vercel --prod
   ```

4. **Required Environment Variables**:
   - MONGODB_URI: Your MongoDB connection string
   - GITHUB_CLIENT_ID: GitHub OAuth app client ID
   - GITHUB_CLIENT_SECRET: GitHub OAuth app client secret
   - GITHUB_CALLBACK_URL: Backend callback URL for OAuth flow
   - FRONTEND_URL: URL to your deployed frontend
   - SESSION_SECRET: Secret key for session encryption
   - NODE_ENV: Set to "production" for deployment

### Alternative: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and login
2. Click "New Project"
3. Import your repository from GitHub, GitLab, or Bitbucket
4. Keep the default settings that will be auto-detected from your vercel.json
5. Configure environment variables
6. Click "Deploy"

## Environment Variables

To configure environment variables:

1. In Vercel dashboard, go to your project
2. Click Settings > Environment Variables
3. Add all required environment variables

## Domains

To configure a custom domain:
1. In Vercel dashboard, go to your project
2. Click Settings > Domains
3. Add your domain and follow the verification steps

## Local Development

To run the project locally:

1. **Start the backend**:
   ```
   cd backend
   npm install
   npm run dev
   ```

2. **Start the frontend**:
   ```
   cd frontend
   # If using live server or similar tool
   # Just open index.html in your browser
   ```

3. **Environment Setup**:
   - Create a `.env` file in the backend directory with development variables
