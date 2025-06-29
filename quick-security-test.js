#!/usr/bin/env node

/**
 * DevSync Quick Security Test Script
 * 
 * Quick validation script to test key security endpoints
 */
const dotenv = require('dotenv');
dotenv.config();

const http = require('http');

const API_KEY = process.env.API_SECRET_KEY;
const VPN_KEY = process.env.VPN_API_KEY;
const BASE_URL = 'http://localhost:3000';

const quickTests = [
    { name: 'Public Route', path: '/api/events', auth: 'none', expectSuccess: true },
    { name: 'Protected Route (no key)', path: '/api/user', auth: 'none', expectSuccess: false },
    { name: 'Protected Route (with key)', path: '/api/user', auth: 'api', expectSuccess: true },
    { name: 'VPN Route (with VPN key)', path: '/api/vpn/admin-data', auth: 'vpn', expectSuccess: true }
];

function makeQuickRequest(test) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: test.path,
            method: 'GET',
            headers: {}
        };

        if (test.auth === 'api') {
            options.headers['x-api-key'] = API_KEY;
        } else if (test.auth === 'vpn') {
            options.headers['x-vpn-key'] = VPN_KEY;
        }

        const req = http.request(options, (res) => {
            const success = test.expectSuccess ? (res.statusCode < 400) : (res.statusCode >= 400);
            console.log(`${success ? '✅' : '❌'} ${test.name}: ${res.statusCode} ${success ? 'PASS' : 'FAIL'}`);
            resolve(success);
        });

        req.on('error', (err) => {
            console.log(`❌ ${test.name}: ERROR - ${err.message}`);
            resolve(false);
        });

        req.setTimeout(5000, () => {
            console.log(`❌ ${test.name}: TIMEOUT`);
            req.destroy();
            resolve(false);
        });

        req.end();
    });
}

async function runQuickTests() {
    console.log('🚀 DevSync Quick Security Check\n');
    
    let passed = 0;
    const total = quickTests.length;

    for (const test of quickTests) {
        const result = await makeQuickRequest(test);
        if (result) passed++;
        await new Promise(r => setTimeout(r, 100));
    }

    console.log(`\n📊 Results: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All security checks passed!');
    } else {
        console.log('⚠️  Some security checks failed. Run full test suite: node api-security-test.js');
    }
}

runQuickTests().catch(console.error);
