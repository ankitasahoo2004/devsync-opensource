const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['workshop', 'webinar', 'hackathon', 'meetup', 'conference'],
        required: true
    },
    mode: {
        type: String,
        enum: ['online', 'offline', 'hybrid'],
        required: true
    },
    totalSlots: {
        type: Number,
        required: function () {
            return this.mode === 'offline' || this.mode === 'hybrid';
        }
    },
    filledSlots: {
        type: Number,
        default: 0
    },
    registerLink: {
        type: String,
        required: true
    },
    venue: {
        type: String,
        required: function () {
            return this.mode === 'offline' || this.mode === 'hybrid';
        }
    },
    address: {
        type: String,
        required: function () {
            return this.mode === 'offline' || this.mode === 'hybrid';
        }
    },
    meetingLink: String,
    speakers: [{
        type: String,
        required: true
    }],
    createdBy: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Event', eventSchema);
