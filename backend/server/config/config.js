const config = {
    development: {
        database: process.env.MONGODB_URI || 'mongodb://localhost:27017/devsync',
        clientURL: 'http://localhost:3000',
        frontendURL: 'http://localhost:5500'
    },
    production: {
        database: process.env.MONGODB_URI,
        clientURL: 'https://devsync-backend-rmk4.onrender.com',
        frontendURL: 'https://sayan-dev731.github.io/DevSync'
    }
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];
