const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;
const { Octokit } = require("@octokit/rest");
const User = require("../models/User");
const dotenv = require("dotenv");
dotenv.config();
const emailService = require("../services/emailService");
const { createEmailVerificationToken } = require("../utils/emailVerification");

module.exports = function (passport) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL,
        scope: ["user", "user:email"], // Add email scope
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Create Octokit instance with the user's access token
          const userOctokit = new Octokit({
            auth: accessToken,
          });

          // Try to get authenticated user's emails with the updated endpoint
          let primaryEmail;
          try {
            const { data: emails } =
              await userOctokit.rest.users.listEmailsForAuthenticatedUser();
            primaryEmail = emails.find((email) => email.primary)?.email;

            if (!primaryEmail) {
              // Fallback to public email if available
              const { data: userData } =
                await userOctokit.rest.users.getAuthenticated();
              primaryEmail = userData.email;
            }
          } catch (emailError) {
            console.error("Error fetching user emails:", emailError);
            // Fallback to profile email if available
            primaryEmail = profile.emails?.[0]?.value;
          }

          if (!primaryEmail) {
            return done(new Error("No email found for user"));
          }

          let user = await User.findOne({ githubId: profile.id });

          if (!user) {
            // Create new user - email verification required for all new users
            user = await User.create({
              githubId: profile.id,
              username: profile.username,
              displayName: profile.displayName,
              email: primaryEmail,
              avatarUrl: profile.photos?.[0]?.value || "",
              mergedPRs: [],
              cancelledPRs: [],
              points: 0,
              badges: ["Newcomer"],
              emailVerified: false, // New users must verify email
              verificationEmailSent: false
            });

            // Generate verification token and send verification email
            try {
              const verificationToken = await createEmailVerificationToken(profile.id);
              const emailResult = await emailService.sendEmailVerificationEmail(
                primaryEmail,
                profile.username,
                verificationToken
              );

              if (emailResult.success) {
                console.log(`Email verification sent to new user: ${primaryEmail}`);
              } else {
                console.error('Failed to send verification email to new user:', emailResult.error);
              }
            } catch (verificationError) {
              console.error('Error sending verification email:', verificationError);
            }

            // Still send welcome email but mention verification requirement
            try {
              const emailSent = await emailService.sendWelcomeEmail(
                primaryEmail,
                profile.username
              );
              if (emailSent) {
                user.welcomeEmailSent = true;
                await user.save();
              }
            } catch (welcomeEmailError) {
              console.error('Error sending welcome email:', welcomeEmailError);
            }
          } else {
            // Existing user - check if email verification is needed
            if (!user.emailVerified) {
              // If existing user doesn't have verified email, mark them as needing verification
              // This handles users created before email verification was implemented
              if (!user.verificationEmailSent) {
                try {
                  const verificationToken = await createEmailVerificationToken(profile.id);
                  const emailResult = await emailService.sendEmailVerificationEmail(
                    user.email,
                    user.username,
                    verificationToken
                  );

                  if (emailResult.success) {
                    console.log(`Email verification sent to existing user: ${user.email}`);
                  } else {
                    console.error('Failed to send verification email to existing user:', emailResult.error);
                  }
                } catch (verificationError) {
                  console.error('Error sending verification email to existing user:', verificationError);
                }
              }
            }
          }

          return done(null, { ...profile, userData: user });
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
};
