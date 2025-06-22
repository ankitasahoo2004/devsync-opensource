const Repo = require('../models/Repo');
const PendingPR = require('../models/PendingPR');

// Calculate points based on contributions from registered repos
async function calculatePoints(mergedPRs, userId) {
    try {
        let totalPoints = 0;

        // Calculate points for merged PRs only
        for (const pr of mergedPRs) {
            const repo = await Repo.findOne({ repoLink: pr.repoId });
            if (repo) {
                // Skip points if user is the maintainer
                if (repo.userId === userId) {
                    continue;
                }
                totalPoints += repo.successPoints || 50;
            }
        }

        return totalPoints;
    } catch (error) {
        console.error('Error calculating points:', error);
        return 0;
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
    calculatePoints,
    calculatePointsFromApprovedPRs
};