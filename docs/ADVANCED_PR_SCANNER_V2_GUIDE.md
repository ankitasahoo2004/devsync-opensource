# Advanced PR Scanner - Best Practices & Optimization Guide

## Overview

The Advanced PR Scanner v2.0 is designed to efficiently scan GitHub Pull Requests while respecting API rate limits (6000 requests/hour). This system ensures no user gets left behind through intelligent batching, adaptive rate limiting, and smart caching.

## 🎯 Key Features

### 1. **Intelligent Rate Limiting**
- **API Limit Management**: Monitors and respects GitHub's 6000 requests/hour limit
- **Adaptive Batching**: Automatically adjusts batch sizes based on remaining quota
- **Safety Buffer**: Keeps 200 requests as emergency buffer
- **Smart Delays**: Calculates optimal delays between batches

### 2. **Terminal-Style Interface**
- **Modern UI**: Dark terminal aesthetic with syntax highlighting
- **Real-time Logging**: Live command output with timestamps
- **Interactive Commands**: Terminal commands for advanced control
- **Progress Tracking**: Visual progress bars and ETA calculations

### 3. **Smart Optimization**
- **Caching System**: Reduces redundant API calls
- **User Prioritization**: Scans active users first
- **Duplicate Detection**: Prevents processing same PRs multiple times
- **Retry Logic**: Automatically retries failed operations

## 📊 Best Practices for Efficient Scanning

### Rate Limiting Strategy

```javascript
// Optimal settings for 6000 req/hour limit
const optimalSettings = {
    batchSize: 3,              // Users processed simultaneously
    delayBetweenBatches: 2000, // 2 second delay
    safetyBuffer: 200,         // Keep 200 requests as buffer
    emergencyDelay: 8000       // 8 second delay when approaching limits
};
```

**Why these settings work:**
- **3 users per batch**: Balances speed vs. API usage
- **2 second delays**: Allows ~1800 batches/hour (5400 requests with buffer)
- **Adaptive scaling**: Reduces batch size when approaching limits

### Smart User Prioritization

1. **Active Users First**: Users with recent activity get priority
2. **Skip Recent Scans**: Users scanned in last 24h are filtered out
3. **Failed User Retry**: Automatically retries failed scans
4. **Intelligent Caching**: Caches user data for 15 minutes

### API Call Optimization

```javascript
// Efficient GraphQL query for PR data
const prQuery = `
    query($username: String!) {
        user(login: $username) {
            pullRequests(
                first: 100,
                states: MERGED,
                orderBy: { field: UPDATED_AT, direction: DESC }
            ) {
                nodes {
                    number
                    title
                    mergedAt
                    repository { nameWithOwner }
                    baseRepository { nameWithOwner }
                }
            }
        }
    }
`;
```

**Benefits:**
- Single API call per user
- Gets all merged PRs efficiently
- Includes repository information
- Ordered by most recent first

## 🚀 Getting Started

### 1. Opening the Scanner
```javascript
// From admin panel
openAdvancedPRScan();

// Or directly
window.advancedPRScanManager.open();
```

### 2. Terminal Commands
```bash
start          # Begin PR scanning
pause          # Pause current scan
stop           # Stop current scan
retry          # Retry failed users
status         # Show scan status
settings       # Display settings
cache          # Show cache info
clear          # Clear terminal
help           # Show all commands
```

### 3. Configuration Options

#### Performance Settings
- **Batch Size**: 1-6 users (default: 3)
- **Batch Delay**: 1-8 seconds (default: 2s)
- **Smart Filtering**: Skip recently scanned users
- **Cache Duration**: 15 minutes

#### Advanced Features
- **Auto Retry**: Retry failed users automatically
- **Priority Scanning**: Process active users first
- **Emergency Mode**: Automatic rate limit protection

## 📈 Monitoring & Analytics

### Real-time Metrics
- **Progress**: Users processed vs. total
- **API Usage**: Calls used vs. remaining
- **ETA**: Estimated time to completion
- **Success Rate**: Successful scans vs. errors

### Results Tracking
- **New PRs Found**: Fresh submissions for review
- **Duplicates Skipped**: Previously processed PRs
- **Errors**: Failed user scans
- **Processing Time**: Total scan duration

## 🔧 Technical Implementation

### Rate Limit Management

```javascript
class RateLimitManager {
    constructor() {
        this.maxPerHour = 6000;
        this.safetyBuffer = 200;
        this.currentUsage = 0;
        this.resetTime = Date.now() + (60 * 60 * 1000);
    }
    
    async checkAndAdjustRateLimit() {
        const remaining = this.maxPerHour - this.currentUsage;
        
        if (remaining <= this.safetyBuffer) {
            // Reduce batch size and increase delays
            this.adjustForLowQuota();
        }
        
        // Auto-reset when hour passes
        if (Date.now() > this.resetTime) {
            this.resetQuota();
        }
    }
}
```

### Intelligent Batching

```javascript
async processUsersIntelligently(users, registeredRepos) {
    for (let i = 0; i < users.length; i += this.settings.batchSize) {
        const batch = users.slice(i, i + this.settings.batchSize);
        
        // Check rate limit before processing
        await this.checkAndAdjustRateLimit();
        
        // Process batch with error handling
        const results = await this.processBatch(batch, registeredRepos);
        
        // Calculate optimal delay for next batch
        const delay = this.calculateOptimalDelay();
        await this.sleep(delay);
    }
}
```

### Caching Strategy

```javascript
class CacheManager {
    constructor() {
        this.userPRs = new Map();
        this.repoData = new Map();
        this.userLastScanned = new Map();
        this.cacheDuration = 15 * 60 * 1000; // 15 minutes
    }
    
    isUserRecentlyScanned(userId) {
        const lastScanned = this.userLastScanned.get(userId);
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return lastScanned && lastScanned > dayAgo;
    }
}
```

## 📋 Troubleshooting

### Common Issues

1. **Rate Limit Exceeded**
   - Scanner automatically detects and adjusts
   - Increases delays and reduces batch sizes
   - Shows warning in terminal

2. **Failed User Scans**
   - Automatic retry mechanism
   - Manual retry command available
   - Error logging with details

3. **Slow Performance**
   - Check internet connection
   - Verify GitHub API status
   - Adjust batch settings

### Error Codes

- **401**: Authentication failed - check GitHub token
- **403**: Rate limit exceeded - wait for reset
- **404**: User/repo not found - normal, skip
- **500**: Server error - retry later

## 🔐 Security Considerations

1. **API Token Security**
   - Never expose tokens in client-side code
   - Use secure server-side proxy
   - Implement token rotation

2. **Rate Limit Compliance**
   - Always respect GitHub's limits
   - Implement proper delays
   - Monitor usage actively

3. **Data Privacy**
   - Only scan public repositories
   - Respect user privacy settings
   - Cache responsibly

## 📈 Performance Optimization Tips

### For Large User Bases (1000+ users)

```javascript
const largeScaleSettings = {
    batchSize: 2,              // Smaller batches
    delayBetweenBatches: 3000, // Longer delays
    smartFiltering: true,      // Essential for large scales
    cacheEnabled: true,        // Reduce redundant calls
    prioritizeActive: true     // Process active users first
};
```

### For Quick Scans (< 100 users)

```javascript
const quickScanSettings = {
    batchSize: 5,              // Larger batches
    delayBetweenBatches: 1500, // Shorter delays
    smartFiltering: false,     // Scan all users
    retryFailedUsers: true     // Ensure completeness
};
```

## 🎨 UI Customization

The terminal interface supports:
- **Custom themes**: Modify CSS variables
- **Color schemes**: Success, warning, error states
- **Font options**: Monospace fonts for terminal feel
- **Responsive design**: Works on all screen sizes

## 📊 Analytics & Reporting

### Export Features
- **Log Export**: Download scan logs as .txt
- **Results Summary**: Detailed scan statistics
- **Performance Metrics**: API usage and timing data
- **Error Reports**: Failed operations with details

## 🔄 Integration with Existing Systems

### Admin Panel Integration
```javascript
// Add to existing admin functions
function integrateAdvancedScanner() {
    // Replace existing PR scanner button
    const oldButton = document.querySelector('.legacy-scanner-btn');
    oldButton.onclick = () => window.advancedPRScanManager.open();
    
    // Add keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'p') {
            window.advancedPRScanManager.open();
        }
    });
}
```

### API Endpoint Usage
```javascript
// Required endpoints for scanner
const requiredEndpoints = [
    '/api/users',                    // Get all users
    '/api/admin/projects',           // Get registered repos
    '/api/admin/submit-pr',          // Submit PR for approval
    '/api/admin/all-prs',           // Check for duplicates
    '/api/github/graphql'           // GitHub GraphQL proxy
];
```

## 🚀 Future Enhancements

### Planned Features
1. **Machine Learning**: Predict optimal batch sizes
2. **Distributed Scanning**: Multiple API tokens
3. **Advanced Filtering**: Custom user criteria
4. **Webhook Integration**: Real-time PR notifications
5. **Analytics Dashboard**: Historical scan data

### Performance Improvements
1. **Worker Threads**: Parallel processing
2. **Database Optimization**: Faster duplicate checks
3. **CDN Integration**: Faster UI loading
4. **Compression**: Reduced bandwidth usage

---

## 📞 Support & Documentation

For technical support or questions about the Advanced PR Scanner:

1. **Check terminal logs**: Use `export-log` command
2. **Review error messages**: Check console output
3. **Verify API limits**: Monitor rate limit display
4. **Test with small batches**: Start with 1-2 users

The Advanced PR Scanner v2.0 represents a significant improvement in efficiency, user experience, and reliability for large-scale PR scanning operations while maintaining full respect for GitHub's API limitations.
