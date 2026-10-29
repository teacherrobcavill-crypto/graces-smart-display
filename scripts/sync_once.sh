#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

python3 scripts/sync_calendar.py > /dev/null 2>&1

CHANGES=$(git status --porcelain data/ ipad/js/data.js)
if [ -n "$CHANGES" ]; then
  git add data/ ipad/js/data.js
  git commit -m "Auto-sync live iCloud Calendars (Family & Grace)"
  git push origin main
  git push origin main:ipad
fi
