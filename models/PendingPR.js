const mongoose = require('mongoose');

const pendingPRSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    username: { type: String, required: true, index: true },
    repoId: { type: String, required: true }, // Keep for backward compatibility
    repoUrl: { type: String, required: true, index: true },
    prNumber: { type: Number, required: true, index: true },
    title: { type: String, required: true },
    mergedAt: { type: Date, required: true },
    suggestedPoints: { type: Number, default: 50, min: 0, max: 1000 },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
        index: true
    },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
    submittedAt: { type: Date, default: Date.now, index: true }
}, {
    // Ensure proper JSON serialization
    toJSON: {
        transform: function (doc, ret) {
            ret._id = ret._id.toString();
            return ret;
        }
    }
});

// Compound indexes to prevent duplicate submissions and improve query performance
pendingPRSchema.index({ userId: 1, repoUrl: 1, prNumber: 1 }, { unique: true });
pendingPRSchema.index({ username: 1, repoUrl: 1, prNumber: 1 });
pendingPRSchema.index({ status: 1, submittedAt: -1 });
pendingPRSchema.index({ userId: 1, status: 1 });

// Pre-save middleware to ensure data consistency
pendingPRSchema.pre('save', function (next) {
    // Ensure repoId is set if not provided (backward compatibility)
    if (!this.repoId && this.repoUrl) {
        this.repoId = this.repoUrl;
    }

    // Ensure repoUrl is set if not provided
    if (!this.repoUrl && this.repoId) {
        this.repoUrl = this.repoId;
    }

    next();
});

module.exports = mongoose.model('PendingPR', pendingPRSchema);
