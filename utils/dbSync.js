const User = require('../models/User');
const PendingPR = require('../models/PendingPR');
const Repo = require('../models/Repo');

/**
 * Synchronize approved PendingPR data to User table
 * This function migrates approved PRs from PendingPR collection to User.mergedPRs
 */
async function syncPendingPRsToUserTable() {
    const syncResults = {
        totalUsers: 0,
        updatedUsers: 0,
        totalApprovedPRs: 0,
        syncedPRs: 0,
        errors: [],
        startTime: Date.now(),
        endTime: null
    };

    try {
        console.log('Starting PendingPR to User table synchronization...');

        // Get all approved PendingPRs
        const approvedPRs = await PendingPR.find({ status: 'approved' }).lean();
        syncResults.totalApprovedPRs = approvedPRs.length;

        if (approvedPRs.length === 0) {
            console.log('No approved PRs found to sync');
            syncResults.endTime = Date.now();
            return syncResults;
        }

        // Group PRs by userId
        const prsByUser = groupPRsByUserId(approvedPRs);
        syncResults.totalUsers = Object.keys(prsByUser).length;

        // Process each user
        for (const [userId, userPRs] of Object.entries(prsByUser)) {
            try {
                await syncUserPRs(userId, userPRs, syncResults);
            } catch (userError) {
                console.error(`Error syncing user ${userId}:`, userError);
                syncResults.errors.push({
                    userId,
                    error: userError.message,
                    timestamp: new Date()
                });
            }
        }

        syncResults.endTime = Date.now();
        console.log('PendingPR to User sync completed:', syncResults);
        return syncResults;

    } catch (error) {
        console.error('Fatal error during PendingPR sync:', error);
        syncResults.endTime = Date.now();
        syncResults.errors.push({
            type: 'fatal',
            error: error.message,
            timestamp: new Date()
        });
        throw error;
    }
}

/**
 * Group PendingPRs by userId
 */
function groupPRsByUserId(prs) {
    const groups = {};

    prs.forEach(pr => {
        if (!groups[pr.userId]) {
            groups[pr.userId] = [];
        }
        groups[pr.userId].push(pr);
    });

    return groups;
}

/**
 * Sync PRs for a specific user
 */
async function syncUserPRs(userId, userPRs, syncResults) {
    // Find the user - handle both githubId and MongoDB ObjectId cases
    let user;

    // First try to find by githubId (string)
    user = await User.findOne({ githubId: userId });

    // If not found and userId looks like a MongoDB ObjectId, try finding by _id
    if (!user && userId.match(/^[0-9a-fA-F]{24}$/)) {
        user = await User.findById(userId);
    }

    // If still not found, try finding by username from the PR data
    if (!user && userPRs.length > 0) {
        const username = userPRs[0].username;
        user = await User.findOne({ username: username });

        if (user) {
            console.log(`Found user by username fallback: ${username} -> ${user.githubId}`);
        }
    }

    if (!user) {
        console.warn(`User not found for userId: ${userId}, username: ${userPRs[0]?.username}`);
        syncResults.errors.push({
            userId,
            username: userPRs[0]?.username,
            error: 'User not found - tried githubId, ObjectId, and username lookup',
            timestamp: new Date()
        });
        return;
    }

    // Convert PendingPRs to User.mergedPRs format
    const newMergedPRs = [];
    let syncedCount = 0;

    for (const pendingPR of userPRs) {
        try {
            // Check if this PR is already in user's mergedPRs
            const existingPR = user.mergedPRs.find(pr =>
                pr.repoId === pendingPR.repoUrl && pr.prNumber === pendingPR.prNumber
            );

            if (!existingPR) {
                newMergedPRs.push({
                    repoId: pendingPR.repoUrl,
                    prNumber: pendingPR.prNumber,
                    title: pendingPR.title,
                    mergedAt: pendingPR.mergedAt
                });

                syncedCount++;
            } else {
                console.log(`PR already exists in user data: ${user.username} - ${pendingPR.repoUrl}#${pendingPR.prNumber}`);
            }
        } catch (prError) {
            console.error(`Error processing PR ${pendingPR._id}:`, prError);
            syncResults.errors.push({
                userId,
                prId: pendingPR._id,
                error: prError.message,
                timestamp: new Date()
            });
        }
    }

    // Update user if there are new PRs
    if (newMergedPRs.length > 0) {
        // Add new PRs to existing ones
        user.mergedPRs.push(...newMergedPRs);

        // Recalculate total points from all approved PRs for this user
        // Use the correct user identifier for the query
        const userQueryId = user.githubId;
        const allApprovedPRs = await PendingPR.find({
            $or: [
                { userId: userQueryId },
                { userId: user._id.toString() },
                { username: user.username }
            ],
            status: 'approved'
        }).lean();

        const totalPoints = allApprovedPRs.reduce((sum, pr) => sum + (pr.suggestedPoints || 50), 0);
        user.points = totalPoints;

        // Update badges based on new PR count and points
        user.badges = await calculateBadges(user.mergedPRs, user.points);

        await user.save();
        syncResults.updatedUsers++;
        syncResults.syncedPRs += syncedCount;

        console.log(`✅ Synced ${newMergedPRs.length} new PRs for user ${user.username} (${user.githubId}). Total points: ${totalPoints}`);
    } else {
        console.log(`No new PRs to sync for user ${user.username} (${user.githubId})`);
    }
}

/**
 * Calculate badges based on merged PRs and points
 */
async function calculateBadges(mergedPRs, points) {
    try {
        const registeredRepos = await Repo.find({ reviewStatus: 'accepted' }, 'repoLink').lean();
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
        console.error('Error calculating badges:', error);
        return ['Newcomer'];
    }
}

/**
 * Backup User table before sync (optional safety measure)
 */
async function backupUserTable() {
    try {
        console.log('Creating User table backup...');

        // This could be enhanced to create actual database backup
        const users = await User.find({}).lean();
        const backupData = {
            timestamp: new Date(),
            userCount: users.length,
            users: users
        };

        console.log(`Backup created with ${users.length} users`);
        return backupData;
    } catch (error) {
        console.error('Error creating backup:', error);
        throw error;
    }
}

/**
 * Enhanced validation function to help debug sync issues
 */
async function validateSyncIntegrity() {
    try {
        console.log('Validating sync integrity...');

        const [approvedPRCount, userPRCount, users, pendingPRs] = await Promise.all([
            PendingPR.countDocuments({ status: 'approved' }),
            User.aggregate([
                { $unwind: '$mergedPRs' },
                { $count: 'totalMergedPRs' }
            ]),
            User.find({}, 'username githubId mergedPRs points').lean(),
            PendingPR.find({ status: 'approved' }, 'userId username').lean()
        ]);

        const totalUserPRs = userPRCount[0]?.totalMergedPRs || 0;

        // Additional debugging info
        console.log(`Users in database: ${users.length}`);
        console.log(`Approved PRs: ${approvedPRCount}`);
        console.log(`User merged PRs: ${totalUserPRs}`);

        // Check for common sync issues
        const userIdTypes = {};
        pendingPRs.forEach(pr => {
            const idType = pr.userId.match(/^[0-9a-fA-F]{24}$/) ? 'ObjectId' : 'String';
            userIdTypes[idType] = (userIdTypes[idType] || 0) + 1;
        });

        console.log('PendingPR userId types:', userIdTypes);

        return {
            approvedPRCount,
            userPRCount: totalUserPRs,
            totalUsers: users.length,
            userIdTypes,
            isValid: true,
            debugInfo: {
                usersWithPRs: users.filter(u => u.mergedPRs.length > 0).length,
                usersWithPoints: users.filter(u => u.points > 0).length
            }
        };
    } catch (error) {
        console.error('Error validating sync integrity:', error);
        return {
            isValid: false,
            error: error.message
        };
    }
}

module.exports = {
    syncPendingPRsToUserTable,
    backupUserTable,
    validateSyncIntegrity
};
