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
        if (points >= 0) levelBadges.push('Cursed Newbie | Just awakened.....');
        if (points >= 100) levelBadges.push('Graveyard Shifter | Lost but curious');
        if (points >= 250) levelBadges.push('Night Stalker | Shadows are friends');
        if (points >= 500) levelBadges.push('Skeleton of Structure | Casts magic on code');
        if (points >= 1000) levelBadges.push('Phantom Architect | Builds from beyond');
        if (points >= 2000) levelBadges.push('Haunted Debugger | Haunting every broken line');
        if (points >= 3500) levelBadges.push('Lord of Shadows | Master of the unseen');
        if (points >= 5000) levelBadges.push('Dark Sorcerer | Controls the dark arts');
        if (points >= 7500) levelBadges.push('Demon Crafter | Shapes the cursed world');
        if (points >= 10000) levelBadges.push('Eternal Revenge | Undying ghost');

        return [...badges, ...levelBadges];
    } catch (error) {
        console.error('Error checking badges:', error);
        return ['Newcomer'];
    }
}

// Helper function to get current badge based on points
async function getCurrentBadge(points) {
    if (points >= 10000) return 'Eternal Revenge | Undying ghost';
    if (points >= 7500) return 'Demon Crafter | Shapes the cursed world';
    if (points >= 5000) return 'Dark Sorcerer | Controls the dark arts';
    if (points >= 3500) return 'Lord of Shadows | Master of the unseen';
    if (points >= 2000) return 'Haunted Debugger | Haunting every broken line';
    if (points >= 1000) return 'Phantom Architect | Builds from beyond';
    if (points >= 500) return 'Skeleton of Structure | Casts magic on code';
    if (points >= 250) return 'Night Stalker | Shadows are friends';
    if (points >= 100) return 'Graveyard Shifter | Lost but curious';
    if (points >= 0) return 'Cursed Newbie | Just awakened.....';
    return 'Beginner';
}

module.exports = {
    checkBadges,
    getCurrentBadge
};