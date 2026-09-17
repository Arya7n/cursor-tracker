# Cursor Usage desktop app

Electron tray app that enrolls this PC with the company hub and syncs Cursor usage in the background.

The packaged app runs a **bundled agent** (no `npm` on the user’s machine). Finder-launched Mac apps do not have Homebrew/nvm on `PATH`, so enroll must never spawn `npm`.

## Dev

```bash
cd cursor-usage-agent/desktop
npm install
npm start
```

## Build macOS

```bash
cd cursor-usage-agent/desktop
npm install
npm run dist:mac
```

Install the new DMG from `desktop/release/`. Old builds will still show `spawn npm ENOENT`.

No Apple Developer ID is used (`identity: null`). First launch is blocked by Gatekeeper until the user Control-clicks **Open**, or:

```bash
xattr -cr "/Applications/Cursor Usage.app"
```

Silent install for everyone requires a paid Apple Developer account and notarization. This project does not do that.

## Build Windows installer + publish to dashboard

```bash
cd cursor-usage-agent/desktop
npm install
npm run dist:publish
```

Users still need Cursor Desktop signed in.
