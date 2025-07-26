const Repo = require('../models/Repo'); // Assuming you have a Repo model defined

// Check and assign badges based on valid contributions
async function checkBadges(mergedPRs, points) {
    try {
        const registeredRepos = await Repo.find({}, 'repoLink');
        const registeredRepoIds = registeredRepos.map(repo => repo.repoLink);
        const validMergedPRsCount = mergedPRs.filter(pr => registeredRepoIds.includes(pr.repoId)).length;

        const badges = ['Newcomer'];
        const levelBadges = [];

        // Contribution badges
        if (validMergedPRsCount >= 1) badges.push('First Contribution');
        if (validMergedPRsCount >= 5) badges.push('Active Contributor');
        if (validMergedPRsCount >= 10) badges.push('Super Contributor');

        // Level badges - add all badges up to current points level
        if (points >= 0) levelBadges.push('Seeker | Curious to explore');
        if (points >= 100) levelBadges.push('Explorer | Learning the landscape');
        if (points >= 250) levelBadges.push('Tinkerer | Building with intent');
        if (points >= 500) levelBadges.push('Crafter | Shaping solutions');
        if (points >= 1000) levelBadges.push('Architect | Designing with clarity');
        if (points >= 2000) levelBadges.push('Innovator | Creating whats next');
        if (points >= 3500) levelBadges.push('Strategist | Solving with vision');
        if (points >= 5000) levelBadges.push('Visionary | Thinking beyond the code');
        if (points >= 7500) levelBadges.push('Trailblazer | Setting new standards');
        if (points >= 10000) levelBadges.push('Luminary | Inspires the ecosystem');

        return [...badges, ...levelBadges];
    } catch (error) {
        console.error('Error checking badges:', error);
        return ['Newcomer'];
    }
}

// Helper function to get current badge based on points
async function getCurrentBadge(points) {
    if (points >= 10000) return 'Luminary | Inspires the ecosystem';
    if (points >= 7500) return 'Trailblazer | Setting new standards';
    if (points >= 5000) return 'Visionary | Thinking beyond the code';
    if (points >= 3500) return 'Strategist | Solving with vision';
    if (points >= 2000) return 'Innovator | Creating whats next';
    if (points >= 1000) return 'Architect | Designing with clarity';
    if (points >= 500) return 'Crafter | Shaping solutions';
    if (points >= 250) return 'Tinkerer | Building with intent';
    if (points >= 100) return 'Explorer | Learning the landscape';
    if (points >= 0) return 'Seeker | Curious to explore';
    return 'Beginner';
}

module.exports = {
    checkBadges,
    getCurrentBadge
};