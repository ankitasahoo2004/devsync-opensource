const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

// Generate secure API keys
function generateSecureKey(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

// Generate API key with timestamp
function generateTimestampedKey() {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${timestamp}-${randomBytes}`;
}

// Validate key format
function validateKeyFormat(key) {
    const keyRegex = /^[a-f0-9]{64,}$/i;
    return keyRegex.test(key);
}

console.log('Generated API Secret Key:', generateSecureKey());
console.log('Generated VPN Key:', generateSecureKey());
console.log('Generated Timestamped Key:', generateTimestampedKey());

class SecureAPIClient {
    constructor(apiKey, vpnKey = null) {
        this.apiKey = apiKey;
        this.vpnKey = vpnKey;
        this.baseURL = 'http://localhost:3000/api';
    }

    // Make authenticated API requests
    async makeRequest(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            ...options.headers
        };

        // Add VPN key if available
        if (this.vpnKey) {
            headers['x-vpn-key'] = this.vpnKey;
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Get protected data
    async getProtectedData() {
        return this.makeRequest('/protected/users');
    }

    // Get VPN-level data
    async getVpnData() {
        if (!this.vpnKey) {
            throw new Error('VPN key required for this endpoint');
        }
        return this.makeRequest('/vpn/admin-data');
    }
}

module.exports = {
    generateSecureKey,
    generateTimestampedKey,
    validateKeyFormat,
    SecureAPIClient
};

// Usage example
const apiClient = new SecureAPIClient('your-api-key-here', 'your-vpn-key-here');

// Example usage in your frontend
async function fetchSecureData() {
    try {
        const data = await apiClient.getProtectedData();
        console.log('Secure data:', data);
    } catch (error) {
        console.error('Failed to fetch secure data:', error.message);
    }
}