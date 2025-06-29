const http = require('http');
const WebSocket = require('ws');
const { getAllRoutesSecurity } = require('./security-config');

/**
 * DevSync Real-Time Health Monitor
 * 
 * Monitors all API routes in real-time and provides:
 * - Route status monitoring
 * - Security validation
 * - Performance metrics
 * - Real-time alerts
 */

class HealthMonitor {
    constructor(config = {}) {
        this.config = {
            baseUrl: config.baseUrl || 'http://localhost:3000',
            apiKey: config.apiKey || process.env.API_SECRET_KEY || '',
            vpnKey: config.vpnKey || process.env.VPN_API_KEY || '',
            interval: config.interval || 30000, // 30 seconds
            timeout: config.timeout || 10000,
            ...config
        };

        this.routes = this.getMonitoringRoutes();
        this.results = new Map();
        this.subscribers = new Set();
        this.isRunning = false;
        this.intervalId = null;
        this.startTime = Date.now();
    }

    /**
     * Get routes to monitor based on security configuration
     */
    getMonitoringRoutes() {
        const securityConfig = getAllRoutesSecurity();
        
        return [
            // Public routes
            { path: '/auth/github', method: 'GET', security: 'public', critical: true },
            
            // API Key routes
            { path: '/api/leaderboard', method: 'GET', security: 'api-key', critical: true },
            { path: '/api/events', method: 'GET', security: 'api-key', critical: true },
            { path: '/api/accepted-projects', method: 'GET', security: 'api-key', critical: true },
            { path: '/api/user', method: 'GET', security: 'api-key', critical: true },
            { path: '/api/users', method: 'GET', security: 'api-key', critical: false },
            { path: '/api/stats', method: 'GET', security: 'api-key', critical: false },
            { path: '/api/github/user/test', method: 'GET', security: 'api-key', critical: false },
            { path: '/api/projects', method: 'GET', security: 'api-key', critical: true },
            { path: '/api/tickets', method: 'GET', security: 'api-key', critical: false },
            
            // VPN Key routes
            { path: '/api/admin/verify', method: 'GET', security: 'vpn-key', critical: true },
            { path: '/api/vpn/admin-data', method: 'GET', security: 'vpn-key', critical: false },
            
            // Test endpoints
            { path: '/api/protected/users', method: 'GET', security: 'api-key', critical: false }
        ];
    }

    /**
     * Make HTTP request to test route
     */
    async testRoute(route) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const url = new URL(`${this.config.baseUrl}${route.path}`);
            
            const options = {
                hostname: url.hostname,
                port: url.port || 80,
                path: url.pathname + url.search,
                method: route.method,
                headers: {},
                timeout: this.config.timeout
            };

            // Add authentication based on security level
            if (route.security === 'api-key') {
                options.headers['x-api-key'] = this.config.apiKey;
            } else if (route.security === 'vpn-key') {
                options.headers['x-vpn-key'] = this.config.vpnKey;
            }

            const req = http.request(options, (res) => {
                const responseTime = Date.now() - startTime;
                let data = '';
                
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        route: route.path,
                        method: route.method,
                        security: route.security,
                        critical: route.critical,
                        status: res.statusCode,
                        responseTime,
                        success: res.statusCode < 400,
                        timestamp: new Date(),
                        error: null
                    });
                });
            });

            req.on('error', (error) => {
                resolve({
                    route: route.path,
                    method: route.method,
                    security: route.security,
                    critical: route.critical,
                    status: 0,
                    responseTime: Date.now() - startTime,
                    success: false,
                    timestamp: new Date(),
                    error: error.message
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    route: route.path,
                    method: route.method,
                    security: route.security,
                    critical: route.critical,
                    status: 0,
                    responseTime: this.config.timeout,
                    success: false,
                    timestamp: new Date(),
                    error: 'Request timeout'
                });
            });

            req.end();
        });
    }

    /**
     * Test all routes and update results
     */
    async runHealthCheck() {
        console.log(`🔍 Running health check on ${this.routes.length} routes...`);
        
        const promises = this.routes.map(route => this.testRoute(route));
        const results = await Promise.all(promises);
        
        // Update results map
        results.forEach(result => {
            this.results.set(result.route, result);
        });

        // Generate summary
        const summary = this.generateSummary(results);
        
        // Notify subscribers
        this.notifySubscribers({
            type: 'health-update',
            timestamp: new Date(),
            summary,
            routes: results
        });

        return summary;
    }

    /**
     * Generate health summary
     */
    generateSummary(results) {
        const total = results.length;
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const criticalFailed = results.filter(r => !r.success && r.critical).length;
        const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / total;

        const status = criticalFailed > 0 ? 'CRITICAL' : 
                     failed > 0 ? 'WARNING' : 'HEALTHY';

        return {
            status,
            total,
            successful,
            failed,
            criticalFailed,
            avgResponseTime: Math.round(avgResponseTime),
            uptime: Date.now() - this.startTime,
            lastCheck: new Date()
        };
    }

    /**
     * Start continuous monitoring
     */
    start() {
        if (this.isRunning) {
            console.log('Health monitor is already running');
            return;
        }

        console.log('🚀 Starting DevSync Health Monitor...');
        console.log(`   Monitoring ${this.routes.length} routes`);
        console.log(`   Check interval: ${this.config.interval / 1000}s`);
        console.log(`   Base URL: ${this.config.baseUrl}`);

        this.isRunning = true;
        
        // Run initial check
        this.runHealthCheck();

        // Set up periodic checks
        this.intervalId = setInterval(() => {
            this.runHealthCheck();
        }, this.config.interval);

        console.log('✅ Health monitor started successfully');
    }

    /**
     * Stop monitoring
     */
    stop() {
        if (!this.isRunning) return;

        console.log('🛑 Stopping health monitor...');
        this.isRunning = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        console.log('✅ Health monitor stopped');
    }

    /**
     * Add subscriber for real-time updates
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        
        // Send current status to new subscriber
        if (this.results.size > 0) {
            const currentResults = Array.from(this.results.values());
            const summary = this.generateSummary(currentResults);
            
            callback({
                type: 'health-update',
                timestamp: new Date(),
                summary,
                routes: currentResults
            });
        }
    }

    /**
     * Remove subscriber
     */
    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }

    /**
     * Notify all subscribers
     */
    notifySubscribers(data) {
        this.subscribers.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error notifying health monitor subscriber:', error);
            }
        });
    }

    /**
     * Get current health status
     */
    getStatus() {
        if (this.results.size === 0) {
            return {
                status: 'UNKNOWN',
                message: 'No health check data available'
            };
        }

        const results = Array.from(this.results.values());
        return this.generateSummary(results);
    }

    /**
     * Get detailed route information
     */
    getRouteDetails() {
        return Array.from(this.results.values()).map(result => ({
            ...result,
            statusText: this.getStatusText(result)
        }));
    }

    /**
     * Get human-readable status text
     */
    getStatusText(result) {
        if (!result.success) {
            return result.error || `HTTP ${result.status}`;
        }
        
        if (result.status >= 200 && result.status < 300) {
            return 'OK';
        } else if (result.status >= 300 && result.status < 400) {
            return 'Redirect';
        } else {
            return `HTTP ${result.status}`;
        }
    }

    /**
     * Generate CLI report
     */
    printReport() {
        const status = this.getStatus();
        const routes = this.getRouteDetails();

        console.log('\n' + '='.repeat(80));
        console.log('📊 DEVSYNC HEALTH MONITOR REPORT');
        console.log('='.repeat(80));

        // Overall status
        const statusIcon = status.status === 'HEALTHY' ? '✅' : 
                          status.status === 'WARNING' ? '⚠️' : '🚨';
        
        console.log(`\n${statusIcon} Overall Status: ${status.status}`);
        console.log(`   Total Routes: ${status.total}`);
        console.log(`   Successful: ${status.successful}`);
        console.log(`   Failed: ${status.failed}`);
        if (status.criticalFailed > 0) {
            console.log(`   🚨 Critical Failed: ${status.criticalFailed}`);
        }
        console.log(`   Avg Response Time: ${status.avgResponseTime}ms`);
        console.log(`   Uptime: ${Math.round(status.uptime / 1000)}s`);

        // Route details
        console.log('\n📋 Route Details:');
        routes.forEach(route => {
            const icon = route.success ? '✅' : '❌';
            const critical = route.critical ? '🔥' : '';
            const security = route.security === 'public' ? '🌐' : 
                            route.security === 'api-key' ? '🔑' : '🛡️';
            
            console.log(`   ${icon} ${security} ${route.route} (${route.method}) - ${route.statusText} - ${route.responseTime}ms ${critical}`);
        });

        console.log('\n' + '='.repeat(80));
    }
}

/**
 * Create Express route for health monitoring API
 */
function createHealthRoute(monitor) {
    const express = require('express');
    const router = express.Router();

    // Get current health status
    router.get('/status', (req, res) => {
        const status = monitor.getStatus();
        const routes = monitor.getRouteDetails();
        
        res.json({
            ...status,
            routes,
            config: {
                interval: monitor.config.interval,
                timeout: monitor.config.timeout,
                baseUrl: monitor.config.baseUrl
            }
        });
    });

    // Force health check
    router.post('/check', async (req, res) => {
        try {
            const summary = await monitor.runHealthCheck();
            res.json({
                message: 'Health check completed',
                summary
            });
        } catch (error) {
            res.status(500).json({
                error: 'Health check failed',
                details: error.message
            });
        }
    });

    // Get route configuration
    router.get('/routes', (req, res) => {
        res.json({
            routes: monitor.routes,
            total: monitor.routes.length,
            critical: monitor.routes.filter(r => r.critical).length
        });
    });

    return router;
}

// Export for use as module
module.exports = {
    HealthMonitor,
    createHealthRoute
};

// CLI usage when run directly
if (require.main === module) {
    console.log('🚀 DevSync Health Monitor - CLI Mode');
    
    const monitor = new HealthMonitor({
        interval: process.env.HEALTH_CHECK_INTERVAL || 30000,
        baseUrl: process.env.BASE_URL || 'http://localhost:3000'
    });

    // Handle CLI arguments
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'start':
            monitor.start();
            
            // Print periodic reports
            setInterval(() => {
                monitor.printReport();
            }, 60000); // Every minute

            // Handle graceful shutdown
            process.on('SIGINT', () => {
                console.log('\n🛑 Shutting down health monitor...');
                monitor.stop();
                process.exit(0);
            });
            break;

        case 'check':
            monitor.runHealthCheck().then(() => {
                monitor.printReport();
                process.exit(0);
            }).catch(error => {
                console.error('Health check failed:', error);
                process.exit(1);
            });
            break;

        case 'status':
            // Quick status check
            monitor.runHealthCheck().then(() => {
                const status = monitor.getStatus();
                console.log(`Status: ${status.status}`);
                console.log(`Routes: ${status.successful}/${status.total} healthy`);
                if (status.criticalFailed > 0) {
                    console.log(`🚨 Critical failures: ${status.criticalFailed}`);
                    process.exit(1);
                }
                process.exit(0);
            });
            break;

        default:
            console.log('Usage:');
            console.log('  node health.js start   - Start continuous monitoring');
            console.log('  node health.js check   - Run single health check');
            console.log('  node health.js status  - Quick status check');
            process.exit(1);
    }
}
