const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const emailService = require('../services/emailService');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const adminIds = process.env.ADMIN_GITHUB_IDS ? process.env.ADMIN_GITHUB_IDS.split(',') : [];
    if (!adminIds.includes(req.user.username)) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
};

// Create a new ticket
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, description, priority, category, contactEmail } = req.body;

        // Validate required fields
        if (!title || !description || !priority || !category) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        // Get user data
        const user = await User.findOne({ githubId: req.user.id });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const ticketData = {
            title: title.trim(),
            description: description.trim(),
            priority,
            category,
            contactEmail: contactEmail?.trim() || user.email,
            userId: req.user.id,
            githubUsername: user.username,
            userEmail: user.email
        };

        const ticket = await Ticket.create(ticketData);

        // Send ticket created email to user
        try {
            const emailResult = await emailService.sendTicketCreatedEmail(ticket);
            console.log('Ticket created email result:', emailResult);
        } catch (emailError) {
            console.error('Failed to send ticket created email:', emailError);
        }

        // Send admin notification
        try {
            const adminEmailResult = await emailService.sendAdminTicketNotification(ticket, 'new_ticket');
            console.log('Admin notification email result:', adminEmailResult);
        } catch (emailError) {
            console.error('Failed to send admin notification email:', emailError);
        }

        res.status(201).json({
            message: 'Ticket created successfully',
            ticket,
            emailSent: true
        });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({
            error: 'Failed to create ticket',
            details: error.message
        });
    }
});

// Get user's tickets
router.get('/my', requireAuth, async (req, res) => {
    try {
        const { status, priority } = req.query;

        const filter = { userId: req.user.id };

        if (status) filter.status = status;
        if (priority) filter.priority = priority;

        const tickets = await Ticket.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        res.json(tickets);
    } catch (error) {
        console.error('Error fetching user tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// Admin Routes - Get all tickets with filters
router.get('/admin', requireAdmin, async (req, res) => {
    try {
        const { status, priority, search } = req.query;

        const filter = {};

        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { githubUsername: { $regex: search, $options: 'i' } }
            ];
        }

        const tickets = await Ticket.find(filter)
            .sort({ createdAt: -1 })
            .lean();

        res.json(tickets);
    } catch (error) {
        console.error('Error fetching admin tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

// Admin - Get ticket statistics
router.get('/admin/stats', requireAdmin, async (req, res) => {
    try {
        const [total, open, inProgress, closed, urgent] = await Promise.all([
            Ticket.countDocuments(),
            Ticket.countDocuments({ status: 'open' }),
            Ticket.countDocuments({ status: 'in_progress' }),
            Ticket.countDocuments({ status: 'closed' }),
            Ticket.countDocuments({ priority: 'urgent' })
        ]);

        res.json({
            total,
            open,
            in_progress: inProgress,
            closed,
            urgent
        });
    } catch (error) {
        console.error('Error fetching ticket stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Admin - Update ticket status
router.patch('/:ticketId', requireAdmin, async (req, res) => {
    try {
        const { status, resolution } = req.body;
        const ticket = await Ticket.findById(req.params.ticketId);

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        const oldStatus = ticket.status;

        // Update basic fields
        ticket.status = status;
        ticket.updatedAt = new Date();

        // Handle closing with resolution
        if (status === 'closed') {
            if (!resolution || resolution.trim() === '') {
                return res.status(400).json({ error: 'Resolution is required when closing a ticket' });
            }

            ticket.resolution = resolution;
            ticket.resolvedBy = req.user.username;
            ticket.resolvedAt = new Date();

            // Schedule deletion after 24 hours
            const deletionDate = new Date();
            deletionDate.setHours(deletionDate.getHours() + 24);
            ticket.scheduledForDeletion = deletionDate;
            ticket.deletionScheduledBy = req.user.username;
        }

        await ticket.save();

        // Send appropriate email based on status
        try {
            if (status === 'closed' && resolution) {
                // Send closed/resolved email
                const emailResult = await emailService.sendTicketClosedEmail(ticket, resolution, req.user.username);
                console.log('Ticket closed email result:', emailResult);
            } else {
                // Send status update email
                const emailResult = await emailService.sendTicketStatusUpdateEmail(ticket, oldStatus, req.user.username);
                console.log('Ticket status update email result:', emailResult);
            }
        } catch (emailError) {
            console.error('Failed to send ticket update email:', emailError);
        }

        res.json({
            message: 'Ticket updated successfully',
            ticket,
            emailSent: true
        });
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({
            error: 'Failed to update ticket',
            details: error.message
        });
    }
});

// Admin - Delete ticket
router.delete('/:ticketId', requireAdmin, async (req, res) => {
    try {
        const ticket = await Ticket.findByIdAndDelete(req.params.ticketId);

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Send deletion email
        try {
            const emailResult = await emailService.sendTicketDeletedEmail(ticket, req.user.username);
            console.log('Ticket deleted email result:', emailResult);
        } catch (emailError) {
            console.error('Failed to send ticket deleted email:', emailError);
        }

        res.json({
            success: true,
            message: 'Ticket deleted successfully',
            emailSent: true
        });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        res.status(500).json({ error: 'Failed to delete ticket' });
    }
});

// Admin welcome endpoint
router.get('/admin/welcome', requireAdmin, (req, res) => {
    res.json({
        success: true,
        message: `Welcome Admin ${req.user.username}`,
        user: {
            username: req.user.username,
            displayName: req.user.displayName
        }
    });
});

// Get single ticket details - Move this AFTER admin routes
router.get('/:ticketId', requireAuth, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.ticketId).lean();

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Check if user owns the ticket or is admin
        const adminIds = process.env.ADMIN_GITHUB_IDS ? process.env.ADMIN_GITHUB_IDS.split(',') : [];
        const isAdmin = adminIds.includes(req.user.username);

        if (ticket.userId !== req.user.id && !isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(ticket);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
});

module.exports = router;
