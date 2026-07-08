# Fontmark Firefox

A dependency-free WebExtension scaffold for saving font collections as browser bookmarks.

## Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on`.
3. Select `manifest.json` from this folder.
4. Open a page like `https://fonts.google.com/specimen/Roboto`.
5. Click the extension icon, create a collection, then add the detected font.

Temporary add-ons are removed when Firefox restarts. For normal use, package and sign the extension through addons.mozilla.org.

## How It Works

The extension stores collections as normal browser bookmarks:

- It creates or finds a bookmark folder named `Fonts`.
- Each collection is one bookmark inside that folder.
- The bookmark URL opens the extension collection page for that saved bookmark.
- Font metadata is stored in extension storage and keyed by bookmark id.
- The collection page can export Markdown, JSON, or a web share URL.
- Web share URLs point at the GitHub Pages collection viewer and include the share data in the URL hash, so they can open in another browser or on another computer.
- `Publish Web Share` uploads collection JSON and captured preview images to this repo through the GitHub Contents API, then copies a clean `?shareId=` URL.
- Publishing requires a fine-grained GitHub token with read/write Contents access to this repository. The token is stored locally in extension storage.

The popup uses the active tab URL to detect fonts:

- `https://fonts.google.com/specimen/Roboto` detects `Roboto`.
- `https://fonts.google.com/share?family=Roboto&family=Inter` detects both families.
- `https://fonts.googleapis.com/css2?family=Roboto` detects CSS API font links.

## File Map

- `manifest.json` declares the extension, permissions, popup, and Firefox id.
- `popup.html` is the extension menu.
- `popup.css` styles the menu.
- `src/browser-api.js` exposes `ext.*`, using Firefox `browser.*` or a Chrome-compatible wrapper.
- `src/font-sources.js` parses font URLs and builds preview URLs.
- `src/bookmark-store.js` reads and writes bookmark-backed collections.
- `src/popup.js` connects the UI to the parser and bookmark store.

## Expanding Font Sources

Add new parsers in `src/font-sources.js`. A parser should return this shape:

```js
{
  source: "provider-name",
  family: "Primary Font",
  families: ["Primary Font", "Another Font"]
}
```

Useful next targets:

- Google Fonts embed CSS: already partially supported through `fonts.googleapis.com`.
- Adobe Fonts: parse `use.typekit.net/*.css` links, but resolving family names usually requires fetching CSS.
- Bunny Fonts: parse `fonts.bunny.net/css?family=...`.
- Fontshare: parse known family page URLs and CSS links.
- Arbitrary websites: inject a content script on demand, inspect selected text or hovered elements, and read `getComputedStyle(element).fontFamily`.

For arbitrary websites, do not request `<all_urls>` by default unless you need always-on detection. A better privacy posture is to use `activeTab` and inject only after the user clicks a button.

## Browser Portability

This scaffold is written around a small `ext` compatibility object:

- Firefox already exposes promise-based `browser.*`.
- Chromium exposes callback-based `chrome.*`; `src/browser-api.js` wraps the APIs used here into promises.

For Chrome, Edge, Brave, and other Chromium browsers:

1. Remove or ignore `browser_specific_settings`.
2. Test through `chrome://extensions` with Developer Mode enabled.
3. Keep Manifest V3.

For Safari:

1. Use Apple's WebExtension converter from Xcode.
2. Expect packaging/signing differences.
3. Test bookmark APIs carefully because Safari support can differ.
