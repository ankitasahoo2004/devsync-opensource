const config = {
    development: {
        frontendUrl: 'http://localhost:5500',
        serverUrl: 'http://localhost:3000',
        corsOrigins: ['http://localhost:5500', 'http://127.0.0.1:5500'],
        github: {
            callbackURL: 'http://localhost:3000/auth/github/callback'
        }
    },
    production: {
        frontendUrl: 'https://sayan-dev731.github.io/devsync-opensource/',
        serverUrl: 'https://devsync-fpekg0cggua3abdp.centralus-01.azurewebsites.net',
        corsOrigins: ['https://sayan-dev731.github.io'],
        github: {
            callbackURL: 'https://devsync-fpekg0cggua3abdp.centralus-01.azurewebsites.net/auth/github/callback'
        }
    }
};

const environment = process.env.NODE_ENV || 'development';
module.exports = config[environment];
