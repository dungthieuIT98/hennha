# DESIGN.md mode

Write `DESIGN.md` at the project root so later agents get the design language without re-reading all CSS. Modify only `DESIGN.md`.

## Evidence

Read in this order and use only what the rendered app actually uses:

1. An existing `DESIGN.md` (preserve accepted decisions unless the user replaces them).
2. `:root` in `css/app.css`.
3. Shared classes (`.btn`, `.glass`, `.glow-border`, `.choice`, `.option`, `.seg`, `.field`, `.ticket`) and the `HN.*` UI helpers in `js/core.js`.
4. The four route templates in `index.html`.

A value goes into the document only if it is a named token or used by at least two screens. Never turn one-off literals into tokens, and never invent token names.

## Format

Frontmatter (exact values live only here):

```yaml
---
version: alpha
name: Hẹn Nha
description: <one line>
colors:            # flat map; keys match ^[a-zA-Z0-9][a-zA-Z0-9-]*$, taken from :root names
  bg: "#07060f"
typography:        # named scales; fields only fontFamily, fontSize, lineHeight, fontWeight, letterSpacing
  display:
    fontFamily: Baloo 2
rounded:           # only names that exist in source (e.g. base from --radius)
  base: 18px
---
```

Markdown sections, only when supported and in this order: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts. The Overview states purpose and direction (web3 night theme for 18–25 year-olds, dating invitation) only as far as the repo or the user states it. Every other sentence must change an implementation choice. No token inventories in prose, no audit notes, and no Don'ts that the source doesn't state.

## Validate

If network access is allowed, run `npx @google/design.md lint DESIGN.md` and `npx @google/design.md export --format dtcg DESIGN.md`. Every populated category must appear in the export. Don't keep the exported files. If validation can't run, say so in the report.

## Report

Return the sources used, what was omitted and why, and the validation result.
