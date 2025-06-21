const express = require('express');
const User = require('../models/User');
const Repo = require('../models/Repo');
const { Octokit } = require('@octokit/rest');
const dotenv = require('dotenv');
dotenv.config();
const app = express();
const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });
const PROGRAM_START_DATE = '2025-03-14';
const fetch = require('node-fetch');
const { fetchPRDetails, submitPRForApproval, getApprovedMergedPRs, calculatePointsFromApprovedPRs, checkBadges } = require('../utils/githubUtils');

// Update GitHub API routes with Octokit
app.get('/api/github/user/:username', async (req, res) => {
    try {
        const { data: userData } = await octokit.users.getByUsername({
            username: req.params.username
        });

        // Get user's contributions using GraphQL API
        const { data: contributionsData } = await octokit.graphql(`
            query($username: String!) {
                user(login: $username) {
                    contributionsCollection {
                        totalCommitContributions
                    }
                }
            }
        `, { username: req.params.username });

        res.json({
            ...userData,
            contributions: contributionsData.user.contributionsCollection.totalCommitContributions
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch GitHub data' });
    }
});

app.get('/api/github/contributions/:username', async (req, res) => {
    try {
        const response = await fetch(
            `https://github-contributions-api.now.sh/v1/${req.params.username}`
        );
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch contribution data' });
    }
});

// Modified PR status update endpoint with better error handling
app.get('/api/github/prs/update', async (req, res) => {
    try {
        const users = await User.find({}).lean();
        const results = [];

        const acceptedRepos = await Repo.find({
            reviewStatus: 'accepted'
        }, 'repoLink successPoints userId').lean();

        // Process users in batches to avoid hitting rate limits
        const BATCH_SIZE = 3; // Reduced batch size for better error handling
        const BATCH_DELAY = 6000; // Increased delay between batches

        for (let i = 0; i < users.length; i += BATCH_SIZE) {
            const userBatch = users.slice(i, i + BATCH_SIZE);

            const batchResults = await Promise.allSettled(userBatch.map(async (user) => {
                try {
                    console.log(`Processing user: ${user.username}`);

                    const prData = await fetchPRDetails(user.username);
                    const newSubmissions = [];
                    const skippedDuplicates = [];

                    for (const pr of prData.items) {
                        try {
                            const [owner, repo] = pr.repository_url.split('/repos/')[1].split('/');
                            const repoUrl = `https://github.com/${owner}/${repo}`;

                            const registeredRepo = acceptedRepos.find(repo => repo.repoLink === repoUrl);

                            if (registeredRepo) {
                                // Check if PR already exists before making API call
                                const existingPR = await PendingPR.findOne({
                                    $or: [
                                        { userId: user.githubId, repoUrl: repoUrl, prNumber: pr.number },
                                        { username: user.username, repoUrl: repoUrl, prNumber: pr.number }
                                    ]
                                });

                                if (existingPR) {
                                    skippedDuplicates.push({
                                        prNumber: pr.number,
                                        repoUrl: repoUrl,
                                        status: existingPR.status
                                    });
                                    continue;
                                }

                                const prDetails = await retryWithBackoff(async () => {
                                    const response = await octokit.pulls.get({
                                        owner,
                                        repo,
                                        pull_number: pr.number
                                    });
                                    return response.data;
                                });

                                if (prDetails.merged) {
                                    const submission = await submitPRForApproval(
                                        user.githubId,
                                        user.username,
                                        repoUrl,
                                        prDetails
                                    );

                                    if (submission && submission._id) {
                                        newSubmissions.push({
                                            prNumber: submission.prNumber,
                                            repoUrl: submission.repoUrl,
                                            title: submission.title
                                        });
                                    }
                                }
                            }
                        } catch (prError) {
                            console.error(`Error processing PR ${pr.number} for ${user.username}:`, prError.message);
                            continue;
                        }
                    }

                    // Update user's data based on approved PRs only
                    const approvedMergedPRs = await getApprovedMergedPRs(user.githubId);
                    const updatedPoints = await calculatePointsFromApprovedPRs(user.githubId);
                    const updatedBadges = await checkBadges(approvedMergedPRs, updatedPoints);

                    await User.findOneAndUpdate(
                        { githubId: user.githubId },
                        {
                            mergedPRs: approvedMergedPRs,
                            points: updatedPoints,
                            badges: updatedBadges
                        }
                    );

                    return {
                        username: user.username,
                        status: 'success',
                        newSubmissions: newSubmissions.length,
                        skippedDuplicates: skippedDuplicates.length,
                        approvedCount: approvedMergedPRs.length,
                        points: updatedPoints,
                        details: {
                            newSubmissions,
                            skippedDuplicates: skippedDuplicates.slice(0, 5) // Limit for response size
                        }
                    };
                } catch (userError) {
                    console.error(`Error processing user ${user.username}:`, userError.message);
                    return {
                        username: user.username,
                        status: 'error',
                        error: userError.message
                    };
                }
            }));

            // Handle both fulfilled and rejected promises
            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    const user = userBatch[index];
                    results.push({
                        username: user.username,
                        status: 'error',
                        error: result.reason?.message || 'Unknown error'
                    });
                }
            });

            // Delay between batches
            if (i + BATCH_SIZE < users.length) {
                console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}. Waiting before next batch...`);
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }
        }

        // Generate summary statistics
        const summary = {
            totalUsers: users.length,
            successfulUsers: results.filter(r => r.status === 'success').length,
            errorUsers: results.filter(r => r.status === 'error').length,
            totalNewSubmissions: results.reduce((sum, r) => sum + (r.newSubmissions || 0), 0),
            totalSkippedDuplicates: results.reduce((sum, r) => sum + (r.skippedDuplicates || 0), 0)
        };

        res.json({
            message: 'PR status update completed with improved duplicate handling',
            summary,
            results: results.slice(0, 50), // Limit response size
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in PR status update:', error);
        res.status(500).json({
            error: 'Failed to update PR status',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Enhanced GitHub API routes with Octokit
app.get('/api/github/user/:username', async (req, res) => {
    try {
        // Get basic user data
        const { data: userData } = await octokit.users.getByUsername({
            username: req.params.username
        });

        // Get contribution data using GraphQL
        const { data: { user } } = await octokit.graphql(`
            query($username: String!) {
                user(login: $username) {
                    contributionsCollection {
                        totalCommitContributions
                        contributionCalendar {
                            totalContributions
                            weeks {
                                contributionDays {
                                    contributionCount
                                    date
                                }
                            }
                        }
                    }
                }
            }
        `, {
            username: req.params.username
        });

        res.json({
            ...userData,
            contributions: user.contributionsCollection
        });
    } catch (error) {
        console.error('Error fetching GitHub user data:', error);
        res.status(500).json({ error: 'Failed to fetch GitHub data' });
    }
});

app.get('/api/github/events/:username/pushes', async (req, res) => {
    try {
        const { data } = await octokit.activity.listPublicEventsForUser({
            username: req.params.username,
            per_page: 10
        });

        const pushEvents = data.filter(event => event.type === 'PushEvent');
        res.json(pushEvents);
    } catch (error) {
        console.error('Error fetching push events:', error);
        res.status(500).json({ error: 'Failed to fetch push events' });
    }
});

app.get('/api/github/events/:username/prs', async (req, res) => {
    try {
        const { data } = await octokit.search.issuesAndPullRequests({
            q: `type:pr+author:${req.params.username}`,
            per_page: 10,
            sort: 'updated',
            order: 'desc'
        });
        res.json(data.items);
    } catch (error) {
        console.error('Error fetching PRs:', error);
        res.status(500).json({ error: 'Failed to fetch pull requests' });
    }
});

app.get('/api/github/events/:username/merges', async (req, res) => {
    try {
        const { data } = await octokit.search.issuesAndPullRequests({
            q: `type:pr+author:${req.params.username}+is:merged`,
            per_page: 10,
            sort: 'updated',
            order: 'desc'
        });
        res.json(data.items);
    } catch (error) {
        console.error('Error fetching merges:', error);
        res.status(500).json({ error: 'Failed to fetch merged PRs' });
    }
});

// Add GraphQL proxy endpoint for admin PR scanning
app.post('/api/github/graphql', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { query, variables } = req.body;

        const response = await octokit.graphql(query, variables);
        res.json({ data: response });
    } catch (error) {
        console.error('GraphQL query error:', error);
        res.status(500).json({
            error: 'GraphQL query failed',
            details: error.message
        });
    }
});

module.exports = app;