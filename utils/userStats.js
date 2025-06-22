const User = require("../models/User");
const { calculatePoints } = require("./pointCalculator");
const { checkBadges } = require("./badgeAssigner");

async function updateUserPRStatus(userId, repoId, prData, status) {
  try {
    const user = await User.findOne({ githubId: userId });
    if (!user) return;

    if (status === "merged") {
      user.mergedPRs.push({
        repoId,
        prNumber: prData.number,
        title: prData.title,
        mergedAt: new Date(),
      });
    }

    user.points = await calculatePoints(user.mergedPRs, user.githubId);
    user.badges = await checkBadges(user.mergedPRs, user.points);

    await user.save();
  } catch (error) {
    console.error("Error updating user PR status:", error);
  }
}

module.exports = {
  updateUserPRStatus,
};
