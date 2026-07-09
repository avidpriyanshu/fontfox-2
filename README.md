# FontFox

FontFox is a browser extension for collecting, previewing, and sharing typefaces while you browse.

It keeps font collections in browser bookmarks, captures previews from foundry pages when a live webfont is not available, and publishes clean web share pages through GitHub Pages.

## Features

- Save font families into bookmark-backed collections.
- Detect fonts from Google Fonts, Adobe Fonts, CoType Foundry, Tightype, DaFont, 1001 Fonts, and other foundry pages.
- Preview Google Fonts with live text controls.
- Capture image previews for fonts that cannot be rendered directly.
- Export collections as Markdown or JSON.
- Share lightweight collection URLs with embedded data.
- Publish full collection pages with hosted preview images through GitHub.

## Sharing

FontFox supports two share formats:

- **Copy Web Share URL** creates a self-contained URL for lightweight sharing.
- **Publish Web Share** uploads collection JSON and captured previews to this repository, then copies a stable GitHub Pages URL.

Publishing uses the GitHub Contents API. For personal use, create a fine-grained GitHub token with read/write Contents access to this repository and paste it when FontFox asks. The token is stored locally in extension storage.

## Local Setup

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select `manifest.json` from this folder.
4. Open a supported font page.
5. Use the extension popup to create or update a collection.

For Chromium browsers, load the folder from `chrome://extensions` with Developer Mode enabled.

## Project Structure

- `manifest.json` defines the WebExtension.
- `popup.html`, `popup.css`, and `src/popup.js` power the extension popup.
- `collection.html`, `collection.css`, and `src/collection.js` render local and shared collections.
- `src/bookmark-store.js` stores collection metadata against browser bookmarks.
- `src/font-sources.js` detects supported font sources.
- `src/preview-*` captures image previews for non-renderable font sources.
- `src/github-publisher.js` publishes hosted collection shares.

## Privacy

Collections are stored locally by default. Publishing a web share writes collection metadata and preview images to the public GitHub repository so they can be served by GitHub Pages.
