const express = require('express');
const emailService = require('../services/emailService');
const router = express.Router();
const dotenv = require('dotenv');
dotenv.config();

// Add sponsorship inquiry endpoint
router.post('/inquiry', async (req, res) => {
    try {
        if (!req.body.email || !req.body.organization || !req.body.sponsorshipType) {
            return res.status(400).json({
                error: 'Missing required fields',
                details: 'Email, organization name, and sponsorship type are required'
            });
        }

        const success = await emailService.sendSponsorshipInquiryEmail(req.body);

        if (success) {
            res.status(200).json({
                message: 'Sponsorship inquiry sent successfully',
                status: 'success'
            });
        } else {
            throw new Error('Failed to send sponsorship inquiry');
        }
    } catch (error) {
        console.error('Error processing sponsorship inquiry:', error);
        res.status(500).json({
            error: 'Failed to process sponsorship inquiry',
            details: error.message
        });
    }
});

module.exports = router;