const express = require('express');
const User = require('../models/User');
const Repo = require('../models/Repo');
const { Octokit } = require('@octokit/rest');
const dotenv = require('dotenv');
dotenv.config();
const router = express.Router();
const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });
const PROGRAM_START_DATE = '2025-03-14';
const { requireEmailVerification, addEmailVerificationStatus } = require('../middleware/emailVerificationMiddleware');

router.get('/', addEmailVerificationStatus, (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            isAuthenticated: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                displayName: req.user.displayName,
                photos: req.user.photos
            },
            emailVerificationStatus: req.emailVerificationStatus
        });
    } else {
        res.json({ isAuthenticated: false });
    }
});

router.get('/stats', requireEmailVerification, async (req, res) => {
    try {
        const user = await User.findOne({ githubId: req.user.id });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            mergedPRs: user.mergedPRs,
            cancelledPRs: user.cancelledPRs,
            points: user.points,
            badges: user.badges
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user stats' });
    }
});

// Add new comprehensive user profile endpoint
router.get('/profile/:username', requireEmailVerification, async (req, res) => {
    try {
        // First check email verification for authenticated user viewing their own profile
        if (req.isAuthenticated() && req.user.username === req.params.username) {
            const user = await User.findOne({ githubId: req.user.id });
            if (user && !user.emailVerified) {
                return res.status(403).json({
                    error: 'Email verification required to view your profile',
                    emailVerificationRequired: true,
                    message: 'Please verify your email address to access your profile',
                    userEmail: user.email,
                    verificationEmailSent: user.verificationEmailSent || false
                });
            }
        }

        // Get GitHub user data and DevSync data
        const [userData, acceptedRepos, user] = await Promise.all([
            octokit.users.getByUsername({ username: req.params.username }),
            Repo.find({ reviewStatus: 'accepted' }, 'repoLink'),
            User.findOne({ username: req.params.username }, 'mergedPRs cancelledPRs')
        ]);

        // Use GraphQL to fetch pull requests
        const { search } = await octokit.graphql(`
            query($searchQuery: String!, $first: Int!) {
                search(
                    query: $searchQuery
                    type: ISSUE
                    first: $first
                ) {
                    nodes {
                        ... on PullRequest {
                            id
                            number
                            title
                            url
                            state
                            createdAt
                            updatedAt
                            mergedAt
                            closedAt
                            repository {
                                url
                                owner {
                                    login
                                }
                                name
                            }
                            author {
                                login
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `, {
            searchQuery: `type:pr author:${req.params.username} created:>=${PROGRAM_START_DATE}`,
            first: 10
        });

        // Transform GraphQL response to match expected format
        const pullRequests = await Promise.all(search.nodes.map(async (pr) => {
            const repoUrl = pr.repository.url;
            const isDevSyncRepo = acceptedRepos.some(repo => repo.repoLink === repoUrl);

            // Extract owner and repo from repository data
            const owner = pr.repository.owner.login;
            const repo = pr.repository.name;

            // Get additional PR details using REST API (still needed for merged status)
            const { data: prDetails } = await octokit.pulls.get({
                owner,
                repo,
                pull_number: pr.number
            });

            // Check if PR is detected by DevSync (approved)
            const isDevSyncDetected = user?.mergedPRs.some(
                mergedPr => mergedPr.repoId === repoUrl && mergedPr.prNumber === pr.number
            );

            // Check if PR is in cancelled/rejected list
            const isRejected = user?.cancelledPRs.some(
                cancelledPr => cancelledPr.repoId === repoUrl && cancelledPr.prNumber === pr.number
            );

            return {
                id: pr.id,
                title: pr.title,
                number: pr.number,
                state: pr.state.toLowerCase(),
                createdAt: pr.createdAt,
                url: pr.url,
                repository: `${owner}/${repo}`,
                isDevSyncRepo,
                merged: prDetails.merged || pr.state === 'MERGED',
                closed: pr.state === 'CLOSED' && pr.state !== 'MERGED',
                isDevSyncDetected: isDevSyncRepo ? isDevSyncDetected : false,
                isRejected: isDevSyncRepo ? isRejected : false
            };
        }));

        const profileData = {
            ...userData.data,
            pullRequests,
            programStartDate: PROGRAM_START_DATE // Add start date to response
        };

        res.json(profileData);
    } catch (error) {
        console.error('Error fetching profile data:', error);
        res.status(500).json({ error: 'Failed to fetch profile data' });
    }
});

module.exports = router;