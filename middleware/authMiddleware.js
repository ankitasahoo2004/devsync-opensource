const dotenv = require('dotenv');
dotenv.config();

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
};

const isAdmin = (req, res, next) => {
    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (req.user && adminIds.includes(req.user.username)) {
        return next();
    }
    res.status(403).json({ error: 'Not authorized. Admin access required.' });
};

module.exports = { isAuthenticated, isAdmin };