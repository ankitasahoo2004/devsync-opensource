# API Authentication Guide

This guide explains how to secure and access the DevSync API endpoints.

## Overview

The DevSync API uses two authentication methods:
1. **API Key Authentication** - For programmatic access
2. **Session Authentication** - For web browser access (via GitHub OAuth)

All API endpoints (except public ones) require either a valid API key or an active user session.

## API Key Setup

### 1. Generate a Secure API Key

Run the included key generator:
```bash
node generateApiKey.js
```

This will generate a cryptographically secure 64-character hexadecimal key.

### 2. Configure Environment Variable

Add the generated key to your `.env` file:
```env
API_SECRET_KEY=your-generated-key-here
```

⚠️ **Never commit your API key to version control!**

### 3. Use the API Key

Include the API key in the `x-api-key` header of your requests:

```bash
curl -H "x-api-key: your-api-key-here" \
  http://localhost:3000/api/leaderboard
```

```javascript
// JavaScript/Node.js example
const response = await fetch('http://localhost:3000/api/leaderboard', {
  headers: {
    'x-api-key': 'your-api-key-here'
  }
});
```

## Protected Endpoints

The following endpoints require authentication:

### User Data
- `GET /api/user` - Get current user info
- `GET /api/user/stats` - Get user statistics
- `GET /api/user/profile/:username` - Get user profile

### Leaderboard & Stats
- `GET /api/leaderboard` - Get leaderboard data
- `GET /api/stats/global` - Get global statistics

### Projects
- `GET /api/projects/:userId` - Get user's projects
- `POST /api/projects` - Submit a project
- `DELETE /api/projects/:projectId` - Delete a project
- `GET /api/accepted-projects` - Get accepted projects

### GitHub Integration
- `GET /api/github/user/:username` - Get GitHub user data
- `GET /api/github/contributions/:username` - Get contribution data
- `GET /api/github/prs/update` - Update PR status

### Events
- `GET /api/events` - Get events (public GET is allowed)
- `POST /api/events` - Create event (admin only)
- `PATCH /api/events/:eventId/slots` - Update event slots (admin only)
- `DELETE /api/events/:eventId` - Delete event (admin only)

### Tickets
- `POST /api/tickets` - Create ticket
- `GET /api/tickets/my` - Get user's tickets
- `GET /api/tickets/admin` - Get all tickets (admin only)
- `PATCH /api/tickets/:ticketId` - Update ticket (admin only)

### Admin Endpoints
All `/api/admin/*` endpoints require admin privileges:
- Project management
- User management
- PR approval/rejection
- System administration

### Users
- `GET /api/users` - Get all users

## Public Endpoints

These endpoints don't require authentication but are rate-limited:

- `GET /api/status` - API status and configuration
- `POST /api/sponsorship/inquiry` - Submit sponsorship inquiry
- `GET /auth/github` - GitHub OAuth login
- `GET /auth/github/callback` - GitHub OAuth callback

## Rate Limiting

Different endpoints have different rate limits:

| Endpoint Type | Rate Limit | Window |
|---------------|------------|---------|
| API Endpoints | 100 requests | 15 minutes |
| Auth Endpoints | 10 requests | 15 minutes |
| Public Endpoints | 50 requests | 15 minutes |

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Valid API key (x-api-key header) or authentication required"
}
```

### 429 Too Many Requests
```json
{
  "error": "Too many requests from this IP",
  "message": "Please try again after 15 minutes"
}
```

### 500 Server Configuration Error
```json
{
  "error": "Server configuration error",
  "message": "API key not configured on server"
}
```

## Security Best Practices

1. **Use HTTPS in Production** - Never send API keys over unencrypted connections
2. **Rotate Keys Regularly** - Generate new keys monthly
3. **Environment-Specific Keys** - Use different keys for dev/staging/production
4. **Secure Storage** - Store keys in environment variables, not code
5. **Audit Access** - Monitor API key usage and access logs
6. **Principle of Least Privilege** - Only share keys with authorized team members

## Testing API Access

Check if your API key is working:

```bash
curl -H "x-api-key: your-key-here" \
  http://localhost:3000/api/status
```

Expected response:
```json
{
  "status": "ok",
  "message": "API is running",
  "authentication": {
    "apiKeyRequired": true,
    "sessionAuthSupported": true
  },
  "rateLimit": {
    "window": "15 minutes",
    "apiLimits": 100,
    "authLimits": 10,
    "publicLimits": 50
  },
  "timestamp": "2025-07-04T..."
}
```

## Troubleshooting

### "API key not configured on server"
- Ensure `API_SECRET_KEY` is set in your `.env` file
- Restart your server after adding the environment variable

### "Unauthorized" despite providing API key
- Verify the key matches exactly (no extra spaces/characters)
- Check that you're using the `x-api-key` header (lowercase)
- Ensure your `.env` file is being loaded properly

### Rate limiting issues
- Wait for the rate limit window to reset (15 minutes)
- Consider implementing request queuing/batching
- Contact admin if you need higher rate limits

## Contact

For API access issues or questions, please create a support ticket through the application.
