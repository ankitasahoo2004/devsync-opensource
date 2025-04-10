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

    async sendLeaderboardUpdateEmail(userEmail, userData) {
        try {
            const template = await this.loadTemplate('leaderboardUpdateEmail');

            // Calculate trends and directions
            const isRankUp = userData.rankChange > 0;
            const isPointsUp = userData.pointsChange > 0;
            const isPRUp = userData.prChange > 0;

            const mailOptions = {
                from: process.env.gmail_email,
                to: userEmail,
                subject: '📈 Your DevSync Leaderboard Update',
                html: template({
                    username: userData.username,
                    rank: userData.currentRank,
                    rankChange: Math.abs(userData.rankChange),
                    rankTrend: isRankUp ? 'up' : 'down',
                    isRankUp,
                    points: userData.points,
                    pointsChange: Math.abs(userData.pointsChange),
                    pointsTrend: isPointsUp ? 'up' : 'down',
                    isPointsUp,
                    totalPRs: userData.totalPRs,
                    prChange: Math.abs(userData.prChange),
                    prTrend: isPRUp ? 'up' : 'down',
                    isPRUp,
                    streak: userData.streak || 0
                })
            };

            await this.transporter.sendMail(mailOptions);
            console.log(`Leaderboard update email sent to ${userEmail}`);
            return true;
        } catch (error) {
            console.error('Error sending leaderboard update email:', error);
            return false;
        }
    }

    async sendBulkLeaderboardUpdates(usersData) {
        try {
            const results = await Promise.allSettled(
                usersData.map(userData =>
                    this.sendLeaderboardUpdateEmail(userData.email, userData)
                )
            );

            const summary = {
                total: results.length,
                successful: results.filter(r => r.status === 'fulfilled').length,
                failed: results.filter(r => r.status === 'rejected').length
            };

            console.log('Bulk leaderboard update summary:', summary);
            return summary;
        } catch (error) {
            console.error('Error in bulk leaderboard update:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();
