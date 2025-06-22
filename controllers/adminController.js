const PendingPR = require("../models/PendingPR");
const Repo = require("../models/Repo");
const User = require("../models/User");
const emailService = require("../services/emailService");
const dbSync = require("../utils/dbSync");
const octokit = require("../config/octokit");

// Logic for: POST /api/admin/submit-pr
const submitPr = async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const adminIds = process.env.ADMIN_GITHUB_IDS.split(",");
  if (!adminIds.includes(req.user.username)) {
    return res.status(403).json({ error: "Not authorized" });
  }

  try {
    const { userId, username, repoUrl, prNumber, title, mergedAt } = req.body; // Check if this PR already exists - use more comprehensive duplicate checking
    const existingPR = await PendingPR.findOne({
      $or: [
        { userId: userId, repoUrl: repoUrl, prNumber: prNumber },
        { username: username, repoUrl: repoUrl, prNumber: prNumber },
      ],
    });

    if (existingPR) {
      return res.status(409).json({
        error: "PR already exists",
        pr: existingPR,
      });
    }

    // Get repo details for suggested points
    const repo = await Repo.findOne({ repoLink: repoUrl });
    const suggestedPoints = repo ? repo.successPoints || 50 : 50;

    const pendingPR = await PendingPR.create({
      userId: userId,
      username: username,
      repoId: repoUrl,
      repoUrl: repoUrl,
      prNumber: prNumber,
      title: title,
      mergedAt: new Date(mergedAt),
      suggestedPoints: suggestedPoints,
    });

    res.status(201).json({
      message: "PR submitted for approval",
      pr: pendingPR,
    });
  } catch (error) {
    console.error("Error submitting PR:", error);
    res.status(500).json({
      error: "Failed to submit PR",
      details: error.message,
    });
  }
};

const syncPendingPRs = async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const adminIds = process.env.ADMIN_GITHUB_IDS.split(",");
  if (!adminIds.includes(req.user.username)) {
    return res.status(403).json({ error: "Not authorized" });
  }

  try {
    console.log(`Admin ${req.user.username} initiated PendingPR to User sync`);

    // Optional: Create backup before sync
    if (req.body.createBackup) {
      await dbSync.backupUserTable();
    }

    // Perform the synchronization
    const syncResults = await dbSync.syncPendingPRsToUserTable();

    // Validate integrity after sync
    const validation = await dbSync.validateSyncIntegrity();

    const duration = syncResults.endTime - syncResults.startTime;

    res.json({
      success: true,
      message: "PendingPR to User table synchronization completed",
      results: {
        ...syncResults,
        duration: `${Math.round(duration / 1000)}s`,
        validation,
      },
      timestamp: new Date().toISOString(),
      performedBy: req.user.username,
    });
  } catch (error) {
    console.error("PendingPR sync failed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to sync PendingPR data to User table",
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  submitPr,
  syncPendingPRs,
};
