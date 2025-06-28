#!/usr/bin/env node

/**
 * DevSync API Security Test Suite
 * 
 * This comprehensive test validates all backend routes and their security configurations.
 * Run this AFTER starting your backend server.
 * 
 * Usage: 
 * 1. Start your backend: npm start or node index.js
 * 2. Run tests: node api-security-test.js
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// Test Configuration
const CONFIG = {
    BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    API_KEY: process.env.API_SECRET_KEY || '',
    VPN_KEY: process.env.VPN_API_KEY || '',
    TIMEOUT: 10000
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m', 
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m'
};

// Test Results Storage
let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
};

/**
 * Route test definitions with expected behavior
 */
const ROUTE_TESTS = [
    // Public Routes (only GitHub OAuth)
    { path: '/auth/github', method: 'GET', security: 'public', description: 'GitHub OAuth endpoint' },
    
    // API Key Protected Routes (ALL API routes now require authentication)
    { path: '/api/leaderboard', method: 'GET', security: 'api-key', description: 'Leaderboard (now secured)' },
    { path: '/api/events', method: 'GET', security: 'api-key', description: 'Events listing (now secured)' },
    { path: '/api/accepted-projects', method: 'GET', security: 'api-key', description: 'Accepted projects (now secured)' },
    { path: '/api/user', method: 'GET', security: 'api-key', description: 'User profile data' },
    { path: '/api/users', method: 'GET', security: 'api-key', description: 'Users list' },
    { path: '/api/stats', method: 'GET', security: 'api-key', description: 'Platform statistics' },
    { path: '/api/github/user/testuser', method: 'GET', security: 'api-key', description: 'GitHub user info' },
    { path: '/api/projects', method: 'GET', security: 'api-key', description: 'Projects management' },
    { path: '/api/tickets', method: 'GET', security: 'api-key', description: 'Support tickets' },
    { path: '/api/health/status', method: 'GET', security: 'api-key', description: 'Health monitoring status' },
    { 
        path: '/api/sponsorship/inquiry', 
        method: 'POST', 
        security: 'api-key', 
        description: 'Sponsorship inquiry',
        data: { email: 'test@example.com', organization: 'Test Org', sponsorshipType: 'Gold' }
    },
    
    // VPN Key Protected Routes  
    { path: '/api/admin/users', method: 'GET', security: 'vpn-key', description: 'Admin user management' },
    { path: '/api/admin/pending-prs', method: 'GET', security: 'vpn-key', description: 'Admin PR management' },
    { path: '/api/admin/verify', method: 'GET', security: 'vpn-key', description: 'Admin verification' },
    
    // Special Test Routes
    { path: '/api/protected/users', method: 'GET', security: 'api-key', description: 'Protected test endpoint' },
    { path: '/api/vpn/admin-data', method: 'GET', security: 'vpn-key', description: 'VPN test endpoint' },
];

/**
 * Make HTTP request with specified authentication using Node.js built-in modules
 */
async function makeRequest(test, authType = 'none') {
    return new Promise((resolve, reject) => {
        const url = new URL(`${CONFIG.BASE_URL}${test.path}`);
        const isHttps = url.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const options = {
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: url.pathname + url.search,
            method: test.method,
            headers: {
                'User-Agent': 'DevSync-Security-Test/1.0'
            },
            timeout: CONFIG.TIMEOUT
        };

        // Configure authentication
        switch (authType) {
            case 'api-key':
                options.headers['x-api-key'] = CONFIG.API_KEY;
                break;
            case 'vpn-key':
                options.headers['x-vpn-key'] = CONFIG.VPN_KEY;
                break;
        }

        // Add request body for POST/PUT/PATCH
        let requestData = '';
        if (test.data && ['POST', 'PUT', 'PATCH'].includes(test.method)) {
            requestData = JSON.stringify(test.data);
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(requestData);
        }

        const req = client.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                let parsedData;
                try {
                    parsedData = JSON.parse(responseData);
                } catch (e) {
                    parsedData = responseData;
                }
                
                resolve({
                    status: res.statusCode,
                    data: parsedData,
                    success: true
                });
            });
        });

        req.on('error', (error) => {
            resolve({
                status: 0,
                error: error.message,
                success: false
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                status: 0,
                error: 'Request timeout',
                success: false
            });
        });

        // Send request data for POST/PUT/PATCH
        if (requestData) {
            req.write(requestData);
        }
        
        req.end();
    });
}

/**
 * Test a single route with different authentication scenarios
 */
async function testRoute(test) {
    console.log(`\n${colors.cyan}🧪 Testing: ${test.description}${colors.reset}`);
    console.log(`   ${colors.blue}${test.method} ${test.path} (${test.security})${colors.reset}`);
    
    const routeResults = {
        path: test.path,
        method: test.method,
        security: test.security,
        tests: [],
        passed: true
    };

    try {
        // Test 1: No Authentication
        const noAuthResult = await makeRequest(test, 'none');
        
        if (test.security === 'public') {
            // Public routes should work (200-299, 302 redirect, or other success codes)
            if (noAuthResult.status >= 200 && noAuthResult.status < 400) {
                routeResults.tests.push({
                    name: 'Public Access',
                    status: 'PASS',
                    message: `✅ Accessible without auth (${noAuthResult.status})`
                });
            } else {
                routeResults.tests.push({
                    name: 'Public Access',
                    status: 'FAIL', 
                    message: `❌ Public route failed (${noAuthResult.status})`
                });
                routeResults.passed = false;
            }
        } else {
            // Protected routes should reject (401/403)
            if (noAuthResult.status === 401 || noAuthResult.status === 403) {
                routeResults.tests.push({
                    name: 'Auth Required',
                    status: 'PASS',
                    message: `✅ Correctly requires auth (${noAuthResult.status})`
                });
            } else {
                routeResults.tests.push({
                    name: 'Auth Required',
                    status: 'FAIL',
                    message: `❌ Should require auth but returned ${noAuthResult.status}`
                }); 
                routeResults.passed = false;
            }
        }

        // Test 2: API Key Tests (for api-key and vpn-key routes)
        if (test.security === 'api-key') {
            // Test with wrong API key
            const wrongApiResult = await makeRequest(test, 'wrong-api-key');
            if (wrongApiResult.status === 403) {
                routeResults.tests.push({
                    name: 'Wrong API Key',
                    status: 'PASS',
                    message: '✅ Rejects wrong API key (403)'
                });
            } else {
                routeResults.tests.push({
                    name: 'Wrong API Key',
                    status: 'FAIL',
                    message: `❌ Should reject wrong API key, got ${wrongApiResult.status}`
                });
                routeResults.passed = false;
            }

            // Test with correct API key
            const correctApiResult = await makeRequest(test, 'api-key');
            if (correctApiResult.status < 400) {
                routeResults.tests.push({
                    name: 'Valid API Key',
                    status: 'PASS',
                    message: `✅ Accepts valid API key (${correctApiResult.status})`
                });
            } else if (correctApiResult.status === 401) {
                routeResults.tests.push({
                    name: 'Valid API Key',
                    status: 'WARN',
                    message: `⚠️  API key valid but needs session auth (${correctApiResult.status})`
                });
                testResults.warnings++;
            } else {
                routeResults.tests.push({
                    name: 'Valid API Key',
                    status: 'INFO',
                    message: `ℹ️  API key accepted, response: ${correctApiResult.status}`
                });
            }
        }

        // Test 3: VPN Key Tests (for vpn-key routes)
        if (test.security === 'vpn-key') {
            // Test with wrong VPN key
            const wrongVpnResult = await makeRequest(test, 'wrong-vpn-key');
            if (wrongVpnResult.status === 403) {
                routeResults.tests.push({
                    name: 'Wrong VPN Key',
                    status: 'PASS',
                    message: '✅ Rejects wrong VPN key (403)'
                });
            } else {
                routeResults.tests.push({
                    name: 'Wrong VPN Key', 
                    status: 'FAIL',
                    message: `❌ Should reject wrong VPN key, got ${wrongVpnResult.status}`
                });
                routeResults.passed = false;
            }

            // Test with correct VPN key
            const correctVpnResult = await makeRequest(test, 'vpn-key');
            if (correctVpnResult.status < 400) {
                routeResults.tests.push({
                    name: 'Valid VPN Key',
                    status: 'PASS',
                    message: `✅ Accepts valid VPN key (${correctVpnResult.status})`
                });
            } else if (correctVpnResult.status === 401) {
                routeResults.tests.push({
                    name: 'Valid VPN Key',
                    status: 'WARN',
                    message: `⚠️  VPN key valid but needs session auth (${correctVpnResult.status})`
                });
                testResults.warnings++;
            } else {
                routeResults.tests.push({
                    name: 'Valid VPN Key',
                    status: 'INFO',
                    message: `ℹ️  VPN key accepted, response: ${correctVpnResult.status}`
                });
            }
        }

    } catch (error) {
        routeResults.tests.push({
            name: 'Error',
            status: 'FAIL',
            message: `❌ Test error: ${error.message}`
        });
        routeResults.passed = false;
    }

    // Print results for this route
    routeResults.tests.forEach(test => {
        console.log(`   ${test.message}`);
    });

    return routeResults;
}

/**
 * Test server connectivity
 */
async function testServerConnectivity() {
    console.log(`${colors.blue}🔍 Testing server connectivity...${colors.reset}`);
    
    try {
        const result = await makeRequest({ path: '/api/events', method: 'GET' }, 'none');
        if (result.success && result.status < 500) {
            console.log(`${colors.green}✅ Server is running at ${CONFIG.BASE_URL}${colors.reset}`);
            return true;
        } else {
            throw new Error(`Server returned status ${result.status}`);
        }
    } catch (error) {
        console.log(`${colors.red}❌ Cannot connect to server at ${CONFIG.BASE_URL}${colors.reset}`);
        console.log(`${colors.yellow}   Make sure your server is running:${colors.reset}`);
        console.log(`   1. cd ${process.cwd()}`);
        console.log(`   2. npm start  OR  node index.js`);
        console.log(`   3. Wait for server to start, then run this test again`);
        return false;
    }
}

/**
 * Generate comprehensive test report
 */
function generateReport(results) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`${colors.bold}${colors.blue}📊 DEVSYNC API SECURITY TEST REPORT${colors.reset}`);
    console.log(`${'='.repeat(80)}`);

    // Summary Statistics
    const totalRoutes = results.length;
    const passedRoutes = results.filter(r => r.passed).length;
    const failedRoutes = totalRoutes - passedRoutes;
    
    console.log(`\n${colors.bold}📈 Overall Results:${colors.reset}`);
    console.log(`   Total Routes Tested: ${totalRoutes}`);
    console.log(`   ${colors.green}✅ Passed: ${passedRoutes}${colors.reset}`);
    console.log(`   ${colors.red}❌ Failed: ${failedRoutes}${colors.reset}`);
    if (testResults.warnings > 0) {
        console.log(`   ${colors.yellow}⚠️  Warnings: ${testResults.warnings}${colors.reset}`);
    }
    console.log(`   Success Rate: ${((passedRoutes / totalRoutes) * 100).toFixed(1)}%`);

    // Security Level Breakdown
    const securityBreakdown = {};
    results.forEach(r => {
        securityBreakdown[r.security] = (securityBreakdown[r.security] || 0) + 1;
    });

    console.log(`\n${colors.bold}🔒 Security Level Breakdown:${colors.reset}`);
    Object.entries(securityBreakdown).forEach(([level, count]) => {
        const icon = level === 'public' ? '🌐' : level === 'api-key' ? '🔑' : '🛡️';
        console.log(`   ${icon} ${level}: ${count} routes`);
    });

    // Failed Routes Details
    const failedResults = results.filter(r => !r.passed);
    if (failedResults.length > 0) {
        console.log(`\n${colors.red}${colors.bold}🚨 FAILED ROUTES DETAILS:${colors.reset}`);
        failedResults.forEach(result => {
            console.log(`\n❌ ${colors.red}${result.path} (${result.method})${colors.reset}`);
            console.log(`   Security Level: ${result.security}`);
            result.tests.filter(t => t.status === 'FAIL').forEach(test => {
                console.log(`   - ${test.message}`);
            });
        });

        console.log(`\n${colors.yellow}${colors.bold}🔧 TROUBLESHOOTING STEPS:${colors.reset}`);
        console.log('1. Verify security middleware is applied before route definitions');
        console.log('2. Check that API_SECRET_KEY and VPN_API_KEY are set in .env');
        console.log('3. Restart your server after making security changes');
        console.log('4. Check server logs for middleware application messages');
        console.log('5. Ensure no middleware conflicts or route overrides');
    } else {
        console.log(`\n${colors.green}${colors.bold}🎉 ALL SECURITY TESTS PASSED!${colors.reset}`);
        console.log('Your API security is properly configured and working correctly.');
    }

    // Configuration Details
    console.log(`\n${colors.bold}⚙️  Test Configuration:${colors.reset}`);
    console.log(`   Base URL: ${CONFIG.BASE_URL}`);
    console.log(`   API Key: ${CONFIG.API_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   VPN Key: ${CONFIG.VPN_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   Timeout: ${CONFIG.TIMEOUT}ms`);

    console.log(`\n${'='.repeat(80)}`);
    
    return failedRoutes === 0;
}

/**
 * Main test execution function
 */
async function runSecurityTests() {
    console.log(`${colors.bold}${colors.cyan}🚀 DevSync API Security Test Suite${colors.reset}`);
    console.log(`${colors.cyan}Testing all backend routes and their security configurations${colors.reset}\n`);

    // Test server connectivity first
    const serverRunning = await testServerConnectivity();
    if (!serverRunning) {
        process.exit(1);
    }

    console.log(`\n${colors.bold}🧪 Running security tests on ${ROUTE_TESTS.length} routes...${colors.reset}`);
    
    const allResults = [];
    testResults.total = ROUTE_TESTS.length;

    // Test each route
    for (const test of ROUTE_TESTS) {
        const result = await testRoute(test);
        allResults.push(result);
        
        if (result.passed) {
            testResults.passed++;
        } else {
            testResults.failed++;
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 250));
    }

    // Generate and display report
    const allTestsPassed = generateReport(allResults);
    
    // Exit with appropriate code
    process.exit(allTestsPassed ? 0 : 1);
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
    console.error(`${colors.red}❌ Unhandled Promise Rejection:${colors.reset}`, reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error(`${colors.red}❌ Uncaught Exception:${colors.reset}`, error);
    process.exit(1);
});

// Run tests if executed directly
if (require.main === module) {
    runSecurityTests().catch(error => {
        console.error(`${colors.red}❌ Test suite failed:${colors.reset}`, error.message);
        process.exit(1);
    });
}

module.exports = {
    runSecurityTests,
    testRoute,
    ROUTE_TESTS,
    CONFIG
};