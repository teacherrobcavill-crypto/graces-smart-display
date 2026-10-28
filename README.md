# Grace's Bedroom Smart Display (Echo Show on Galaxy Tab A8)

An ad-free, aesthetic ambient smart display and music controller built for a **Samsung Galaxy Tab A8** (10.5", 16:10 landscape) outputting to a **JBL Boombox** over Bluetooth in Grace's bedroom.

---

## Features

- **Personalized Greeting & Real-Time Clock:**
  - Dynamic time-of-day greetings (*"Good morning, Grace"*, *"Sweet dreams, Grace"*).
  - High-visibility 12/24h digital clock with UK date formatting.
- **UK Weather for Bramley & Tadley:**
  - Live weather powered by [Open-Meteo](https://open-meteo.com) (lat: `51.33`, lon: `-1.08`).
  - No API keys or subscriptions needed. Displays temperature, high/low, rain probability, wind speed, and weather condition icons.
- **Amazon Music & JBL Boombox Hub:**
  - One-tap launch button for the Amazon Music Android app.
  - Interactive playlist shortcuts that Grace can customize with her own favorite music, artists, or genres.
  - **Bluetooth Anti-Sleep Pulse:** Built-in sub-audible (20Hz) heartbeat pulse every 9 minutes to stop the JBL Boombox from automatically shutting down during idle silence.
- **Hands-Free Alexa Companion:**
  - Rotating voice command hints (*"Alexa, play pop hits on Amazon Music"*, *"Alexa, set a 7:30 AM alarm"*).
- **Bedtime / Night Dimming Mode:**
  - One-touch toggle or automated schedule (e.g., 9:30 PM to 7:00 AM).
  - Dims the screen to pure black with a gentle amber night clock.
  - Tapping anywhere temporarily awakens the screen for 25 seconds.
- **Visual Themes:**
  - Pastel Sunset (Cozy warm tones)
  - Cosmic Galaxy (Deep indigo & violet)
  - Lofi Chill (Aesthetic lavender)
  - Emerald Forest (Serene mint)
  - Minimal Dark (True black OLED style)

---

## Quick Local Preview

To test and view the dashboard immediately on your Mac:
```bash
# Option 1: Double-click index.html or open via terminal
open index.html

# Option 2: Run a quick local HTTP server
python3 -m http.server 8080
# Then visit: http://localhost:8080
```

---

## Tablet Setup Guide (Samsung Galaxy Tab A8)

### 1. Battery & Power Safety (Permanent Docking)
Because the tablet will stay plugged in 24/7 in Grace's bedroom:
1. Open **Settings** > **Battery and device care** > **Battery** > **More battery settings**.
2. Turn **Protect battery** **ON** (limits maximum charge to 85% to protect the battery from swelling).
3. Open **Settings** > **About tablet** > tap **Build number** 7 times to unlock Developer options.
4. Go to **Settings** > **Developer options** > enable **Stay awake** (screen never sleeps while charging).

### 2. JBL Boombox Setup
1. Keep the JBL Boombox connected to mains AC power.
2. In tablet **Settings** > **Connections** > **Bluetooth**, pair the **JBL Boombox**.
3. Under Bluetooth device settings for the JBL Boombox, make sure **Media audio** is enabled.
4. *Tip:* In the dashboard settings modal (⚙), leave **JBL Boombox Anti-Sleep Pulse** checked so the speaker never enters standby mode.

### 3. Alexa Hands-Free Voice Setup
1. Install **Amazon Alexa** and **Amazon Music** from the Google Play Store.
2. Sign in to your Amazon account (with Amazon Prime).
3. In the Alexa app:
   - Go to **More** > **Settings** > **Alexa on this Phone** > turn on **Hands-Free**.
   - Go to **Settings** > **Music & Podcasts** > set **Amazon Music** as the default music service.
4. In Android **Settings** > **Apps** > **Alexa**:
   - **Permissions:** Set Microphone to **Allow all the time** (or allow while in use).
   - **Battery:** Set to **Unrestricted** so One UI never throttles it.

### 4. Running the Dashboard in Kiosk Mode
1. Install **Fully Kiosk Browser & Launcher** from Google Play Store on the Tab A8.
2. Transfer this project folder to the tablet (or host it via GitHub Pages—see below).
3. In Fully Kiosk Browser settings:
   - **Start URL:** Set to `file:///sdcard/EchoDashboard/index.html` (or your GitHub Pages URL).
   - **Web Zoom:** Set to `100%` (or adjust to taste).
   - **Device Management:** Enable **Keep Screen On**.
   - **Motion Detection (Optional):** Enable camera motion detection so the screen turns on when Grace walks up to it!

---

## GitHub Repository Setup & Cloud Hosting

You can push this project to GitHub to easily deploy it with **GitHub Pages** (giving you a free live URL you can load straight into Fully Kiosk Browser without having to manually copy files):

```bash
# 1. Initialize git
git init
git add .
git commit -m "Initial commit: Grace's smart display bedroom dashboard"

# 2. Create a new repository on GitHub (e.g. 'graces-smart-display')
# 3. Link and push:
git branch -M main
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/<REPO-NAME>.git
git push -u origin main

# 4. In GitHub repository Settings > Pages:
# Select Branch: main, Folder: / (root) > Save.
# Your tablet can now open: https://<YOUR-GITHUB-USERNAME>.github.io/<REPO-NAME>/
```
