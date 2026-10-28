#!/usr/bin/env python3
"""
Live iCloud Family Calendar Synchronizer
Fetches from public iCloud webcal URL, parses events, and updates:
  - data/family.json (for Grace's tablet dashboard)
  - ipad/js/data.js (for Rob's iPad dashboard)
  - data/family.ics (raw backup)
"""

import urllib.request
import ssl
import json
import os
import sys

ICLOUD_URL = "https://p72-caldav.icloud.com/published/2/MTA1NTg2MjUzNDEwNTU4NhiN3RIN0cZPvK5GQffkwUSsbDfz1QYlblzwkFxa3wbsi1dzzTwIDCuHRVgSWvCPF-4DVvJnAHAJIgRIpx9knlM"

def fetch_live_ics():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(ICLOUD_URL, headers={"User-Agent": "SmartDisplaySync/1.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="ignore")

def parse_ics(raw_ics):
    # Unfold lines (RFC 5545)
    unfolded = raw_ics.replace("\r\n ", "").replace("\r\n\t", "").replace("\n ", "").replace("\n\t", "")
    lines = unfolded.splitlines()

    events = []
    cur = None

    for line in lines:
        line = line.strip()
        if line == "BEGIN:VEVENT":
            cur = {
                "title": "",
                "start": "",
                "end": "",
                "rrule": "",
                "location": ""
            }
        elif line == "END:VEVENT":
            if cur and cur["title"]:
                events.append(cur)
            cur = None
        elif cur:
            if line.startswith("SUMMARY"):
                idx = line.find(":")
                if idx != -1:
                    cur["title"] = line[idx+1:].replace("\\,", ",").replace("\\;", ";")
            elif line.startswith("DTSTART"):
                idx = line.find(":")
                if idx != -1:
                    cur["start"] = line[idx+1:]
            elif line.startswith("DTEND"):
                idx = line.find(":")
                if idx != -1:
                    cur["end"] = line[idx+1:]
            elif line.startswith("RRULE:"):
                cur["rrule"] = line[6:]
            elif line.startswith("LOCATION:"):
                idx = line.find(":")
                if idx != -1:
                    cur["location"] = line[idx+1:].replace("\\,", ",").replace("\\n", " ")

    return events

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print("Fetching live iCloud calendar...")
    raw_ics = fetch_live_ics()
    print(f"Downloaded {len(raw_ics)} bytes.")

    # Save raw ICS backup
    ics_path = os.path.join(base_dir, "data", "family.ics")
    with open(ics_path, "w", encoding="utf-8") as f:
        f.write(raw_ics)

    # Parse events
    events = parse_ics(raw_ics)
    print(f"Parsed {len(events)} active events.")

    # 1. Update data/family.json (Grace's screen)
    json_path = os.path.join(base_dir, "data", "family.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(events, f, indent=2)
    print(f"Updated {json_path}")

    # 2. Update ipad/js/data.js (iPad screen)
    ipad_data_path = os.path.join(base_dir, "ipad", "js", "data.js")
    with open(ipad_data_path, "w", encoding="utf-8") as f:
        f.write("window.EMBEDDED_FAMILY_EVENTS = " + json.dumps(events) + ";\n")
    print(f"Updated {ipad_data_path}")

if __name__ == "__main__":
    main()
