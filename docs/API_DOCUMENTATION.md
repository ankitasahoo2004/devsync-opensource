# API Documentation

## 🌐 API Overview

DevSync provides a comprehensive RESTful API for managing users, projects, contributions, events, and administrative functions. The API supports both session-based authentication (for web browsers) and API key authentication (for programmatic access).

## 🔐 Authentication Methods

### 1. Session Authentication
Used for web browser access via GitHub OAuth:
```javascript
// Login via GitHub OAuth
GET /auth/github

// OAuth callback
GET /auth/github/callback
```

### 2. API Key Authentication
Used for programmatic access:
```bash
curl -H "x-api-key: your-api-key-here" \
  http://localhost:3000/api/endpoint
```

## 📋 API Endpoints

### Authentication Routes (`/auth`)

#### GitHub OAuth Login
```http
GET /auth/github
```
**Purpose**: Initiates GitHub OAuth authentication flow  
**Authentication**: None required  
**Response**: Redirects to GitHub OAuth  

#### GitHub OAuth Callback
```http
GET /auth/github/callback
```
**Purpose**: Handles GitHub OAuth callback  
**Authentication**: None required  
**Response**: Redirects to frontend URL  

---

### User Management (`/api/user`)

#### Get Current User
```http
GET /api/user
```
**Purpose**: Retrieve authenticated user's profile  
**Authentication**: Required (session or API key)  
**Response**:
```json
{
  "githubId": "12345",
  "username": "johndoe",
  "displayName": "John Doe",
  "email": "john@example.com",
  "avatarUrl": "https://github.com/johndoe.avatar",
  "points": 150,
  "badges": ["Newcomer", "First Contribution"],
  "joinedAt": "2025-01-15T10:30:00Z"
}
```

#### Get User Statistics
```http
GET /api/user/stats
```
**Purpose**: Retrieve user's contribution statistics  
**Authentication**: Required  
**Response**:
```json
{
  "totalContributions": 5,
  "totalPoints": 250,
  "badges": ["Newcomer", "Active Contributor"],
  "recentPRs": [...],
  "rank": 15
}
```

#### Get User Profile by Username
```http
GET /api/user/profile/:username
```
**Purpose**: Retrieve specific user's public profile  
**Authentication**: Required  
**Parameters**: `username` - GitHub username  
**Response**: User profile object (public fields only)

---

### Project Management (`/api/projects`)

#### Submit New Project
```http
POST /api/projects
```
**Purpose**: Submit repository for approval  
**Authentication**: Required  
**Request Body**:
```json
{
  "repoLink": "https://github.com/user/repo",
  "ownerName": "Repository Owner",
  "technology": ["JavaScript", "Node.js"],
  "description": "Project description"
}
```
**Response**:
```json
{
  "message": "Project submitted successfully",
  "projectId": "project_id_here"
}
```

#### Get User's Projects
```http
GET /api/projects/:userId
```
**Purpose**: Retrieve projects owned by specific user  
**Authentication**: Required  
**Parameters**: `userId` - GitHub user ID  

#### Delete Project
```http
DELETE /api/projects/:projectId
```
**Purpose**: Delete owned project  
**Authentication**: Required (owner only)  
**Parameters**: `projectId` - Project identifier  

#### Get Accepted Projects
```http
GET /api/accepted-projects
```
**Purpose**: Retrieve all approved projects  
**Authentication**: Required  
**Response**: Array of approved project objects

---

### Leaderboard & Statistics (`/api`)

#### Get Leaderboard
```http
GET /api/leaderboard
```
**Purpose**: Retrieve community leaderboard  
**Authentication**: Required  
**Query Parameters**:
- `limit` (optional): Number of users to return (default: 50)
- `page` (optional): Page number for pagination

**Response**:
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "username": "topcontributor",
      "points": 1500,
      "badges": ["Master Contributor"],
      "avatarUrl": "..."
    }
  ],
  "totalUsers": 500
}
```

#### Get Global Statistics
```http
GET /api/stats/global
```
**Purpose**: Retrieve platform-wide statistics  
**Authentication**: Required  
**Response**:
```json
{
  "totalUsers": 500,
  "totalProjects": 150,
  "totalContributions": 2500,
  "activeContributors": 45
}
```

---

### GitHub Integration (`/api/github`)

#### Get GitHub User Data
```http
GET /api/github/user/:username
```
**Purpose**: Retrieve GitHub user information  
**Authentication**: Required  
**Parameters**: `username` - GitHub username  

#### Get User Contributions
```http
GET /api/github/contributions/:username
```
**Purpose**: Retrieve user's contribution data  
**Authentication**: Required  
**Parameters**: `username` - GitHub username  

#### Update PR Status
```http
GET /api/github/prs/update
```
**Purpose**: Refresh PR status for authenticated user  
**Authentication**: Required  

---

### Event Management (`/api/events`)

#### Get All Events
```http
GET /api/events
```
**Purpose**: Retrieve all events (public endpoint)  
**Authentication**: Optional  
**Response**: Array of event objects

#### Create Event (Admin Only)
```http
POST /api/events
```
**Purpose**: Create new community event  
**Authentication**: Required (admin only)  
**Request Body**:
```json
{
  "name": "DevSync Workshop",
  "date": "2025-08-15",
  "time": "10:00 AM",
  "description": "Introduction to Open Source",
  "type": "workshop",
  "mode": "hybrid",
  "totalSlots": 50,
  "registerLink": "https://...",
  "venue": "Tech Hub",
  "address": "123 Tech Street",
  "speakers": ["John Doe", "Jane Smith"]
}
```

#### Update Event Slots (Admin Only)
```http
PATCH /api/events/:eventId/slots
```
**Purpose**: Update event attendance slots  
**Authentication**: Required (admin only)  
**Parameters**: `eventId` - Event identifier  
**Request Body**:
```json
{
  "filledSlots": 25
}
```

#### Delete Event (Admin Only)
```http
DELETE /api/events/:eventId
```
**Purpose**: Delete event  
**Authentication**: Required (admin only)  
**Parameters**: `eventId` - Event identifier  

---

### Support Tickets (`/api/tickets`)

#### Create Ticket
```http
POST /api/tickets
```
**Purpose**: Submit support ticket  
**Authentication**: Required  
**Request Body**:
```json
{
  "title": "Login Issue",
  "description": "Cannot access my account",
  "priority": "high",
  "category": "technical",
  "contactEmail": "user@example.com"
}
```

#### Get User's Tickets
```http
GET /api/tickets/my
```
**Purpose**: Retrieve authenticated user's tickets  
**Authentication**: Required  

#### Get All Tickets (Admin Only)
```http
GET /api/tickets/admin
```
**Purpose**: Retrieve all tickets for admin review  
**Authentication**: Required (admin only)  

#### Update Ticket (Admin Only)
```http
PATCH /api/tickets/:ticketId
```
**Purpose**: Update ticket status or details  
**Authentication**: Required (admin only)  
**Parameters**: `ticketId` - Ticket identifier  
**Request Body**:
```json
{
  "status": "closed",
  "resolution": "Issue resolved by updating password",
  "resolvedBy": "admin_username"
}
```

---

### Administrative Routes (`/api/admin`)

All admin routes require admin authentication and follow the pattern `/api/admin/*`.

#### User Management
```http
GET /api/admin/users           # Get all users
PATCH /api/admin/users/:userId # Update user details
DELETE /api/admin/users/:userId # Delete user
```

#### Project Management
```http
GET /api/admin/projects/pending  # Get pending projects
PATCH /api/admin/projects/:id    # Approve/reject project
```

#### PR Management
```http
GET /api/admin/prs/pending       # Get pending PRs
PATCH /api/admin/prs/:id         # Approve/reject PR
```

---

### Public Routes (`/api`)

#### API Status
```http
GET /api/status
```
**Purpose**: Check API health and configuration  
**Authentication**: None required  
**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-07-04T10:30:00Z",
  "version": "1.0.0",
  "environment": "production"
}
```

#### Sponsorship Inquiry
```http
POST /api/sponsorship/inquiry
```
**Purpose**: Submit sponsorship inquiry  
**Authentication**: None required  
**Request Body**:
```json
{
  "companyName": "Tech Corp",
  "contactEmail": "sponsor@techcorp.com",
  "message": "Interested in sponsoring events"
}
```

## ⚡ Rate Limiting

Different endpoint categories have different rate limits:

| Endpoint Type | Rate Limit | Window |
|---------------|------------|---------|
| API Endpoints | 100 requests | 15 minutes |
| Auth Endpoints | 10 requests | 15 minutes |
| Public Endpoints | 50 requests | 15 minutes |
| Admin Endpoints | 200 requests | 15 minutes |

## 🚨 Error Responses

### Standard Error Format
```json
{
  "error": "Error Type",
  "message": "Detailed error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-07-04T10:30:00Z"
}
```

### Common HTTP Status Codes

#### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Missing required fields: repoLink, description"
}
```

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Valid API key (x-api-key header) or authentication required"
}
```

#### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Admin access required for this operation"
}
```

#### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "User with username 'example' not found"
}
```

#### 429 Too Many Requests
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again after 15 minutes"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## 📝 Request/Response Examples

### Complete User Registration Flow
```bash
# 1. Initiate GitHub OAuth
curl -X GET "http://localhost:3000/auth/github"

# 2. After OAuth callback, access user data
curl -H "x-api-key: your-key" \
  -X GET "http://localhost:3000/api/user"

# 3. Submit a project
curl -H "x-api-key: your-key" \
  -H "Content-Type: application/json" \
  -X POST "http://localhost:3000/api/projects" \
  -d '{
    "repoLink": "https://github.com/user/awesome-project",
    "ownerName": "John Doe",
    "technology": ["JavaScript", "React"],
    "description": "An awesome open source project"
  }'
```

### Admin Operations
```bash
# Get pending projects for review
curl -H "x-api-key: admin-key" \
  -X GET "http://localhost:3000/api/admin/projects/pending"

# Approve a project
curl -H "x-api-key: admin-key" \
  -H "Content-Type: application/json" \
  -X PATCH "http://localhost:3000/api/admin/projects/123" \
  -d '{"reviewStatus": "accepted", "successPoints": 75}'
```

This API documentation provides comprehensive guidance for integrating with DevSync's backend services. For authentication setup details, refer to `API_AUTHENTICATION.md`.
