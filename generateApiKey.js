#!/usr/bin/env node
/**
 * Generate a secure API key for the DevSync application
 * Usage: node generateApiKey.js
 */

const crypto = require('crypto');

function generateSecureApiKey(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

function main() {
    console.log('🔐 DevSync API Key Generator\n');

    const apiKey = generateSecureApiKey(32);

    console.log('Generated API Key:');
    console.log('==================');
    console.log(apiKey);
    console.log('==================\n');

    console.log('📋 Copy this to your .env file:');
    console.log(`API_SECRET_KEY=${apiKey}\n`);

    console.log('⚠️  Security Tips:');
    console.log('• Store this key securely and never commit it to version control');
    console.log('• Use different keys for development, staging, and production');
    console.log('• Rotate your API keys regularly (monthly recommended)');
    console.log('• Only share this key with authorized team members');
    console.log('• Always use HTTPS in production environments\n');

    console.log('📝 Usage in API requests:');
    console.log('Include this header in your requests:');
    console.log('x-api-key: ' + apiKey);
}

if (require.main === module) {
    main();
}

module.exports = { generateSecureApiKey };
