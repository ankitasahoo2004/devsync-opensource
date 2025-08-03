const crypto = require('crypto');
const User = require('../models/User');

/**
 * Generate a secure email verification token
 * @returns {string} - Random verification token
 */
function generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate verification token for user and set expiration
 * @param {string} userId - User's GitHub ID
 * @returns {Promise<string>} - Generated verification token
 */
async function createEmailVerificationToken(userId) {
    const token = generateVerificationToken();
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 24); // 24 hours expiration

    await User.findOneAndUpdate(
        { githubId: userId },
        {
            emailVerificationToken: token,
            emailVerificationExpires: expirationTime,
            verificationEmailSent: true,
            verificationEmailSentAt: new Date()
        }
    );

    return token;
}

/**
 * Verify email verification token
 * @param {string} token - Verification token
 * @returns {Promise<Object>} - Result object with success status and user data
 */
async function verifyEmailToken(token) {
    try {
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() } // Token must not be expired
        });

        if (!user) {
            return {
                success: false,
                error: 'Invalid or expired verification token'
            };
        }

        // Mark email as verified and clear verification token
        user.emailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;
        await user.save();

        return {
            success: true,
            user: user,
            message: 'Email successfully verified'
        };
    } catch (error) {
        return {
            success: false,
            error: 'Error verifying email token: ' + error.message
        };
    }
}

/**
 * Check if user's email verification token has expired
 * @param {string} userId - User's GitHub ID
 * @returns {Promise<boolean>} - True if token is expired or doesn't exist
 */
async function isVerificationTokenExpired(userId) {
    const user = await User.findOne({ githubId: userId });

    if (!user || !user.emailVerificationExpires) {
        return true;
    }

    return user.emailVerificationExpires < new Date();
}

/**
 * Resend verification email for user
 * @param {string} userId - User's GitHub ID
 * @returns {Promise<Object>} - Result object with success status
 */
async function resendVerificationEmail(userId) {
    try {
        const user = await User.findOne({ githubId: userId });

        if (!user) {
            return {
                success: false,
                error: 'User not found'
            };
        }

        if (user.emailVerified) {
            return {
                success: false,
                error: 'Email is already verified'
            };
        }

        // Check if we need to wait before resending (prevent spam)
        const lastSent = user.verificationEmailSentAt;
        if (lastSent) {
            const timeSinceLastEmail = new Date() - lastSent;
            const minWaitTime = 5 * 60 * 1000; // 5 minutes

            if (timeSinceLastEmail < minWaitTime) {
                const waitTimeLeft = Math.ceil((minWaitTime - timeSinceLastEmail) / 1000 / 60);
                return {
                    success: false,
                    error: `Please wait ${waitTimeLeft} more minutes before requesting another verification email`
                };
            }
        }

        return {
            success: true,
            user: user,
            message: 'Ready to resend verification email'
        };
    } catch (error) {
        return {
            success: false,
            error: 'Error processing resend request: ' + error.message
        };
    }
}

module.exports = {
    generateVerificationToken,
    createEmailVerificationToken,
    verifyEmailToken,
    isVerificationTokenExpired,
    resendVerificationEmail
};
