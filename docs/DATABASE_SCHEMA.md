# Database Schema & Models Documentation

## 📊 Database Overview

DevSync uses MongoDB as its primary database with Mongoose ODM for schema definition and data validation. The database is designed to support user management, project tracking, contribution monitoring, and community features.

## 🏗️ Schema Architecture

```
MongoDB Database: devsync
├── users              (User profiles and authentication)
├── repos              (Registered open-source projects)
├── pendingprs         (Pull request submissions for review)
├── events             (Community events and workshops)
├── tickets            (Support and feature requests)
└── sessions           (User session management)
```

## 📝 Model Definitions

### 1. User Model (`models/User.js`)

**Purpose**: Stores user profiles, authentication data, and contribution statistics.

```javascript
{
  githubId: String (required, unique),      // GitHub user ID
  username: String (required),              // GitHub username
  displayName: String,                      // Full display name
  email: String (required),                 // Primary email address
  avatarUrl: String,                        // GitHub profile picture URL
  mergedPRs: [{                            // Successfully merged contributions
    repoId: String,                         // Repository identifier
    prNumber: Number,                       // Pull request number
    title: String,                          // PR title
    mergedAt: Date                          // Merge timestamp
  }],
  cancelledPRs: [{                         // Rejected/cancelled contributions
    repoId: String,                         // Repository identifier
    prNumber: Number,                       // Pull request number
    title: String,                          // PR title
    cancelledAt: Date,                      // Cancellation timestamp
    rejectionReason: String                 // Admin-provided reason
  }],
  points: Number (default: 0),              // Total contribution points
  badges: [String] (default: ['Newcomer']), // Earned achievement badges
  joinedAt: Date (default: Date.now),       // Registration timestamp
  welcomeEmailSent: Boolean (default: false) // Email notification status
}
```

**Indexes**: 
- `githubId`: Unique index for fast user lookup
- `username`: Index for username-based queries
- `points`: Index for leaderboard sorting

### 2. Repository Model (`models/Repo.js`)

**Purpose**: Manages registered open-source projects available for contributions.

```javascript
{
  repoLink: String (required, unique),      // GitHub repository URL
  ownerName: String (required),             // Repository maintainer name
  technology: [String] (required),          // Programming languages/frameworks
  description: String (required),           // Project description
  userId: String (required),                // Maintainer's GitHub ID
  submittedAt: Date (default: Date.now),    // Submission timestamp
  reviewStatus: String {                    // Admin review status
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  reviewedAt: Date,                         // Review completion timestamp
  reviewedBy: String,                       // Reviewing admin username
  successPoints: Number (default: 50)       // Points awarded per contribution
}
```

**Indexes**:
- `repoLink`: Unique index to prevent duplicates
- `reviewStatus`: Index for admin filtering
- `userId`: Index for maintainer queries

### 3. PendingPR Model (`models/PendingPR.js`)

**Purpose**: Tracks pull request submissions awaiting admin approval.

```javascript
{
  userId: String (required, indexed),       // Contributor's GitHub ID
  username: String (required, indexed),     // Contributor's GitHub username
  repoId: String (required),                // Repository identifier (legacy)
  repoUrl: String (required, indexed),      // Repository URL
  prNumber: Number (required, indexed),     // Pull request number
  title: String (required),                 // PR title
  mergedAt: Date (required),                // PR merge timestamp
  suggestedPoints: Number {                 // Proposed point value
    default: 50,
    min: 0,
    max: 1000
  },
  status: String {                          // Review status
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    indexed: true
  },
  reviewedBy: String,                       // Reviewing admin username
  reviewedAt: Date,                         // Review completion timestamp
  rejectionReason: String,                  // Admin rejection explanation
  submittedAt: Date (default: Date.now, indexed) // Submission timestamp
}
```

**Compound Indexes**:
- `{userId, repoUrl, prNumber}`: Unique constraint to prevent duplicate submissions
- `{username, repoUrl, prNumber}`: Alternative lookup index
- `{status, submittedAt}`: Admin filtering and sorting
- `{userId, status}`: User-specific status queries

### 4. Event Model (`models/Event.js`)

**Purpose**: Manages community events, workshops, and meetings.

```javascript
{
  name: String (required),                  // Event title
  date: Date (required),                    // Event date
  time: String (required),                  // Event time
  description: String (required),           // Event description
  type: String {                           // Event category
    enum: ['workshop', 'webinar', 'hackathon', 'meetup', 'conference'],
    required: true
  },
  mode: String {                           // Event delivery mode
    enum: ['online', 'offline', 'hybrid'],
    required: true
  },
  totalSlots: Number,                      // Maximum attendees (offline/hybrid only)
  filledSlots: Number (default: 0),        // Current attendee count
  registerLink: String (required),         // Registration URL
  venue: String,                           // Physical location (offline/hybrid only)
  address: String,                         // Full address (offline/hybrid only)
  meetingLink: String,                     // Virtual meeting URL
  speakers: [String] (required),           // Speaker names
  createdBy: String (required),            // Event creator username
  createdAt: Date (default: Date.now)      // Creation timestamp
}
```

**Conditional Requirements**:
- `totalSlots`, `venue`, `address`: Required for offline/hybrid events
- `meetingLink`: Optional for online events

### 5. Ticket Model (`models/Ticket.js`)

**Purpose**: Handles user support requests and feature suggestions.

```javascript
{
  title: String {                          // Ticket title
    required: true,
    trim: true,
    maxlength: 200
  },
  description: String {                    // Detailed description
    required: true,
    maxlength: 2000
  },
  priority: String {                       // Issue priority level
    enum: ['low', 'medium', 'high', 'urgent'],
    required: true,
    default: 'medium'
  },
  category: String {                       // Issue categorization
    enum: ['technical', 'account', 'feature', 'bug', 'other'],
    required: true
  },
  status: String {                         // Current status
    enum: ['open', 'in_progress', 'closed'],
    default: 'open'
  },
  contactEmail: String {                   // Alternative contact
    trim: true,
    lowercase: true
  },
  userId: String (required),               // Creator's GitHub ID
  githubUsername: String (required),       // Creator's GitHub username
  userEmail: String (required),            // Creator's email
  assignedTo: String,                      // Assigned admin username
  resolvedBy: String,                      // Resolving admin username
  resolution: String {                     // Resolution details
    maxlength: 1000
  },
  scheduledForDeletion: Date,              // Auto-deletion timestamp
  deletionScheduledBy: String,             // Admin who scheduled deletion
  createdAt: Date (default: Date.now),     // Creation timestamp
  updatedAt: Date (default: Date.now),     // Last modification
  resolvedAt: Date                         // Resolution timestamp
}
```

**Indexes**:
- `{userId, createdAt}`: User ticket history
- `{status, priority}`: Admin filtering
- `githubUsername`: Username-based queries
- `createdAt`: Chronological sorting

## 🔗 Relationships & Data Flow

### User-Repository Relationship
- **One-to-Many**: A user can maintain multiple repositories
- **Many-to-Many**: Users can contribute to repositories owned by others
- **Point Attribution**: Contributors earn points from repositories they don't own

### User-PendingPR Relationship
- **One-to-Many**: A user can submit multiple PR reviews
- **Validation**: Unique constraint prevents duplicate submissions
- **Status Tracking**: Pending → Approved/Rejected workflow

### Event-User Relationship
- **Creator Relationship**: Events are created by admin users
- **Attendance Tracking**: Slot management for capacity planning
- **Registration**: External registration link integration

### Ticket-User Relationship
- **One-to-Many**: Users can create multiple support tickets
- **Assignment**: Tickets can be assigned to admin users
- **Resolution Tracking**: Complete lifecycle management

## 🔄 Data Lifecycle Management

### User Data Lifecycle
1. **Creation**: GitHub OAuth creates user profile
2. **Updates**: Profile data synced from GitHub periodically
3. **Activity**: Points and badges updated based on contributions
4. **Retention**: User data preserved for contribution history

### Repository Data Lifecycle
1. **Submission**: User submits repository for approval
2. **Review**: Admin evaluates and approves/rejects
3. **Active**: Approved repositories accept contributions
4. **Maintenance**: Periodic validation of repository accessibility

### Contribution Data Lifecycle
1. **Detection**: PR merges detected via GitHub integration
2. **Submission**: Users submit PRs for point approval
3. **Review**: Admin validates and approves/rejects
4. **Attribution**: Approved PRs contribute to user points and badges

### Event Data Lifecycle
1. **Creation**: Admin creates event with details
2. **Registration**: Users register via external links
3. **Tracking**: Slot filling monitored for capacity
4. **Completion**: Post-event data retention for history

### Ticket Data Lifecycle
1. **Creation**: User submits support request
2. **Assignment**: Admin assigns ticket for resolution
3. **Progress**: Status updates throughout resolution
4. **Closure**: Resolution and optional auto-deletion

## 📊 Performance Considerations

### Indexing Strategy
- **Compound Indexes**: Multi-field queries optimization
- **Sparse Indexes**: Optional field optimization
- **TTL Indexes**: Automatic session cleanup

### Query Optimization
- **Projection**: Selective field retrieval
- **Aggregation Pipelines**: Complex data analysis
- **Pagination**: Large dataset handling

### Data Validation
- **Schema Validation**: Mongoose schema enforcement
- **Business Logic**: Application-level validation
- **Constraints**: Database-level uniqueness and references

This documentation provides the foundation for understanding DevSync's data architecture and can guide future database modifications and optimizations.
