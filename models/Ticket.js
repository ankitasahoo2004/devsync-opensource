const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        required: true,
        default: 'medium'
    },
    category: {
        type: String,
        enum: ['technical', 'account', 'feature', 'bug', 'other'],
        required: true
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'closed'],
        default: 'open'
    },
    contactEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    // User information
    userId: {
        type: String,
        required: true
    },
    githubUsername: {
        type: String,
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    // Admin fields
    assignedTo: {
        type: String,
        default: null
    },
    resolvedBy: {
        type: String,
        default: null
    },
    resolution: {
        type: String,
        maxlength: 1000,
        default: null
    },
    // Add new fields for scheduled deletion
    scheduledForDeletion: {
        type: Date,
        default: null
    },
    deletionScheduledBy: {
        type: String,
        default: null
    },
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    resolvedAt: {
        type: Date,
        default: null
    }
});

// Update the updatedAt field before saving
ticketSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    if (this.status === 'closed' && !this.resolvedAt) {
        this.resolvedAt = new Date();
    }
    next();
});

// Create indexes for better query performance
ticketSchema.index({ userId: 1, createdAt: -1 });
ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ githubUsername: 1 });
ticketSchema.index({ createdAt: -1 });

// Static method to clean up old indexes
ticketSchema.statics.cleanupOldIndexes = async function () {
    try {
        const collection = this.collection;
        const indexes = await collection.indexes();

        // Remove any ticketNumber or ticketId index if it exists
        for (const index of indexes) {
            if (index.name && (index.name.includes('ticketNumber') || index.name.includes('ticketId'))) {
                try {
                    await collection.dropIndex(index.name);
                    console.log(`Dropped old index: ${index.name}`);
                } catch (error) {
                    console.log(`Could not drop index ${index.name}:`, error.message);
                }
            }
        }
    } catch (error) {
        console.log('Error cleaning up indexes:', error.message);
    }
};

module.exports = mongoose.model('Ticket', ticketSchema);
