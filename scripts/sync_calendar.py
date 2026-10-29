#!/usr/bin/env python3
"""
Live iCloud Calendar Synchronizer
Fetches from public iCloud webcal URLs, parses events, and updates:
  - data/family.json (combined for Grace's tablet dashboard)
  - ipad/js/data.js (for Rob's iPad dashboard)
  - data/*.ics (raw backups)
"""

import urllib.request
import ssl
import json
import os
import sys

CALENDARS = [
    {
        "id": "family",
        "name": "Family",
        "url": "https://p72-caldav.icloud.com/published/2/MTA1NTg2MjUzNDEwNTU4NhiN3RIN0cZPvK5GQffkwUSsbDfz1QYlblzwkFxa3wbsi1dzzTwIDCuHRVgSWvCPF-4DVvJnAHAJIgRIpx9knlM",
        "color": "#FF9500"
    },
    {
        "id": "grace",
        "name": "Grace",
        "url": "https://p114-caldav.icloud.com/published/2/MjA3NzMwNjM4MjYyMDc3M7ECW_Q1dfSu08_JMygnSPnCxL0SQnl4f_OWLzNm0xSo0dIk4MV9SVy5xrVLydyDRqClA7Du8tsXkCBmPzqc2Rs",
        "color": "#83D754"
    }
]

def fetch_live_ics(url):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(url, headers={"User-Agent": "SmartDisplaySync/1.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="ignore")

def parse_ics(raw_ics, cal_name="Family", cal_color="#FF9500"):
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
                "location": "",
                "calendar": cal_name,
                "color": cal_color,
                "exdates": []
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
            elif line.startswith("EXDATE"):
                idx = line.find(":")
                if idx != -1:
                    for p in line[idx+1:].split(","):
                        clean_p = p.strip()
                        if clean_p:
                            cur["exdates"].append(clean_p)
            elif line.startswith("LOCATION:"):
                idx = line.find(":")
                if idx != -1:
                    cur["location"] = line[idx+1:].replace("\\,", ",").replace("\\n", " ")

    return events

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    all_events = []

    for cal in CALENDARS:
        print(f"Fetching {cal['name']} calendar ({cal['url'][:45]}...)...")
        try:
            raw_ics = fetch_live_ics(cal["url"])
            print(f"Downloaded {len(raw_ics)} bytes for {cal['name']}.")

            # Save raw ICS backup
            ics_path = os.path.join(base_dir, "data", f"{cal['id']}.ics")
            with open(ics_path, "w", encoding="utf-8") as f:
                f.write(raw_ics)

            # Parse events
            events = parse_ics(raw_ics, cal_name=cal["name"], cal_color=cal["color"])
            print(f"Parsed {len(events)} events from {cal['name']}.")
            all_events.extend(events)
        except Exception as e:
            print(f"Error fetching {cal['name']} calendar: {e}")

    print(f"Total combined events: {len(all_events)}")

    # 1. Update data/family.json (Grace's screen)
    json_path = os.path.join(base_dir, "data", "family.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_events, f, indent=2)
    print(f"Updated {json_path}")

    # 2. Update ipad/js/data.js (iPad screen)
    ipad_data_path = os.path.join(base_dir, "ipad", "js", "data.js")
    with open(ipad_data_path, "w", encoding="utf-8") as f:
        f.write("window.EMBEDDED_FAMILY_EVENTS = " + json.dumps(all_events) + ";\n")
    print(f"Updated {ipad_data_path}")

if __name__ == "__main__":
    main()
