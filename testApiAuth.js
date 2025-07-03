#!/usr/bin/env node
/**
 * Test script to verify API key authentication is working
 * 
 * Usage: node testApiAuth.js [api-key]
 */

const http = require('http');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const API_KEY = process.argv[2] || process.env.API_SECRET_KEY;

async function makeRequest(path, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, SERVER_URL);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function testEndpoint(name, path, headers = {}) {
    try {
        console.log(`\n🔍 Testing ${name}:`);
        console.log(`   ${path}`);

        const result = await makeRequest(path, headers);

        if (result.status === 200) {
            console.log(`   ✅ Status: ${result.status} - OK`);
        } else if (result.status === 401) {
            console.log(`   🔒 Status: ${result.status} - Unauthorized (expected for protected endpoints)`);
        } else if (result.status === 429) {
            console.log(`   ⏳ Status: ${result.status} - Rate Limited`);
        } else {
            console.log(`   ❌ Status: ${result.status}`);
        }

        if (result.data.error) {
            console.log(`   Message: ${result.data.message || result.data.error}`);
        }

        return result;
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return null;
    }
}

async function main() {
    console.log('🚀 DevSync API Authentication Test');
    console.log('==================================');
    console.log(`Server: ${SERVER_URL}`);
    console.log(`API Key: ${API_KEY ? 'Provided' : 'Not provided'}`);

    // Test public endpoint
    await testEndpoint('Public Status Endpoint', '/api/status');

    // Test protected endpoint without API key
    await testEndpoint('Protected Endpoint (No Auth)', '/api/leaderboard');

    // Test protected endpoint with API key (if provided)
    if (API_KEY) {
        await testEndpoint('Protected Endpoint (With API Key)', '/api/leaderboard', {
            'x-api-key': API_KEY
        });
    } else {
        console.log('\n💡 To test with API key authentication:');
        console.log('   node testApiAuth.js your-api-key-here');
        console.log('   OR set API_SECRET_KEY environment variable');
    }

    // Test admin endpoint (should always fail without proper auth)
    await testEndpoint('Admin Endpoint (Should Fail)', '/api/admin/verify');

    console.log('\n📋 Test Summary:');
    console.log('• Public endpoints should return 200');
    console.log('• Protected endpoints without auth should return 401');
    console.log('• Protected endpoints with valid API key should return 200');
    console.log('• Rate limiting should activate after too many requests');
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { makeRequest, testEndpoint };
