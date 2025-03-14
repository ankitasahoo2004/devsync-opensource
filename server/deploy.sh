#!/bin/bash

# ----------------------
# KUDU Deployment Script
# ----------------------

# Helpers
# -------

exitWithMessageOnError () {
  if [ ! $? -eq 0 ]; then
    echo "An error has occurred during web site deployment."
    echo $1
    exit 1
  fi
}

# Prerequisites
# ------------

# Verify node.js installed
hash node 2>/dev/null
exitWithMessageOnError "Missing node.js executable"

# Setup
# -----

SCRIPT_DIR="${BASH_SOURCE[0]%\\*}"
SCRIPT_DIR="${SCRIPT_DIR%/*}"
ARTIFACTS=$SCRIPT_DIR/../artifacts
KUDU_SYNC_CMD=${KUDU_SYNC_CMD//\"}

# Deployment
# ---------

echo Handling node.js deployment.

# 1. Select node version
selectNodeVersion

# 2. Install npm packages
if [ -e "$DEPLOYMENT_SOURCE/package.json" ]; then
  cd "$DEPLOYMENT_SOURCE"
  npm install --production
  exitWithMessageOnError "npm failed"
  cd - > /dev/null
fi

# 3. KuduSync
"$KUDU_SYNC_CMD" -v 50 -f "$DEPLOYMENT_SOURCE" -t "$DEPLOYMENT_TARGET" -n "$NEXT_MANIFEST_PATH" -p "$PREVIOUS_MANIFEST_PATH" -i ".git;.hg;.deployment;deploy.sh"
exitWithMessageOnError "Kudu Sync failed"
