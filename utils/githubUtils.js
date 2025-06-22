const octokit = require('../config/octokit');
const PendingPR = require('../models/PendingPR');
const Repo = require('../models/Repo');
const dotenv = require('dotenv');
dotenv.config();
const prCache = new Map();
const PR_CACHE_TTL = 1000 * 60 * 60;
const PROGRAM_START_DATE = '2025-03-14';

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function calculateProfileCompleteness(user) {
    let completeness = 0;
    const fields = ['username', 'displayName', 'email', 'avatarUrl'];

    fields.forEach(field => {
        if (user[field] && user[field].trim() !== '') {
            completeness += 25; // Each field is worth 25%
        }
    });

    return Math.min(completeness, 100);
}

async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let retries = 0;
    while (true) {
        try {
            return await fn();
        } catch (error) {
            if (error.status === 403 && error.response?.data?.message?.includes('API rate limit exceeded')) {
                const resetTime = error.response?.headers?.['x-ratelimit-reset'];
                if (resetTime) {
                    const waitTime = (parseInt(resetTime) * 1000) - Date.now();
                    if (waitTime > 0 && waitTime < 15 * 60 * 1000) { // Wait up to 15 minutes
                        console.log(`Rate limit hit. Waiting for ${Math.ceil(waitTime / 1000)} seconds until reset...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime + 1000)); // Add 1 second buffer
                        continue;
                    }
                }

                retries++;
                if (retries >= maxRetries) throw error;

                const delay = initialDelay * Math.pow(2, retries);
                console.log(`Rate limit hit. Retrying in ${delay}ms (attempt ${retries} of ${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
}

async function submitPRForApproval(userId, username, repoUrl, prData) {
    try {
        // Enhanced duplicate check - check all possible combinations
        const existingPR = await PendingPR.findOne({
            $or: [
                {
                    userId: userId,
                    repoUrl: repoUrl,
                    prNumber: prData.number
                },
                {
                    userId: userId,
                    repoId: repoUrl,
                    prNumber: prData.number
                },
                {
                    username: username,
                    repoUrl: repoUrl,
                    prNumber: prData.number
                }
            ]
        });

        if (existingPR) {
            console.log(`PR already exists in database: ${username} - ${repoUrl}#${prData.number} (Status: ${existingPR.status})`);
            return existingPR;
        }

        // Get repo details for suggested points
        const repo = await Repo.findOne({ repoLink: repoUrl });
        const suggestedPoints = repo ? (repo.successPoints || 50) : 50;

        // Create new pending PR with all required fields
        const pendingPRData = {
            userId: userId,
            username: username,
            repoId: repoUrl,  // Keep for backward compatibility
            repoUrl: repoUrl, // Primary field
            prNumber: prData.number,
            title: prData.title,
            mergedAt: new Date(prData.merged_at),
            suggestedPoints: suggestedPoints,
            status: 'pending',
            submittedAt: new Date()
        };

        const pendingPR = await PendingPR.create(pendingPRData);

        console.log(`New PR submitted for approval: ${username} - ${repoUrl}#${prData.number}`);
        return pendingPR;
    } catch (error) {
        // Handle duplicate key errors gracefully
        if (error.code === 11000) {
            console.log(`Duplicate key error - PR already exists: ${username} - ${repoUrl}#${prData.number}`);

            // Try to find and return the existing PR
            const existingPR = await PendingPR.findOne({
                userId: userId,
                repoUrl: repoUrl,
                prNumber: prData.number
            });

            return existingPR;
        }

        console.error('Error submitting PR for approval:', error);
        return null;
    }
}

// Helper function to fetch PRs with caching and rate limit handling
async function fetchPRDetails(username) {
    try {
        // Check cache first
        const cacheKey = `prs:${username}`;
        const cachedData = prCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp) < PR_CACHE_TTL) {
            console.log(`Using cached PR data for ${username}`);
            return cachedData.data;
        }

        // Fetch with retry logic for rate limits
        const data = await retryWithBackoff(async () => {
            const response = await octokit.search.issuesAndPullRequests({
                q: `type:pr+author:${username}+is:merged+created:>=${PROGRAM_START_DATE}`,
                per_page: 100
            });
            return response.data;
        });

        // Cache the result
        prCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    } catch (error) {
        console.error(`Error fetching PRs for ${username}:`, error);
        // Return empty results on error after retries
        return { items: [] };
    }
}

// Helper function to get approved merged PRs for a user
async function getApprovedMergedPRs(userId) {
    try {
        const approvedPRs = await PendingPR.find({
            userId: userId,
            status: 'approved'
        });

        return approvedPRs.map(pr => ({
            repoId: pr.repoUrl,
            prNumber: pr.prNumber,
            title: pr.title,
            mergedAt: pr.mergedAt,
            points: pr.suggestedPoints
        }));
    } catch (error) {
        console.error('Error getting approved merged PRs:', error);
        return [];
    }
}

// Helper function to calculate points from approved PRs
async function calculatePointsFromApprovedPRs(userId) {
    try {
        const approvedPRs = await PendingPR.find({
            userId: userId,
            status: 'approved'
        });

        return approvedPRs.reduce((total, pr) => total + (pr.suggestedPoints || 50), 0);
    } catch (error) {
        console.error('Error calculating points from approved PRs:', error);
        return 0;
    }
}

module.exports = {
    retryWithBackoff,
    submitPRForApproval,
    fetchPRDetails,
    getApprovedMergedPRs,
    calculatePointsFromApprovedPRs,
    isValidEmail,
    calculateProfileCompleteness
};