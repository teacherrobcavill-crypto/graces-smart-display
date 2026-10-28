#!/bin/bash
# Continuous background auto-sync for live iCloud Family Calendar

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

echo "Starting iCloud Family Calendar auto-sync daemon (every 5 minutes)..."

while true; do
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Checking iCloud Family Calendar..."
  python3 scripts/sync_calendar.py

  # Check if data files changed
  CHANGES=$(git status --porcelain data/ ipad/js/data.js)

  if [ -n "$CHANGES" ]; then
    echo "Calendar changes detected! Pushing to main and ipad..."
    git add data/ ipad/js/data.js
    git commit -m "Auto-sync live iCloud Family Calendar"
    git push origin main
    git checkout ipad
    git merge main -m "Sync live calendar to ipad"
    git push origin ipad
    git checkout main
    echo "Sync and push complete!"
  else
    echo "Calendar is up to date."
  fi

  sleep 300
done
