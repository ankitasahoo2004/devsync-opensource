const welcomeEmail = (username) => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
  <h2>Welcome to DevSync 2025, ${username}! 🚀</h2>
  <p>We're excited to have you join our open source community.</p>
  <p>Here's what you can do:</p>
  <ul>
    <li>Browse open source projects</li>
    <li>Submit your contributions</li>
    <li>Earn points and badges</li>
  </ul>
  <p>Start your journey today!</p>
</body>
</html>
`;

const leaderboardUpdateEmail = (username, rank, trend, points) => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
  <h2>DevSync Leaderboard Update 🏆</h2>
  <p>Hey ${username},</p>
  <p>Here's your current standing:</p>
  <ul>
    <li>Rank: #${rank}</li>
    <li>Trend: ${trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} ${Math.abs(trend)}%</li>
    <li>Points: ${points}</li>
  </ul>
  <p>Keep contributing to improve your rank!</p>
</body>
</html>
`;

const preEndingEmail = (username, daysLeft) => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
  <h2>DevSync 2025 is Ending Soon! ⏰</h2>
  <p>Hi ${username},</p>
  <p>Only ${daysLeft} days left in the competition!</p>
  <p>Don't forget to complete your contributions and submit any pending PRs.</p>
</body>
</html>
`;

const completionEmail = (username) => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
  <h2>DevSync 2025 Has Concluded! 🎉</h2>
  <p>Thank you for participating, ${username}!</p>
  <p>The results will be announced soon.</p>
</body>
</html>
`;

const certificateEmail = (username, contributions, rank) => `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
  <h2>Your DevSync 2025 Certificate 🏅</h2>
  <p>Congratulations ${username}!</p>
  <p>You have successfully completed DevSync 2025 with:</p>
  <ul>
    <li>${contributions} merged contributions</li>
    <li>Final rank: #${rank}</li>
  </ul>
  <p>Your certificate is attached to this email.</p>
</body>
</html>
`;

module.exports = {
    welcomeEmail,
    leaderboardUpdateEmail,
    preEndingEmail,
    completionEmail,
    certificateEmail
};
