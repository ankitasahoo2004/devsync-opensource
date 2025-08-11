const mongoose = require('mongoose');

const ambassadorSchema = new mongoose.Schema({
    // User reference
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    githubId: {
        type: String,
        required: true
    },

    // Application fields
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    university: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true,
        enum: ['1', '2', '3', '4', 'graduate', 'phd']
    },
    major: {
        type: String,
        required: true
    },
    github: {
        type: String,
        required: true
    },
    specialization: {
        type: String,
        required: true,
        enum: ['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'ai-ml', 'blockchain', 'cybersecurity']
    },
    experience: {
        type: String,
        required: true
    },
    motivation: {
        type: String,
        required: true
    },
    activities: {
        type: String
    },

    // Status fields
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    isActive: {
        type: Boolean,
        default: false
    },

    // Ambassador specific data
    region: {
        type: String,
        enum: ['north-america', 'europe', 'asia', 'south-america', 'africa', 'oceania']
    },
    country: String,
    bio: String,
    socialMedia: {
        twitter: String,
        linkedin: String,
        portfolio: String
    },

    // Stats
    ambassadorPoints: {
        type: Number,
        default: 0
    },
    eventsOrganized: {
        type: Number,
        default: 0
    },
    membersReferred: {
        type: Number,
        default: 0
    },

    // Referral system
    referralCode: {
        type: String,
        unique: true,
        sparse: true // Only unique if present
    },
    referredUsers: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        verified: {
            type: Boolean,
            default: false
        }
    }],

    // Timestamps
    appliedAt: {
        type: Date,
        default: Date.now
    },
    approvedAt: Date,
    lastActive: Date,

    // Admin fields
    reviewedBy: String,
    reviewNotes: String,
    adminNotes: String
});

// Indexes
ambassadorSchema.index({ githubId: 1 });
ambassadorSchema.index({ status: 1 });
ambassadorSchema.index({ isActive: 1 });
ambassadorSchema.index({ ambassadorPoints: -1 });

module.exports = mongoose.model('Ambassador', ambassadorSchema);
