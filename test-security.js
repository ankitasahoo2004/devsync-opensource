// Test script to verify VPN and API security implementation
const { generateSecureKey, generateTimestampedKey, validateKeyFormat, SecureAPIClient } = require('./utils/generateKeys');

console.log('=== Security Implementation Test ===\n');

// Test 1: Key Generation
console.log('1. Testing Key Generation:');
const apiKey = generateSecureKey(32);
const vpnKey = generateSecureKey(32);
const timestampedKey = generateTimestampedKey();

console.log('  ✅ API Key generated (32 bytes):', apiKey.length === 64 ? 'PASS' : 'FAIL');
console.log('  ✅ VPN Key generated (32 bytes):', vpnKey.length === 64 ? 'PASS' : 'FAIL');
console.log('  ✅ Timestamped Key generated:', timestampedKey.includes('-') ? 'PASS' : 'FAIL');

// Test 2: Key Validation
console.log('\n2. Testing Key Validation:');
console.log('  ✅ Valid key format:', validateKeyFormat(apiKey) ? 'PASS' : 'FAIL');
console.log('  ✅ Invalid key rejected:', !validateKeyFormat('invalid-key') ? 'PASS' : 'FAIL');

// Test 3: API Client Creation
console.log('\n3. Testing API Client:');
try {
    const client = new SecureAPIClient(apiKey, vpnKey);
    console.log('  ✅ Client created successfully: PASS');
    console.log('  ✅ API Key set:', client.apiKey === apiKey ? 'PASS' : 'FAIL');
    console.log('  ✅ VPN Key set:', client.vpnKey === vpnKey ? 'PASS' : 'FAIL');
} catch (error) {
    console.log('  ❌ Client creation failed:', error.message);
}

// Test 4: Environment Variables Check
console.log('\n4. Testing Environment Variables:');
require('dotenv').config();
console.log('  ✅ API_SECRET_KEY exists:', process.env.API_SECRET_KEY ? 'PASS' : 'FAIL');
console.log('  ✅ VPN_API_KEY exists:', process.env.VPN_API_KEY ? 'PASS' : 'FAIL');

console.log('\n=== Test Complete ===');
