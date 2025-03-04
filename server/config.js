const config = {
    development: {
        frontendUrl: 'http://localhost:5500',
        serverUrl: 'http://localhost:3000',
        corsOrigins: ['http://localhost:5500', 'http://127.0.0.1:5500']
    },
    production: {
        frontendUrl: 'https://sayan-dev731.github.io/devsync-opensource/',
        serverUrl: 'https://devsync-fpekg0cggua3abdp.centralus-01.azurewebsites.net',
        corsOrigins: ['https://sayan-dev731.github.io']
    }
};

const environment = process.env.NODE_ENV || 'development';
module.exports = config[environment];
