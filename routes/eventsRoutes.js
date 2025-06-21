const express = require('express');
const Event = require('../models/Event');
const app = express();
const dotenv = require('dotenv');
dotenv.config();

// Create event
app.post('/api/events', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify admin status
    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const eventData = {
            ...req.body,
            createdBy: req.user.username
        };
        const event = await Event.create(eventData);
        res.status(201).json(event);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
});

// Get all events
app.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find({}).sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Update event slots
app.patch('/api/events/:eventId/slots', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const { filledSlots } = req.body;
        const event = await Event.findById(req.params.eventId);

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (filledSlots > event.totalSlots) {
            return res.status(400).json({ error: 'Filled slots cannot exceed total slots' });
        }

        event.filledSlots = filledSlots;
        await event.save();
        res.json(event);
    } catch (error) {
        console.error('Error updating event slots:', error);
        res.status(500).json({ error: 'Failed to update slots' });
    }
});

// Delete event
app.delete('/api/events/:eventId', async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS.split(',');
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Not authorized' });
    }

    try {
        const event = await Event.findByIdAndDelete(req.params.eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

module.exports = app;