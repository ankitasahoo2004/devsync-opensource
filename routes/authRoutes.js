const express = require('express');
const passport = require('passport');
const dotenv = require('dotenv');
dotenv.config();
const app = express();

app.get('/auth/github',
    passport.authenticate('github', { scope: ['user'] })
);

app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect(process.env.FRONTEND_URL);
    }
);

module.exports = app;