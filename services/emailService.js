const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

// Create reusable transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.gmail_email,
        pass: process.env.gmail_password
    }
});

class EmailService {
    constructor() {
        this.welcomeEmailTemplate = null;
    }

    async loadWelcomeTemplate() {
        if (!this.welcomeEmailTemplate) {
            const templatePath = path.join(__dirname, '..', 'templates', 'welcomeEmail.html');
            this.welcomeEmailTemplate = await fs.readFile(templatePath, 'utf8');
        }
        return this.welcomeEmailTemplate;
    }

    async sendWelcomeEmail(userEmail, username) {
        try {
            const template = await this.loadWelcomeTemplate();

            const mailOptions = {
                from: process.env.gmail_email,
                to: userEmail,
                subject: 'Welcome to DevSync OpenSource!',
                html: template
            };

            await transporter.sendMail(mailOptions);
            console.log(`Welcome email sent to ${userEmail}`);
            return true;
        } catch (error) {
            console.error('Error sending welcome email:', error);
            return false;
        }
    }
}

module.exports = new EmailService();
