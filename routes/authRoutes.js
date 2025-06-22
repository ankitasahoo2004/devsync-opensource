const express = require('express');
const passport = require('passport');
const dotenv = require('dotenv');
dotenv.config();
const router = express.Router();

router.get('/',
    passport.authenticate('github', { scope: ['user'] })
);

router.get('/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect(process.env.FRONTEND_URL);
    }
);

module.exports = router;