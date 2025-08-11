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
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        default: null
    },
    emailVerificationExpires: {
        type: Date,
        default: null
    },
    verificationEmailSent: {
        type: Boolean,
        default: false
    },
    verificationEmailSentAt: {
        type: Date,
        default: null
    },
    // Referral system fields
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ambassador',
        default: null
    },
    referralCode: {
        type: String,
        default: null
    }
});

module.exports = mongoose.model('User', userSchema);
