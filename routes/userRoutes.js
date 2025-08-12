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
        const user = await User.findOne({ githubId: req.user.id }).populate('referredBy', 'name githubUsername');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('Stats endpoint - User data:', {
            githubId: req.user.id,
            referredBy: user.referredBy,
            referralCode: user.referralCode
        });

        res.json({
            mergedPRs: user.mergedPRs,
            cancelledPRs: user.cancelledPRs,
            points: user.points,
            badges: user.badges,
            referralCode: user.referralCode,
            referredBy: user.referredBy
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
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

// Verify referral code endpoint
router.post('/verify-referral', requireEmailVerification, async (req, res) => {
    try {
        const { referralCode } = req.body;

        if (!referralCode) {
            return res.status(400).json({ error: 'Referral code is required' });
        }

        // Find ambassador with this referral code
        const Ambassador = require('../models/Ambassador');
        const ambassador = await Ambassador.findOne({
            referralCode: referralCode.toUpperCase(),
            status: 'approved'
        });

        if (!ambassador) {
            return res.status(404).json({ error: 'Invalid or inactive referral code' });
        }

        // Check if user is already an ambassador (ambassadors cannot use referral codes)
        const existingAmbassador = await Ambassador.findOne({
            githubId: req.user.id,
            status: { $in: ['approved', 'pending'] }
        });

        if (existingAmbassador) {
            return res.status(400).json({ error: 'Ambassadors cannot use referral codes' });
        }

        // Check if user is trying to refer themselves
        if (ambassador.githubId === req.user.id) {
            return res.status(400).json({ error: 'You cannot use your own referral code' });
        }

        // Check if user already has a referral code set
        const user = await User.findOne({ githubId: req.user.id });
        console.log('Verify referral - User check:', {
            githubId: req.user.id,
            userExists: !!user,
            referredBy: user?.referredBy,
            referralCode: user?.referralCode
        });

        if (user && user.referredBy) {
            console.log('User already has referredBy:', user.referredBy);
            return res.status(400).json({ error: 'You have already used a referral code' });
        }

        // Get or create the user document first
        const updatedUser = await User.findOneAndUpdate(
            { githubId: req.user.id },
            {
                referredBy: ambassador._id,
                referralCode: referralCode.toUpperCase()
            },
            { upsert: true, new: true }
        );

        // Add user to ambassador's referred users list with proper structure
        await Ambassador.findByIdAndUpdate(
            ambassador._id,
            {
                $addToSet: {
                    referredUsers: {
                        userId: updatedUser._id,
                        joinedAt: new Date(),
                        verified: true
                    }
                }
            }
        );

        res.json({
            success: true,
            ambassadorId: ambassador._id,
            ambassadorName: ambassador.name
        });

    } catch (error) {
        console.error('Error verifying referral code:', error);
        res.status(500).json({ error: 'Failed to verify referral code' });
    }
});

// Temporary debug endpoint to check user's referral data
router.get('/debug-referral', requireEmailVerification, async (req, res) => {
    try {
        const user = await User.findOne({ githubId: req.user.id });
        const userWithPopulated = await User.findOne({ githubId: req.user.id }).populate('referredBy', 'name githubUsername');

        res.json({
            raw: {
                referredBy: user?.referredBy,
                referralCode: user?.referralCode
            },
            populated: {
                referredBy: userWithPopulated?.referredBy,
                referralCode: userWithPopulated?.referralCode
            }
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ error: 'Failed to fetch debug data' });
    }
});

// Temporary fix endpoint to clean up invalid referral data
router.post('/fix-referral-data', requireEmailVerification, async (req, res) => {
    try {
        const user = await User.findOne({ githubId: req.user.id });

        if (user) {
            // Check if referredBy exists and is valid
            if (user.referredBy) {
                try {
                    const Ambassador = require('../models/Ambassador');
                    const ambassador = await Ambassador.findById(user.referredBy);
                    if (!ambassador) {
                        // Invalid referredBy reference, clean it up
                        await User.updateOne(
                            { githubId: req.user.id },
                            { $unset: { referredBy: 1, referralCode: 1 } }
                        );
                        res.json({ message: 'Cleaned up invalid referral data', fixed: true });
                    } else {
                        res.json({ message: 'Referral data is valid', fixed: false });
                    }
                } catch (error) {
                    // Error finding ambassador, clean up the reference
                    await User.updateOne(
                        { githubId: req.user.id },
                        { $unset: { referredBy: 1, referralCode: 1 } }
                    );
                    res.json({ message: 'Cleaned up invalid referral data due to error', fixed: true });
                }
            } else {
                res.json({ message: 'No referral data to clean', fixed: false });
            }
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fixing referral data:', error);
        res.status(500).json({ error: 'Failed to fix referral data' });
    }
});

module.exports = router;