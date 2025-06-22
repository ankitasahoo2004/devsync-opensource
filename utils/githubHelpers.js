const octokit = require('../config/octokit');
const { URL } = require('url');
const PROGRAM_START_DATE = '2025-03-14';

// Add new helper functions for caching and rate limiting
const prCache = new Map();
const PR_CACHE_TTL = 1000 * 60 * 60; // 1 hour cache TTL

// Add this helper function near other helpers
async function normalizeAndValidateGitHubUrl(url) {
    try {
        // Handle URLs without protocol
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        const urlObj = new URL(url);
        if (!urlObj.hostname.toLowerCase().endsWith('github.com')) {
            throw new Error('Not a GitHub repository URL');
        }

        // Clean and split path
        const cleanPath = urlObj.pathname
            .toLowerCase()                    // Convert to lowercase
            .replace(/\.git$/, '')           // Remove .git suffix
            .replace(/\/$/, '')              // Remove trailing slash
            .split('/')
            .filter(Boolean);                // Remove empty parts

        if (cleanPath.length < 2) {
            throw new Error('Invalid repository URL format');
        }

        const [owner, repo] = cleanPath;

        // Verify repo exists and is public using Octokit
        try {
            const { data: repoData } = await octokit.repos.get({
                owner,
                repo
            });

            if (repoData.private) {
                throw new Error('Private repositories are not allowed');
            }

            // Return canonical URL format using actual case from GitHub API
            return `https://github.com/${repoData.owner.login}/${repoData.name}`;
        } catch (error) {
            if (error.status === 404) {
                throw new Error('Repository not found');
            }
            throw error;
        }
    } catch (error) {
        if (error instanceof TypeError) {
            throw new Error('Invalid URL format');
        }
        throw error;
    }
}

// Helper function to implement exponential backoff for rate limits
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

module.exports = {
    normalizeAndValidateGitHubUrl,
    retryWithBackoff,
    fetchPRDetails
};