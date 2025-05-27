const mongoose = require('mongoose');

const pendingPRSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, required: true },
    repoId: { type: String, required: true },
    repoUrl: { type: String, required: true },
    prNumber: { type: Number, required: true },
    title: { type: String, required: true },
    mergedAt: { type: Date, required: true },
    suggestedPoints: { type: Number, default: 50 },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
    submittedAt: { type: Date, default: Date.now }
});

// Compound index to prevent duplicate submissions
pendingPRSchema.index({ userId: 1, repoUrl: 1, prNumber: 1 }, { unique: true });

module.exports = mongoose.model('PendingPR', pendingPRSchema);
