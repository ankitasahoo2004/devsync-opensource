const express = require('express');
const Ambassador = require('../models/Ambassador');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { requireEmailVerification } = require('../middleware/emailVerificationMiddleware');
const router = express.Router();
const dotenv = require('dotenv');
dotenv.config();

// Admin GitHub IDs (from environment variables)
const ADMIN_GITHUB_IDS = process.env.ADMIN_GITHUB_IDS ?
    process.env.ADMIN_GITHUB_IDS.split(',').map(id => id.trim()) :
    ['Sayan-dev731']; // Default admin

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (ADMIN_GITHUB_IDS.includes(req.user.username)) {
            req.isAdmin = true;
            return next();
        }

        return res.status(403).json({ error: 'Admin access required' });
    } catch (error) {
        console.error('Error checking admin status:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Generate unique referral code
const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'DSA-'; // DevSync Ambassador prefix
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Get all active ambassadors (public)
router.get('/', async (req, res) => {
    try {
        const ambassadors = await Ambassador.find({
            status: 'approved',
            isActive: true
        })
            .populate('userId', 'username displayName avatarUrl points badges')
            .select('-email -github -experience -motivation -activities -reviewNotes -adminNotes')
            .sort({ ambassadorPoints: -1 });

        // Calculate real referral counts for each ambassador
        const ambassadorsWithRealCounts = await Promise.all(ambassadors.map(async (ambassador) => {
            const realReferralCount = await User.countDocuments({
                referredBy: ambassador._id
            });

            // Update stored count if it differs
            if (ambassador.membersReferred !== realReferralCount) {
                await Ambassador.findByIdAndUpdate(ambassador._id, {
                    membersReferred: realReferralCount
                });
            }

            // Return ambassador with real count
            const ambassadorObj = ambassador.toObject();
            ambassadorObj.membersReferred = realReferralCount;
            return ambassadorObj;
        }));

        res.json(ambassadorsWithRealCounts);
    } catch (error) {
        console.error('Error fetching ambassadors:', error);
        res.status(500).json({ error: 'Failed to fetch ambassadors' });
    }
});

// Get ambassador leaderboard (public)
router.get('/leaderboard', async (req, res) => {
    try {
        const ambassadors = await Ambassador.find({
            status: 'approved',
            isActive: true
        })
            .populate('userId', 'username displayName avatarUrl points badges')
            .select('name university ambassadorPoints eventsOrganized')
            .sort({ ambassadorPoints: -1 })
            .limit(10);

        // Get real referral counts for each ambassador
        const leaderboard = await Promise.all(ambassadors.map(async (ambassador, index) => {
            const referralCount = await User.countDocuments({
                referredBy: ambassador._id
            });

            return {
                rank: index + 1,
                name: ambassador.name,
                username: ambassador.userId?.username,
                displayName: ambassador.userId?.displayName,
                avatarUrl: ambassador.userId?.avatarUrl,
                university: ambassador.university,
                ambassadorPoints: ambassador.ambassadorPoints,
                eventsOrganized: ambassador.eventsOrganized,
                membersReferred: referralCount, // Real count from User collection
                devSyncPoints: ambassador.userId?.points || 0,
                badges: ambassador.userId?.badges || ['Newcomer']
            };
        }));

        res.json(leaderboard);
    } catch (error) {
        console.error('Error fetching ambassador leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Get user's application status (authenticated users only) - MUST be before /:id route
router.get('/my-application', requireEmailVerification, async (req, res) => {
    try {
        const application = await Ambassador.findOne({
            githubId: req.user.id
        }).select('-reviewNotes -adminNotes');

        if (!application) {
            return res.json({ hasApplication: false });
        }

        // Calculate real referral count from User collection
        const realReferralCount = await User.countDocuments({
            referredBy: application._id
        });

        // Update the stored count if it differs
        if (application.membersReferred !== realReferralCount) {
            await Ambassador.findByIdAndUpdate(application._id, {
                membersReferred: realReferralCount
            });
        }

        res.json({
            hasApplication: true,
            application: {
                id: application._id,
                status: application.status,
                appliedAt: application.appliedAt,
                approvedAt: application.approvedAt,
                isActive: application.isActive,
                ambassadorPoints: application.ambassadorPoints,
                eventsOrganized: application.eventsOrganized,
                membersReferred: realReferralCount, // Use real count
                referralCode: application.referralCode
            }
        });

    } catch (error) {
        console.error('Error fetching user application:', error);
        res.status(500).json({ error: 'Failed to fetch application status' });
    }
});

// Get individual ambassador by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ObjectId format
        if (!id || id === 'null' || id === 'undefined' || !id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ error: 'Invalid ambassador ID format' });
        }

        const ambassador = await Ambassador.findById(id).populate('userId', 'username displayName');

        if (!ambassador) {
            return res.status(404).json({ error: 'Ambassador not found' });
        }

        res.json({
            name: ambassador.name,
            university: ambassador.university,
            specialization: ambassador.specialization,
            status: ambassador.status,
            referralCode: ambassador.referralCode,
            githubUsername: ambassador.userId?.username || ambassador.github
        });
    } catch (error) {
        console.error('Error fetching ambassador:', error);

        // Handle specific MongoDB casting errors
        if (error.name === 'CastError' && error.kind === 'ObjectId') {
            return res.status(400).json({ error: 'Invalid ambassador ID format' });
        }

        res.status(500).json({ error: 'Failed to fetch ambassador' });
    }
});

// Submit ambassador application (authenticated users only)
router.post('/apply', requireEmailVerification, async (req, res) => {
    try {
        // Check if user already has an application
        const existingApplication = await Ambassador.findOne({
            githubId: req.user.id
        });

        if (existingApplication) {
            return res.status(400).json({
                error: 'You have already submitted an ambassador application',
                status: existingApplication.status,
                appliedAt: existingApplication.appliedAt
            });
        }

        // Get user data
        const user = await User.findOne({ githubId: req.user.id });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const {
            name,
            email,
            university,
            year,
            major,
            github,
            specialization,
            experience,
            motivation,
            activities
        } = req.body;

        // Validate required fields
        if (!name || !email || !university || !year || !major || !github || !specialization || !experience || !motivation) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['name', 'email', 'university', 'year', 'major', 'github', 'specialization', 'experience', 'motivation']
            });
        }

        // Create ambassador application
        const ambassadorApplication = await Ambassador.create({
            userId: user._id,
            githubId: req.user.id,
            name,
            email,
            university,
            year,
            major,
            github,
            specialization,
            experience,
            motivation,
            activities: activities || '',
            status: 'pending'
        });

        // Send confirmation email to user
        try {
            await emailService.sendAmbassadorApplicationEmail(email, name);
        } catch (emailError) {
            console.error('Error sending application confirmation email:', emailError);
        }

        // Notify admins (optional)
        try {
            const adminIds = process.env.ADMIN_GITHUB_IDS?.split(',') || [];
            if (adminIds.length > 0) {
                await emailService.sendAmbassadorApplicationNotification(ambassadorApplication);
            }
        } catch (notificationError) {
            console.error('Error sending admin notification:', notificationError);
        }

        res.status(201).json({
            message: 'Ambassador application submitted successfully',
            applicationId: ambassadorApplication._id,
            status: ambassadorApplication.status
        });

    } catch (error) {
        console.error('Error submitting ambassador application:', error);
        res.status(500).json({
            error: 'Failed to submit application',
            details: error.message
        });
    }
});

// Get ambassador profile by username (public)
router.get('/profile/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const ambassador = await Ambassador.findOne({
            userId: user._id,
            status: 'approved',
            isActive: true
        }).populate('userId', 'username displayName avatarUrl points badges mergedPRs');

        if (!ambassador) {
            return res.status(404).json({ error: 'Ambassador not found' });
        }

        const profile = {
            name: ambassador.name,
            username: ambassador.userId.username,
            displayName: ambassador.userId.displayName,
            avatarUrl: ambassador.userId.avatarUrl,
            university: ambassador.university,
            major: ambassador.major,
            specialization: ambassador.specialization,
            bio: ambassador.bio,
            socialMedia: ambassador.socialMedia,
            region: ambassador.region,
            country: ambassador.country,
            stats: {
                ambassadorPoints: ambassador.ambassadorPoints,
                eventsOrganized: ambassador.eventsOrganized,
                membersReferred: ambassador.membersReferred,
                devSyncPoints: ambassador.userId.points,
                mergedPRs: ambassador.userId.mergedPRs?.length || 0,
                badges: ambassador.userId.badges
            },
            appliedAt: ambassador.appliedAt,
            approvedAt: ambassador.approvedAt,
            lastActive: ambassador.lastActive
        };

        res.json(profile);

    } catch (error) {
        console.error('Error fetching ambassador profile:', error);
        res.status(500).json({ error: 'Failed to fetch ambassador profile' });
    }
});

// ===== ADMIN ROUTES =====

// Get all ambassador applications (admin only)
router.get('/admin/applications', isAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const filter = {};

        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            filter.status = status;
        }

        const applications = await Ambassador.find(filter)
            .populate('userId', 'username displayName avatarUrl points badges')
            .sort({ appliedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        // Calculate real referral counts for each application
        const applicationsWithRealCounts = await Promise.all(applications.map(async (application) => {
            const realReferralCount = await User.countDocuments({
                referredBy: application._id
            });

            // Update stored count if it differs
            if (application.membersReferred !== realReferralCount) {
                await Ambassador.findByIdAndUpdate(application._id, {
                    membersReferred: realReferralCount
                });
            }

            // Return application with real count
            const applicationObj = application.toObject();
            applicationObj.membersReferred = realReferralCount;
            return applicationObj;
        }));

        const total = await Ambassador.countDocuments(filter);

        res.json({
            applications: applicationsWithRealCounts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

// Approve ambassador application (admin only)
router.post('/admin/approve/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reviewNotes } = req.body;

        const ambassador = await Ambassador.findById(id);
        if (!ambassador) {
            return res.status(404).json({ error: 'Ambassador application not found' });
        }

        if (ambassador.status !== 'pending') {
            return res.status(400).json({ error: 'Application is not pending' });
        }

        // Generate unique referral code
        let referralCode;
        let codeExists = true;

        while (codeExists) {
            referralCode = generateReferralCode();
            const existing = await Ambassador.findOne({ referralCode });
            codeExists = !!existing;
        }

        // Update ambassador status
        ambassador.status = 'approved';
        ambassador.isActive = true;
        ambassador.approvedAt = new Date();
        ambassador.reviewedBy = req.user.username;
        ambassador.reviewNotes = reviewNotes || '';
        ambassador.referralCode = referralCode;

        // Calculate ambassador points for existing referrals
        const existingReferrals = await User.countDocuments({
            referredBy: ambassador._id
        });

        // Award 10 points per referral
        ambassador.ambassadorPoints = (ambassador.ambassadorPoints || 0) + (existingReferrals * 10);

        await ambassador.save();

        // Send approval email
        try {
            await emailService.sendAmbassadorApprovalEmail(
                ambassador.email,
                ambassador.name,
                referralCode
            );
        } catch (emailError) {
            console.error('Error sending approval email:', emailError);
        }

        res.json({
            message: 'Ambassador application approved successfully',
            ambassador: {
                id: ambassador._id,
                name: ambassador.name,
                status: ambassador.status,
                referralCode: ambassador.referralCode,
                approvedAt: ambassador.approvedAt
            }
        });

    } catch (error) {
        console.error('Error approving ambassador:', error);
        res.status(500).json({ error: 'Failed to approve ambassador' });
    }
});

// Reject ambassador application (admin only)
router.post('/admin/reject/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reviewNotes } = req.body;

        const ambassador = await Ambassador.findById(id);
        if (!ambassador) {
            return res.status(404).json({ error: 'Ambassador application not found' });
        }

        if (ambassador.status !== 'pending') {
            return res.status(400).json({ error: 'Application is not pending' });
        }

        ambassador.status = 'rejected';
        ambassador.reviewedBy = req.user.username;
        ambassador.reviewNotes = reviewNotes || '';

        await ambassador.save();

        res.json({
            message: 'Ambassador application rejected',
            ambassador: {
                id: ambassador._id,
                name: ambassador.name,
                status: ambassador.status
            }
        });

    } catch (error) {
        console.error('Error rejecting ambassador:', error);
        res.status(500).json({ error: 'Failed to reject ambassador' });
    }
});

// Get ambassador stats (admin only)
router.get('/admin/stats', isAdmin, async (req, res) => {
    try {
        const stats = await Ambassador.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalReferrals = await User.countDocuments({
            referredBy: { $exists: true, $ne: null }
        });

        const result = {
            applicationStats: stats.reduce((acc, stat) => {
                acc[stat._id] = stat.count;
                return acc;
            }, {}),
            totalReferrals: totalReferrals || 0,
            activeAmbassadors: await Ambassador.countDocuments({ status: 'approved', isActive: true })
        };

        res.json(result);

    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Update ambassador notes (admin only)
router.put('/admin/:id/notes', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNotes } = req.body;

        const ambassador = await Ambassador.findByIdAndUpdate(
            id,
            { adminNotes },
            { new: true }
        );

        if (!ambassador) {
            return res.status(404).json({ error: 'Ambassador not found' });
        }

        res.json({
            message: 'Notes updated successfully',
            ambassador: {
                id: ambassador._id,
                adminNotes: ambassador.adminNotes
            }
        });

    } catch (error) {
        console.error('Error updating notes:', error);
        res.status(500).json({ error: 'Failed to update notes' });
    }
});

// ===== REFERRAL SYSTEM ROUTES =====

// Sync all ambassador referral counts (admin only)
router.post('/admin/sync-referrals', isAdmin, async (req, res) => {
    try {
        const ambassadors = await Ambassador.find({ status: 'approved' });
        const syncResults = [];

        for (const ambassador of ambassadors) {
            const realReferralCount = await User.countDocuments({
                referredBy: ambassador._id
            });

            const oldCount = ambassador.membersReferred;

            // Update the stored count
            await Ambassador.findByIdAndUpdate(ambassador._id, {
                membersReferred: realReferralCount
            });

            syncResults.push({
                ambassadorId: ambassador._id,
                name: ambassador.name,
                oldCount,
                newCount: realReferralCount,
                difference: realReferralCount - oldCount
            });
        }

        res.json({
            message: 'Referral counts synchronized successfully',
            results: syncResults,
            totalAmbassadors: ambassadors.length
        });

    } catch (error) {
        console.error('Error syncing referral counts:', error);
        res.status(500).json({ error: 'Failed to sync referral counts' });
    }
});

// Verify referral code and add to user
router.post('/verify-referral', async (req, res) => {
    try {
        const { referralCode } = req.body;

        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!referralCode) {
            return res.status(400).json({ error: 'Referral code is required' });
        }

        // Find ambassador by referral code
        const ambassador = await Ambassador.findOne({
            referralCode,
            status: 'approved',
            isActive: true
        });

        if (!ambassador) {
            return res.status(404).json({ error: 'Invalid referral code' });
        }

        // Check if user already has a referral
        const currentUser = await User.findOne({ githubId: req.user.id });
        if (!currentUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (currentUser.referredBy) {
            return res.status(400).json({ error: 'You have already been referred by an ambassador' });
        }

        // Update user's referredBy field
        await User.findByIdAndUpdate(currentUser._id, {
            referredBy: ambassador._id,
            referralCode: referralCode
        });

        // Calculate and update real referral count
        const realReferralCount = await User.countDocuments({
            referredBy: ambassador._id
        });

        // Update ambassador's count and award points
        await Ambassador.findByIdAndUpdate(ambassador._id, {
            membersReferred: realReferralCount,
            $inc: { ambassadorPoints: 10 } // 10 points per verified referral
        });

        res.json({
            message: 'Referral verified successfully',
            ambassador: {
                name: ambassador.name,
                university: ambassador.university
            },
            pointsAwarded: 10
        });

    } catch (error) {
        console.error('Error verifying referral:', error);
        res.status(500).json({ error: 'Failed to verify referral' });
    }
});

// Admin: Update/Edit application
router.put('/admin/applications/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // Find and update the application
        const application = await Ambassador.findById(id);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Update fields
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined && key !== '_id') {
                application[key] = updateData[key];
            }
        });

        // Add update timestamp
        application.updatedAt = new Date();

        await application.save();

        // Populate user data for response
        await application.populate('userId', 'username displayName avatarUrl');

        res.json({
            message: 'Application updated successfully',
            application: application
        });

    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({ error: 'Failed to update application' });
    }
});

// Admin: Delete application
router.delete('/admin/applications/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Ambassador.findById(id);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Store application name for response
        const applicantName = application.name;

        // Delete the application
        await Ambassador.findByIdAndDelete(id);

        res.json({
            message: `Application from ${applicantName} has been deleted successfully`
        });

    } catch (error) {
        console.error('Error deleting application:', error);
        res.status(500).json({ error: 'Failed to delete application' });
    }
});

// Admin: Enable reapplication for rejected candidates
router.post('/admin/applications/:id/enable-reapply', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Ambassador.findById(id);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        if (application.status !== 'rejected') {
            return res.status(400).json({ error: 'Only rejected applications can be enabled for reapplication' });
        }

        // Reset application status to pending
        application.status = 'pending';
        application.reviewNotes = (application.reviewNotes || '') + ' [Reapplication enabled by admin]';
        application.updatedAt = new Date();

        await application.save();

        // Send email notification to applicant (optional)
        try {
            await emailService.sendEmail(
                application.email,
                'Reapplication Opportunity - DevSync Ambassador Program',
                'reapplicationEnabledEmail',
                {
                    name: application.name,
                    programName: 'DevSync Ambassador Program'
                }
            );
        } catch (emailError) {
            console.warn('Failed to send reapplication email:', emailError);
        }

        res.json({
            message: `Reapplication enabled for ${application.name}. Status reset to pending.`,
            application: {
                id: application._id,
                name: application.name,
                status: application.status
            }
        });

    } catch (error) {
        console.error('Error enabling reapplication:', error);
        res.status(500).json({ error: 'Failed to enable reapplication' });
    }
});

// Admin: Generate referral code for approved application
router.post('/admin/applications/:id/generate-referral', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Ambassador.findById(id);
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }

        if (application.status !== 'approved') {
            return res.status(400).json({ error: 'Only approved applications can have referral codes generated' });
        }

        if (application.referralCode) {
            return res.status(400).json({ error: 'Referral code already exists for this ambassador' });
        }

        // Generate unique referral code
        let referralCode;
        let isUnique = false;
        let attempts = 0;

        while (!isUnique && attempts < 10) {
            referralCode = generateReferralCode();
            const existing = await Ambassador.findOne({ referralCode });
            if (!existing) {
                isUnique = true;
            }
            attempts++;
        }

        if (!isUnique) {
            return res.status(500).json({ error: 'Failed to generate unique referral code' });
        }

        // Update application with referral code
        application.referralCode = referralCode;
        application.updatedAt = new Date();
        await application.save();

        res.json({
            message: 'Referral code generated successfully',
            referralCode: referralCode,
            ambassador: {
                id: application._id,
                name: application.name
            }
        });

    } catch (error) {
        console.error('Error generating referral code:', error);
        res.status(500).json({ error: 'Failed to generate referral code' });
    }
});

// Admin: Delete ambassador (remove from program)
router.delete('/admin/ambassadors/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const ambassador = await Ambassador.findById(id);
        if (!ambassador) {
            return res.status(404).json({ error: 'Ambassador not found' });
        }

        // Store ambassador name for response
        const ambassadorName = ambassador.name;

        // Instead of deleting, set as inactive (soft delete)
        ambassador.isActive = false;
        ambassador.status = 'removed';
        ambassador.updatedAt = new Date();
        ambassador.adminNotes = (ambassador.adminNotes || '') + ` [Removed from program by admin on ${new Date().toISOString()}]`;

        await ambassador.save();

        // Alternative: Hard delete if preferred
        // await Ambassador.findByIdAndDelete(id);

        res.json({
            message: `${ambassadorName} has been removed from the ambassador program`
        });

    } catch (error) {
        console.error('Error removing ambassador:', error);
        res.status(500).json({ error: 'Failed to remove ambassador' });
    }
});

module.exports = router;
