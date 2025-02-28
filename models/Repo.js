const mongoose = require('mongoose');

const RepoSchema = new mongoose.Schema({
    repoLink: {
        type: String,
        required: true,
        unique: true
    },
    ownerName: {
        type: String,
        required: true
    },
    technology: {
        type: [String],
        required: true
    },
    description: {
        type: String,
        required: true
    },
    submittedBy: {
        type: String,
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    isApproved: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.models.Repo || mongoose.model('Repo', RepoSchema);
