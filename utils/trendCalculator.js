const User = require('../models/User');


async function calculateTrends(users) {
    try {
        // Get previous rankings from 24 hours ago
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const oldRankings = await User.find(
            { 'mergedPRs.mergedAt': { $lt: oneDayAgo } },
            'username points'
        ).lean();

        // Sort old rankings by points
        const oldRanked = oldRankings.sort((a, b) => b.points - a.points);
        const oldRankMap = new Map(oldRanked.map((user, index) => [user.username, index + 1]));

        // Sort current users by points
        const currentRanked = users.sort((a, b) => b.points - a.points);

        // Calculate trend for each user
        return currentRanked.map((user, currentRank) => {
            const oldRank = oldRankMap.get(user.username) || currentRank + 1;
            const rankChange = oldRank - (currentRank + 1);
            const trend = oldRank !== 0 ? Math.round((rankChange / oldRank) * 100) : 0;
            return {
                ...user,
                trend
            };
        });
    } catch (error) {
        console.error('Error calculating trends:', error);
        return users.map(user => ({ ...user, trend: 0 }));
    }
}

module.exports = { calculateTrends };