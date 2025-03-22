const { sendEmail } = require('./emailService');
const {
    welcomeEmail,
    leaderboardUpdateEmail,
    preEndingEmail,
    completionEmail,
    certificateEmail
} = require('../templates/emails');

const PROGRAM_END_DATE = new Date('2025-06-14');
const PROGRAM_START_DATE = new Date('2025-03-14');


const sendWelcomeEmail = async (user) => {
    if (user.email) {
        await sendEmail(
            user.email,
            'Welcome to DevSync 2025! 🚀',
            welcomeEmail(user.username)
        );
    }
};

const sendLeaderboardUpdate = async (user, rank, trend) => {
    if (user.email) {
        await sendEmail(
            user.email,
            'DevSync Leaderboard Update 🏆',
            leaderboardUpdateEmail(user.username, rank, trend, user.points)
        );
    }
};

const sendPreEndingNotification = async (users) => {
    const daysLeft = Math.ceil((PROGRAM_END_DATE - new Date()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 7) {
        for (const user of users) {
            if (user.email) {
                await sendEmail(
                    user.email,
                    'DevSync 2025 is Ending Soon! ⏰',
                    preEndingEmail(user.username, daysLeft)
                );
            }
        }
    }
};

const sendCompletionEmails = async (users) => {
    for (const user of users) {
        if (user.email) {
            await sendEmail(
                user.email,
                'DevSync 2025 Has Concluded! 🎉',
                completionEmail(user.username)
            );
        }
    }
};

const sendCertificates = async (users) => {
    const qualifiedUsers = users.filter(user => user.mergedPRs.length > 0);

    for (const user of qualifiedUsers) {
        if (user.email) {
            await sendEmail(
                user.email,
                'Your DevSync 2025 Certificate 🏅',
                certificateEmail(user.username, user.mergedPRs.length, user.rank)
            );
        }
    }
};

module.exports = {
    sendWelcomeEmail,
    sendLeaderboardUpdate,
    sendPreEndingNotification,
    sendCompletionEmails,
    sendCertificates
};
