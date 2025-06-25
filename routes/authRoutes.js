const express = require('express');
const passport = require('passport');
const dotenv = require('dotenv');
dotenv.config();
const router = express.Router();

router.get('/github',
    passport.authenticate('github', { scope: ['user'] })
);

router.get('/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect(process.env.FRONTEND_URL);
    }
);

module.exports = router;