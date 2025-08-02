const User = require('../models/User');
const PendingPR = require('../models/PendingPR');
const Repo = require('../models/Repo');
// const calculatePoints = require('./pointCalculator').calculatePoints;

/**
 * Synchronize approved PendingPR data to User table
 * This function migrates approved PRs from PendingPR collection to User.mergedPRs
 * and rejected PRs to User.cancelledPRs
 */
async function syncPendingPRsToUserTable() {
    const syncResults = {
        totalUsers: 0,
        updatedUsers: 0,
        totalApprovedPRs: 0,
        totalRejectedPRs: 0,
        syncedPRs: 0,
        syncedCancelledPRs: 0,
        errors: [],
        startTime: Date.now(),
        endTime: null
    };

    try {
        console.log('Starting PendingPR to User table synchronization...');

        // Get all approved and rejected PendingPRs
        const [approvedPRs, rejectedPRs] = await Promise.all([
            PendingPR.find({ status: 'approved' }).lean(),
            PendingPR.find({ status: 'rejected' }).lean()
        ]);

        syncResults.totalApprovedPRs = approvedPRs.length;
        syncResults.totalRejectedPRs = rejectedPRs.length;

        if (approvedPRs.length === 0 && rejectedPRs.length === 0) {
            console.log('No approved or rejected PRs found to sync');
            syncResults.endTime = Date.now();
            return syncResults;
        }

        // Group PRs by userId
        const approvedPrsByUser = groupPRsByUserId(approvedPRs);
        const rejectedPrsByUser = groupPRsByUserId(rejectedPRs);

        // Get all unique user IDs
        const allUserIds = new Set([
            ...Object.keys(approvedPrsByUser),
            ...Object.keys(rejectedPrsByUser)
        ]);

        syncResults.totalUsers = allUserIds.size;

        // Process each user
        for (const userId of allUserIds) {
            try {
                await syncUserPRs(
                    userId,
                    approvedPrsByUser[userId] || [],
                    rejectedPrsByUser[userId] || [],
                    syncResults
                );
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
 * Sync PRs for a specific user (both approved and rejected)
 */
async function syncUserPRs(userId, approvedPRs, rejectedPRs, syncResults) {
    // Find the user - handle both githubId and MongoDB ObjectId cases
    let user;

    // First try to find by githubId (string)
    user = await User.findOne({ githubId: userId });

    // If not found and userId looks like a MongoDB ObjectId, try finding by _id
    if (!user && userId.match(/^[0-9a-fA-F]{24}$/)) {
        user = await User.findById(userId);
    }

    // If still not found, try finding by username from the PR data
    if (!user && (approvedPRs.length > 0 || rejectedPRs.length > 0)) {
        const username = (approvedPRs[0] || rejectedPRs[0]).username;
        user = await User.findOne({ username: username });

        if (user) {
            console.log(`Found user by username fallback: ${username} -> ${user.githubId}`);
        }
    }

    if (!user) {
        const username = (approvedPRs[0] || rejectedPRs[0])?.username;
        console.warn(`User not found for userId: ${userId}, username: ${username}`);
        syncResults.errors.push({
            userId,
            username: username,
            error: 'User not found - tried githubId, ObjectId, and username lookup',
            timestamp: new Date()
        });
        return;
    }

    // Convert approved PendingPRs to User.mergedPRs format
    const newMergedPRs = [];
    let syncedCount = 0;

    for (const pendingPR of approvedPRs) {
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
            console.error(`Error processing approved PR ${pendingPR._id}:`, prError);
            syncResults.errors.push({
                userId,
                prId: pendingPR._id,
                error: prError.message,
                timestamp: new Date()
            });
        }
    }

    // Convert rejected PendingPRs to User.cancelledPRs format
    const newCancelledPRs = [];
    let syncedCancelledCount = 0;

    for (const pendingPR of rejectedPRs) {
        try {
            // Check if this PR is already in user's cancelledPRs
            const existingCancelledPR = user.cancelledPRs.find(pr =>
                pr.repoId === pendingPR.repoUrl && pr.prNumber === pendingPR.prNumber
            );

            if (!existingCancelledPR) {
                newCancelledPRs.push({
                    repoId: pendingPR.repoUrl,
                    prNumber: pendingPR.prNumber,
                    title: pendingPR.title,
                    cancelledAt: pendingPR.reviewedAt || pendingPR.submittedAt,
                    rejectionReason: pendingPR.rejectionReason || 'No reason provided'
                });

                syncedCancelledCount++;
            } else {
                console.log(`Cancelled PR already exists in user data: ${user.username} - ${pendingPR.repoUrl}#${pendingPR.prNumber}`);
            }
        } catch (prError) {
            console.error(`Error processing rejected PR ${pendingPR._id}:`, prError);
            syncResults.errors.push({
                userId,
                prId: pendingPR._id,
                error: prError.message,
                timestamp: new Date()
            });
        }
    }

    // Always recalculate points from ALL approved PRs for this user (including updated suggestedPoints)
    const userQueryId = user.githubId;
    const allApprovedPRs = await PendingPR.find({
        $or: [
            { userId: userQueryId },
            { userId: user._id.toString() },
            { username: user.username }
        ],
        status: 'approved'
    }).lean();

    // Calculate total points with current suggestedPoints values
    const totalPoints = allApprovedPRs.reduce((sum, pr) => sum + (pr.suggestedPoints || 50), 0);
    const previousPoints = user.points;

    // Update user data
    if (newMergedPRs.length > 0) {
        // Add new PRs to existing ones
        user.mergedPRs.push(...newMergedPRs);
    }

    if (newCancelledPRs.length > 0) {
        // Add new cancelled PRs to existing ones
        user.cancelledPRs.push(...newCancelledPRs);
    }

    // Always update points (to catch suggestedPoints changes) and badges
    user.points = totalPoints;
    user.badges = await calculateBadges(user.mergedPRs, user.points);

    await user.save();

    // Update sync results
    if (newMergedPRs.length > 0 || newCancelledPRs.length > 0 || previousPoints !== totalPoints) {
        syncResults.updatedUsers++;
        syncResults.syncedPRs += syncedCount;
        syncResults.syncedCancelledPRs += syncedCancelledCount;

        const pointsMessage = previousPoints !== totalPoints
            ? ` (points: ${previousPoints} → ${totalPoints})`
            : '';

        const cancelledMessage = newCancelledPRs.length > 0
            ? `, ${newCancelledPRs.length} cancelled PRs`
            : '';

        console.log(`✅ Synced user ${user.username} (${user.githubId}): ${newMergedPRs.length} new PRs${cancelledMessage}${pointsMessage}. Total: ${user.mergedPRs.length} PRs, ${user.cancelledPRs.length} cancelled PRs, ${totalPoints} points`);
    } else {
        console.log(`No changes for user ${user.username} (${user.githubId})`);
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

        const [approvedPRCount, rejectedPRCount, userPRCount, userCancelledPRCount, users, pendingPRs] = await Promise.all([
            PendingPR.countDocuments({ status: 'approved' }),
            PendingPR.countDocuments({ status: 'rejected' }),
            User.aggregate([
                { $unwind: '$mergedPRs' },
                { $count: 'totalMergedPRs' }
            ]),
            User.aggregate([
                { $unwind: '$cancelledPRs' },
                { $count: 'totalCancelledPRs' }
            ]),
            User.find({}, 'username githubId mergedPRs cancelledPRs points').lean(),
            PendingPR.find({ $or: [{ status: 'approved' }, { status: 'rejected' }] }, 'userId username status').lean()
        ]);

        const totalUserPRs = userPRCount[0]?.totalMergedPRs || 0;
        const totalUserCancelledPRs = userCancelledPRCount[0]?.totalCancelledPRs || 0;

        // Additional debugging info
        console.log(`Users in database: ${users.length}`);
        console.log(`Approved PRs: ${approvedPRCount}`);
        console.log(`Rejected PRs: ${rejectedPRCount}`);
        console.log(`User merged PRs: ${totalUserPRs}`);
        console.log(`User cancelled PRs: ${totalUserCancelledPRs}`);

        // Check for common sync issues
        const userIdTypes = {};
        pendingPRs.forEach(pr => {
            const idType = pr.userId.match(/^[0-9a-fA-F]{24}$/) ? 'ObjectId' : 'String';
            userIdTypes[idType] = (userIdTypes[idType] || 0) + 1;
        });

        console.log('PendingPR userId types:', userIdTypes);

        return {
            approvedPRCount,
            rejectedPRCount,
            userPRCount: totalUserPRs,
            userCancelledPRCount: totalUserCancelledPRs,
            totalUsers: users.length,
            userIdTypes,
            isValid: true,
            debugInfo: {
                usersWithPRs: users.filter(u => u.mergedPRs.length > 0).length,
                usersWithCancelledPRs: users.filter(u => u.cancelledPRs.length > 0).length,
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
