/**
 * Global Configuration Service
 * Loads configuration from the backend API and provides it to frontend JavaScript files
 */

class ConfigService {
    constructor() {
        this.config = null;
        this.loading = false;
        this.loadPromise = null;
    }

    async loadConfig() {
        // Return existing promise if already loading
        if (this.loading && this.loadPromise) {
            return this.loadPromise;
        }

        // Return cached config if already loaded
        if (this.config) {
            return this.config;
        }

        this.loading = true;
        this.loadPromise = this._fetchConfig();
        
        try {
            this.config = await this.loadPromise;
            return this.config;
        } catch (error) {
            console.warn('Failed to load config from API, using defaults:', error);
            // Fallback configuration
            this.config = {
                serverUrl: window.location.origin,
                adminIds: []
            };
            return this.config;
        } finally {
            this.loading = false;
            this.loadPromise = null;
        }
    }

    async _fetchConfig() {
        const response = await fetch('/api/config', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Config API responded with status: ${response.status}`);
        }

        return await response.json();
    }

    getConfig() {
        return this.config;
    }

    getServerUrl() {
        return this.config?.serverUrl || window.location.origin;
    }

    getAdminIds() {
        return this.config?.adminIds || [];
    }

    isAdmin(username) {
        const adminIds = this.getAdminIds();
        return adminIds.includes(username);
    }
}

// Create global instance
window.configService = new ConfigService();

// Backwards compatibility - expose config values globally once loaded
window.configService.loadConfig().then(config => {
    window.serverUrl = config.serverUrl;
    window.adminIds = config.adminIds;
    
    // Dispatch event to notify other scripts that config is loaded
    window.dispatchEvent(new CustomEvent('configLoaded', {
        detail: config
    }));
}).catch(error => {
    console.error('Failed to load initial configuration:', error);
});

// Export for module environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ConfigService;
}
