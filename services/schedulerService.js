const emailService = require('./emailService');
const User = require('../models/User');

class SchedulerService {
    constructor() {
        this.jobs = new Map();
    }

    async getUserUpdateData(user, previousData) {
        const currentRank = await User.countDocuments({ points: { $gt: user.points } }) + 1;
        const previousRank = previousData?.rank || currentRank;

        return {
            email: user.email,
            username: user.username,
            currentRank,
            rankChange: previousRank - currentRank,
            points: user.points,
            pointsChange: user.points - (previousData?.points || user.points),
            totalPRs: user.mergedPRs.length,
            prChange: user.mergedPRs.length - (previousData?.totalPRs || user.mergedPRs.length),
            streak: user.streak || 0
        };
    }

    async sendLeaderboardUpdates() {
        try {
            console.log('Starting hourly leaderboard updates...');

            // Get all users with their previous data
            const users = await User.find({});
            const previousData = new Map(this.previousUserData || []);

            // Prepare update data for each user
            const updateData = await Promise.all(
                users.map(user => this.getUserUpdateData(user, previousData.get(user.id)))
            );

            // Store current data for next comparison
            this.previousUserData = users.map(user => [
                user.id,
                {
                    rank: updateData.find(d => d.username === user.username)?.currentRank,
                    points: user.points,
                    totalPRs: user.mergedPRs.length
                }
            ]);

            // Send emails to all users
            await emailService.sendBulkLeaderboardUpdates(updateData);

            console.log('Completed hourly leaderboard updates');
        } catch (error) {
            console.error('Error in leaderboard update job:', error);
        }
    }

    startHourlyUpdates() {
        // Clear any existing job
        if (this.jobs.has('leaderboardUpdates')) {
            clearInterval(this.jobs.get('leaderboardUpdates'));
        }

        // Set up new hourly job
        const jobId = setInterval(() => this.sendLeaderboardUpdates(), 10080 * 60 * 1000); // 1 week = 10080 minutes
        this.jobs.set('leaderboardUpdates', jobId);

        // Run immediately on start
        this.sendLeaderboardUpdates();

        console.log('Hourly leaderboard updates scheduled');
    }

    stopHourlyUpdates() {
        if (this.jobs.has('leaderboardUpdates')) {
            clearInterval(this.jobs.get('leaderboardUpdates'));
            this.jobs.delete('leaderboardUpdates');
            console.log('Hourly leaderboard updates stopped');
        }
    }
}

module.exports = new SchedulerService();
