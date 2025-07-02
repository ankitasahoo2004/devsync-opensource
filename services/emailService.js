const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');

class EmailService {
    constructor() {
        this.templates = {};
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.gmail_email,
                pass: process.env.gmail_password
            }
        });
    }

    async loadTemplate(templateName) {
        if (!this.templates[templateName]) {
            const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
            const template = await fs.readFile(templatePath, 'utf8');
            this.templates[templateName] = handlebars.compile(template);
        }
        return this.templates[templateName];
    }

    async sendWelcomeEmail(userEmail, username) {
        try {
            const template = await this.loadTemplate('welcomeEmail');

            const mailOptions = {
                from: process.env.gmail_email,
                to: userEmail,
                subject: 'Welcome to DevSync OpenSource!',
                html: template({ username })
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Welcome email sent to ${userEmail}`);
            return true;
        } catch (error) {
            console.error('Error sending welcome email:', error);
            return false;
        }
    }

    async sendProjectSubmissionEmail(userEmail, projectData) {
        try {
            const template = await this.loadTemplate('projectSubmissionEmail');
            const repoName = projectData.repoLink.split('/').pop();

            const mailOptions = {
                from: process.env.gmail_email,
                to: userEmail,
                subject: 'Project Submission Confirmation - DevSync',
                html: template({
                    ownerName: projectData.ownerName,
                    repoName: repoName,
                    repoLink: projectData.repoLink,
                    description: projectData.description,
                    technologies: projectData.technology,
                    submittedDate: new Date().toLocaleDateString()
                })
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Project submission email sent to ${userEmail}`);
            return true;
        } catch (error) {
            console.error('Error sending project submission email:', error);
            return false;
        }
    }

    async sendProjectAcceptedEmail(userEmail, projectData) {
        try {
            const template = await this.loadTemplate('projectAcceptedEmail');
            const repoName = projectData.repoLink.split('/').pop();

            const mailOptions = {
                from: process.env.gmail_email,
                to: userEmail,
                subject: '🎉 Your Project Has Been Accepted! - DevSync',
                html: template({
                    ownerName: projectData.ownerName,
                    repoName: repoName,
                    repoLink: projectData.repoLink,
                    description: projectData.description,
                    technologies: projectData.technology,
                    successPoints: projectData.successPoints || 50,
                    acceptedDate: new Date().toLocaleDateString()
                })
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Project acceptance email sent to ${userEmail}`);
            return true;
        } catch (error) {
            console.error('Error sending project acceptance email:', error);
            return false;
        }
    }

    async sendProjectRejectedEmail(userEmail, projectData, rejectionReason) {
        try {
            const template = await this.loadTemplate('projectRejectedEmail');
            const repoName = projectData.repoLink.split('/').pop();

            const mailOptions = {
                from: process.env.gmail_email,
                to: userEmail,
                subject: 'Project Review Update - DevSync',
                html: template({
                    ownerName: projectData.ownerName,
                    repoName: repoName,
                    repoLink: projectData.repoLink,
                    description: projectData.description,
                    technologies: projectData.technology,
                    rejectionReason: rejectionReason || 'Project does not meet our current requirements.',
                    rejectionDate: new Date().toLocaleDateString()
                })
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Project rejection email sent to ${userEmail}`);
            return true;
        } catch (error) {
            console.error('Error sending project rejection email:', error);
            return false;
        }
    }

    async sendProjectDeletedEmail(userEmail, projectData, deletedBy) {
        try {
            const template = await this.loadTemplate('projectDeletedEmail');
            const repoName = projectData.repoLink.split('/').pop();

            const mailOptions = {
                from: process.env.gmail_email,
                to: userEmail,
                subject: 'Project Deleted - DevSync',
                html: template({
                    ownerName: projectData.ownerName,
                    repoName: repoName,
                    repoLink: projectData.repoLink,
                    description: projectData.description,
                    deletionDate: new Date().toLocaleDateString(),
                    deletedBy: deletedBy
                })
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Project deletion email sent to ${userEmail}`);
            return true;
        } catch (error) {
            console.error('Error sending project deletion email:', error);
            return false;
        }
    }

    async sendProjectPointsUpdateEmail(userEmail, projectData, previousPoints, newPoints, updatedBy) {
        try {
            const template = await this.loadTemplate('projectPointsUpdateEmail');
            const repoName = projectData.repoLink.split('/').pop();

            const mailOptions = {
                from: process.env.gmail_email,
                to: userEmail,
                subject: 'Project Points Updated - DevSync',
                html: template({
                    ownerName: projectData.ownerName,
                    repoName: repoName,
                    repoLink: projectData.repoLink,
                    previousPoints: previousPoints,
                    newPoints: newPoints,
                    updateDate: new Date().toLocaleDateString(),
                    updatedBy: updatedBy
                })
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Project points update email sent to ${userEmail}`);
            return true;
        } catch (error) {
            console.error('Error sending project points update email:', error);
            return false;
        }
    }

    async sendSponsorshipInquiryEmail(formData) {
        try {
            const template = await this.loadTemplate('sponsorshipInquiryEmail');

            if (!formData.email || !formData.organization || !formData.sponsorshipType) {
                throw new Error('Missing required fields');
            }

            // Prepare template data with additional contact inquiry fields
            const templateData = {
                organization: formData.organization,
                name: formData.name,
                email: formData.email,
                phone: formData.phone || 'Not provided',
                sponsorshipType: formData.sponsorshipType,
                organizationType: formData.organizationType || 'Not specified',
                message: formData.message,
                services: formData.services || 'Not specified',
                inquirySource: formData.inquirySource || 'Unknown',
                submissionDate: new Date().toLocaleDateString(),
                // Additional contact inquiry fields
                website: formData.additionalInfo?.website || formData.website || 'Not provided',
                budget: formData.additionalInfo?.budget || formData.budget || 'Not specified',
                deadline: formData.additionalInfo?.deadline || formData.deadline || 'Not specified',
                startDate: formData.additionalInfo?.startDate || formData.startDate || 'Not specified',
                discoverySource: formData.additionalInfo?.discoverySource || formData.discoverySource || 'Not specified'
            };

            const mailOptions = {
                from: process.env.gmail_email,
                to: ['sponsors@devsync-opensource.tech', formData.email], // Send to both admin and applicant
                subject: 'New Sponsorship Inquiry - DevSync',
                html: template(templateData)
            };

            const result = await this.transporter.sendMail(mailOptions);

            if (!result || !result.messageId) {
                throw new Error('Email failed to send');
            }

            console.log(`Sponsorship inquiry email sent from ${formData.email} with messageId: ${result.messageId}`);
            return true;
        } catch (error) {
            console.error('Error sending sponsorship inquiry email:', error);
            throw error; // Re-throw to handle in the route
        }
    }

    async sendMessageEmail(recipientEmail, recipientName, subject, message, templateData = {}) {
        try {
            const template = await this.loadTemplate('messageEmail');

            if (!recipientEmail || !subject || !message) {
                throw new Error('Missing required fields: recipientEmail, subject, and message are required');
            }

            // Merge provided template data with defaults
            const defaultTemplateData = {
                recipientName: recipientName || 'DevSync User',
                recipientEmail: recipientEmail,
                subject: subject,
                message: message,
                dashboardUrl: 'https://www.devsync.club/profile.html',
                githubUrl: 'https://github.com/devsync-opensource',
                websiteUrl: 'https://www.devsync.club',
                discordUrl: 'https://discord.gg/vZnqjWaph8',
                unsubscribeUrl: `https://www.devsync.club/unsubscribe?email=${encodeURIComponent(recipientEmail)}`,
                preferencesUrl: `https://www.devsync.club/email-preferences?email=${encodeURIComponent(recipientEmail)}`
            };

            const finalTemplateData = { ...defaultTemplateData, ...templateData };

            const mailOptions = {
                from: process.env.gmail_email,
                to: recipientEmail,
                subject: `DevSync: ${subject}`,
                html: template(finalTemplateData)
            };

            const result = await this.transporter.sendMail(mailOptions);

            if (!result || !result.messageId) {
                throw new Error('Email failed to send - no message ID returned');
            }

            console.log(`Custom message email sent to ${recipientEmail} with subject "${subject}" - MessageID: ${result.messageId}`);
            return {
                success: true,
                messageId: result.messageId,
                recipient: recipientEmail,
                subject: subject
            };
        } catch (error) {
            console.error('Error sending custom message email:', error);
            throw error; // Re-throw to handle in the route
        }
    }

    // Ticket-related email methods
    async sendTicketCreatedEmail(ticketData) {
        try {
            const template = await this.loadTemplate('ticketCreatedEmail');

            const emailData = {
                ticketTitle: ticketData.title,
                ticketId: ticketData._id,
                ticketNumber: ticketData._id.toString().slice(-8),
                priority: ticketData.priority,
                category: ticketData.category,
                description: ticketData.description,
                userName: ticketData.githubUsername,
                createdAt: new Date(ticketData.createdAt).toLocaleDateString(),
                dashboardUrl: `${process.env.FRONTEND_URL}/ticket.html`,
                websiteUrl: process.env.FRONTEND_URL
            };

            const mailOptions = {
                from: process.env.gmail_email,
                to: ticketData.userEmail,
                subject: `Ticket Created: ${ticketData.title} #${ticketData._id.toString().slice(-8)}`,
                html: template(emailData)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`Ticket created email sent to ${ticketData.userEmail}`);

            return {
                success: true,
                messageId: result.messageId,
                recipient: ticketData.userEmail,
                subject: mailOptions.subject
            };
        } catch (error) {
            console.error('Error sending ticket created email:', error);
            return { success: false, error: error.message };
        }
    }

    async sendTicketStatusUpdateEmail(ticketData, oldStatus, updatedBy) {
        try {
            const template = await this.loadTemplate('ticketStatusUpdateEmail');

            const emailData = {
                ticketTitle: ticketData.title,
                ticketId: ticketData._id,
                ticketNumber: ticketData._id.toString().slice(-8),
                oldStatus: oldStatus.replace('_', ' '),
                newStatus: ticketData.status.replace('_', ' '),
                priority: ticketData.priority,
                category: ticketData.category,
                userName: ticketData.githubUsername,
                updatedBy: updatedBy,
                updatedAt: new Date(ticketData.updatedAt).toLocaleDateString(),
                dashboardUrl: `${process.env.FRONTEND_URL}/ticket.html`,
                websiteUrl: process.env.FRONTEND_URL
            };

            const mailOptions = {
                from: process.env.gmail_email,
                to: ticketData.userEmail,
                subject: `Ticket Status Updated: ${ticketData.title} #${ticketData._id.toString().slice(-8)}`,
                html: template(emailData)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`Ticket status update email sent to ${ticketData.userEmail}`);

            return {
                success: true,
                messageId: result.messageId,
                recipient: ticketData.userEmail,
                subject: mailOptions.subject
            };
        } catch (error) {
            console.error('Error sending ticket status update email:', error);
            return { success: false, error: error.message };
        }
    }

    async sendTicketClosedEmail(ticketData, resolution, resolvedBy) {
        try {
            const template = await this.loadTemplate('ticketClosedEmail');

            const emailData = {
                ticketTitle: ticketData.title,
                ticketId: ticketData._id,
                ticketNumber: ticketData._id.toString().slice(-8),
                priority: ticketData.priority,
                category: ticketData.category,
                description: ticketData.description,
                resolution: resolution,
                userName: ticketData.githubUsername,
                resolvedBy: resolvedBy,
                resolvedAt: new Date(ticketData.resolvedAt).toLocaleDateString(),
                scheduledDeletion: new Date(ticketData.scheduledForDeletion).toLocaleDateString(),
                dashboardUrl: `${process.env.FRONTEND_URL}/ticket.html`,
                websiteUrl: process.env.FRONTEND_URL
            };

            const mailOptions = {
                from: process.env.gmail_email,
                to: ticketData.userEmail,
                subject: `Ticket Resolved: ${ticketData.title} #${ticketData._id.toString().slice(-8)}`,
                html: template(emailData)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`Ticket closed email sent to ${ticketData.userEmail}`);

            return {
                success: true,
                messageId: result.messageId,
                recipient: ticketData.userEmail,
                subject: mailOptions.subject
            };
        } catch (error) {
            console.error('Error sending ticket closed email:', error);
            return { success: false, error: error.message };
        }
    }

    async sendTicketDeletedEmail(ticketData, deletedBy) {
        try {
            const template = await this.loadTemplate('ticketDeletedEmail');

            const emailData = {
                ticketTitle: ticketData.title,
                ticketId: ticketData._id,
                ticketNumber: ticketData._id.toString().slice(-8),
                priority: ticketData.priority,
                category: ticketData.category,
                description: ticketData.description,
                userName: ticketData.githubUsername,
                deletedBy: deletedBy,
                deletedAt: new Date().toLocaleDateString(),
                dashboardUrl: `${process.env.FRONTEND_URL}/ticket.html`,
                websiteUrl: process.env.FRONTEND_URL
            };

            const mailOptions = {
                from: process.env.gmail_email,
                to: ticketData.userEmail,
                subject: `Ticket Deleted: ${ticketData.title} #${ticketData._id.toString().slice(-8)}`,
                html: template(emailData)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`Ticket deleted email sent to ${ticketData.userEmail}`);

            return {
                success: true,
                messageId: result.messageId,
                recipient: ticketData.userEmail,
                subject: mailOptions.subject
            };
        } catch (error) {
            console.error('Error sending ticket deleted email:', error);
            return { success: false, error: error.message };
        }
    }

    // Admin notification emails
    async sendAdminTicketNotification(ticketData, notificationType) {
        try {
            const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
            if (adminEmails.length === 0) {
                console.log('No admin emails configured for ticket notifications');
                return { success: false, error: 'No admin emails configured' };
            }

            const template = await this.loadTemplate('adminTicketNotificationEmail');

            const emailData = {
                notificationType: notificationType,
                ticketTitle: ticketData.title,
                ticketId: ticketData._id,
                ticketNumber: ticketData._id.toString().slice(-8),
                priority: ticketData.priority,
                category: ticketData.category,
                description: ticketData.description,
                userName: ticketData.githubUsername,
                userEmail: ticketData.userEmail,
                createdAt: new Date(ticketData.createdAt).toLocaleDateString(),
                adminUrl: `${process.env.FRONTEND_URL}/ticket.html#admin-panel`,
                websiteUrl: process.env.FRONTEND_URL
            };

            const mailOptions = {
                from: process.env.gmail_email,
                to: adminEmails,
                subject: `[DevSync Admin] New Ticket: ${ticketData.title} #${ticketData._id.toString().slice(-8)}`,
                html: template(emailData)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log(`Admin ticket notification sent to ${adminEmails.join(', ')}`);

            return {
                success: true,
                messageId: result.messageId,
                recipients: adminEmails,
                subject: mailOptions.subject
            };
        } catch (error) {
            console.error('Error sending admin ticket notification:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();
