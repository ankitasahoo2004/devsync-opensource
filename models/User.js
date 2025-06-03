const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    githubId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true
    },
    displayName: String,
    email: {
        type: String,
        required: true
    },
    avatarUrl: String,
    mergedPRs: [{
        repoId: String,
        prNumber: Number,
        title: String,
        mergedAt: Date
    }],
    cancelledPRs: [{
        repoId: String,
        prNumber: Number,
        title: String,
        cancelledAt: Date,
        rejectionReason: String  // Add rejection reason field
    }],
    points: {
        type: Number,
        default: 0
    },
    badges: {
        type: [String],
        default: ['Newcomer']
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    welcomeEmailSent: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('User', userSchema);
