const { Octokit } = require('@octokit/rest');
const dotenv = require('dotenv');
dotenv.config();

// Create authenticated Octokit instance
const octokit = new Octokit({
    auth: process.env.GITHUB_ACCESS_TOKEN
});

module.exports = octokit;