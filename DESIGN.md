# FontFox Design System

## Visual Theme
FontFox uses a quiet dark interface for browsing font collections. The UI should feel like a focused utility: low decoration, clear hierarchy, and dense but readable rows.

## Typography
- UI font: Inter/system sans for controls, labels, lists, and collection rows.
- Brand type: Inter for the sidebar wordmark and active collection page title.
- Mono font: Geist Mono only for technical CSS stacks and compact source labels.
- Use a small scale: 12px metadata, 13px labels, 15px sidebar items, 24px brand, 30px page title.
- Use restrained weights: 200 light for collection titles, 400 font names and tags, 450 regular, 560 medium, 640 semibold.
- Do not show author/designer metadata inside compact collection rows; it breaks scan rhythm.

## Components
- Font rows are horizontal scan units: name on the left, source badge on the right, both center-aligned on the same axis.
- Grid view is optional and should use restrained cards for side-by-side font preview only; row view remains the default.
- Source badges are bordered pills with mono text and muted color.
- Sidebar collection items use the same font family, size, and weight across all rows. The current collection is highlighted with a subtle border and surface fill.
- Sidebar collection context menus use compact utility styling and expose Rename/Delete without adding persistent row controls.
- Icon buttons are 34px square with a 9px radius and muted borders.

## Layout
- Sidebar is fixed/sticky and owns app-level controls: brand, preview controls, and collection navigation.
- Main content is a row-based list inspired by Google Fonts: collection title, count, then full-width font rows separated by borders.
- Avoid card-heavy layouts for the collection page.

## Guardrails
- Do not mix serif, mono, and sans in the same category of text.
- Do not use extra metadata unless it changes the user decision.
- Do not render a font preview unless FontFox has access to the actual font file or source stylesheet.
