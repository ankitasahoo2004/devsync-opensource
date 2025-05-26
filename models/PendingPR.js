const mongoose = require('mongoose');

const pendingPRSchema = new mongoose.Schema({
    prId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true
    },
    githubId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    repository: {
        type: String,
        required: true
    },
    repoUrl: {
        type: String,
        required: true
    },
    prNumber: {
        type: Number,
        required: true
    },
    mergedAt: {
        type: Date,
        required: true
    },
    suggestedPoints: {
        type: Number,
        default: 50
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    reviewedBy: {
        type: String
    },
    reviewedAt: {
        type: Date
    },
    rejectionReason: {
        type: String
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    userAvatarUrl: {
        type: String
    },
    prUrl: {
        type: String
    }
});

module.exports = mongoose.model('PendingPR', pendingPRSchema);
