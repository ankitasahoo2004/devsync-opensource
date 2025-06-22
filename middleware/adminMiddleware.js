const dotenv = require('dotenv');
dotenv.config();

const isAdmin = (req, res, next) => {
    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (req.isAuthenticated() && adminIds.includes(req.user.username)) {
        return next();
    }
    res.status(403).json({ error: 'Not authorized' });
};

module.exports = { isAdmin };