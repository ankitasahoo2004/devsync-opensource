const octokit = require('../config/octokit');
const { URL } = require('url');
const PROGRAM_START_DATE = '2025-03-14';

// Add new helper functions for caching and rate limiting
const prCache = new Map();
const PR_CACHE_TTL = 1000 * 60 * 60; // 1 hour cache TTL

/**
 * Normalizes and validates a GitHub repository URL
 * @param {string} url - The GitHub repository URL to validate
 * @returns {Promise<string>} - The canonical GitHub repository URL
 * @throws {Error} - If the URL is invalid or repository doesn't exist
 */
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

/**
 * Implements exponential backoff for rate limit handling
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in milliseconds
 * @returns {Promise<any>} - Result of the function call
 */
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

/**
 * Fetches PR details using GraphQL (replaces deprecated REST API)
 * This function replaces the deprecated "GET /search/issues" REST API endpoint
 * which is scheduled for removal on September 4, 2025.
 * 
 * @param {string} username - GitHub username to fetch PRs for
 * @param {boolean} isMerged - Whether to fetch only merged PRs (default: true)
 * @param {number} perPage - Number of PRs to fetch (default: 100)
 * @returns {Promise<Object>} - Object containing items array and total_count
 */
async function fetchPRDetailsGraphQL(username, isMerged = true, perPage = 100) {
    try {
        // Check cache first
        const cacheKey = `prs:${username}:${isMerged}`;
        const cachedData = prCache.get(cacheKey);
        if (cachedData && (Date.now() - cachedData.timestamp) < PR_CACHE_TTL) {
            console.log(`Using cached PR data for ${username}`);
            return cachedData.data;
        }

        // Build GraphQL query with states filter
        const states = isMerged ? ['MERGED'] : ['OPEN', 'CLOSED', 'MERGED'];

        // Fetch with retry logic for rate limits
        const data = await retryWithBackoff(async () => {
            // Use GraphQL instead of deprecated REST API search endpoint
            const response = await octokit.graphql(`
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
                first: perPage,
                searchQuery: `type:pr author:${username} created:>=${PROGRAM_START_DATE}`
            });

            // Transform GraphQL response to match REST API format for backward compatibility
            const items = response.search.nodes
                .filter(pr => pr && states.includes(pr.state))
                .map(pr => ({
                    id: pr.id,
                    number: pr.number,
                    title: pr.title,
                    html_url: pr.url,
                    state: pr.state.toLowerCase(),
                    created_at: pr.createdAt,
                    merged_at: pr.mergedAt,
                    closed_at: pr.closedAt,
                    repository_url: `https://api.github.com/repos/${pr.repository.owner.login}/${pr.repository.name}`,
                    user: {
                        login: pr.author?.login
                    }
                }));

            return {
                items: items,
                total_count: items.length
            };
        });

        // Cache the result
        prCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    } catch (error) {
        console.error(`Error fetching PRs for ${username}:`, error);
        // Return empty results on error after retries
        return { items: [], total_count: 0 };
    }
}

/**
 * Legacy function for backward compatibility
 * @param {string} username - GitHub username
 * @returns {Promise<Object>} - PR data object
 * @deprecated Use fetchPRDetailsGraphQL instead
 */
async function fetchPRDetails(username) {
    return fetchPRDetailsGraphQL(username, true, 100);
}

module.exports = {
    normalizeAndValidateGitHubUrl,
    retryWithBackoff,
    fetchPRDetails,
    fetchPRDetailsGraphQL
};