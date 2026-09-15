Cursor Usage Agent — employee PC
================================

1. Install Node.js LTS from https://nodejs.org
2. Stay signed in to Cursor Desktop
3. Right-click install.ps1 → Run with PowerShell
   (or from a terminal in this folder)

   powershell -ExecutionPolicy Bypass -File .\install.ps1 -Server "https://cursor-usage.yourcompany.com" -Secret "THE_SECRET_IT_GIVES_YOU"

That enrolls this PC and syncs usage every 20 minutes to the company dashboard.

IT/admin only: they host the dashboard. You only run this installer.
