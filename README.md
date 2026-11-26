# Insta Auto — Seguidores Locais

Private repository containing the imported, compiled Chrome extension package, version **1.1.2**.

## Overview

Local analysis of Instagram exports and browser-based profile review. The original package uses Manifest V3 and declares Chrome 110 or later as its minimum version.

## Installation

Download or clone this private repository. Open `chrome://extensions` (or `brave://extensions`), enable Developer mode and select Load unpacked. Choose the folder containing `manifest.json`.

For existing installations, back up local data before replacing files and retain the original installation folder. See [the original Portuguese release notes](LEIA-ME-v1.1.2.txt).

## Repository structure

- `manifest.json`: extension metadata and permissions
- `background.js`: background entry point
- `index.html`: extension interface entry point
- `assets/`: compiled JavaScript and CSS
- `icons/`: extension icons
- `LEIA-ME-v1.1.2.txt`: original release notes

## Verification and limitations

Manifest, entry points, referenced assets and four icons were checked for presence in the repository. This is not a runtime test, complete security audit or byte-for-byte comparison with the original archive. Original development sources are not included in this compiled distribution. The release notes state that real-account and locked-Windows testing were not performed.

Keep account exports, session data, credentials and tokens outside version control. Review platform rules and browser permissions before use or distribution.
