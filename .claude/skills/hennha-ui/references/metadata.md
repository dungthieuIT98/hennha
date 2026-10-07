# Metadata mode

The site is one static `index.html` with hash routes, deployed by `.github/workflows/pages.yml` to `https://dungthieuit98.github.io/hennha/` (`HN.DOMAIN` in `js/data.js`). Crawlers and chat apps (Zalo, Messenger) never run JS and never see the hash, so every shared link previews with the `<head>` of `index.html`. Do not try to make per-invite previews.

## Rules, by priority

1. **One source.** Define every tag once, in the `<head>` of `index.html`. No duplicate title, description, canonical, or robots tags. Values are static, with no JS-generated meta.
2. **Title and description.** Title format: `Hẹn Nha · <short purpose>`. The description is plain Vietnamese text, about 150 characters or less, with no emoji spam.
3. **Canonical.** `<link rel="canonical" href="https://dungthieuit98.github.io/hennha/">`. `og:url` must match it exactly.
4. **Social card.**
   - Set `og:type=website`, `og:title`, `og:description`, `og:image`, `og:locale=vi_VN`, and `twitter:card=summary_large_image`.
   - The image URL must be absolute and the image must be committed to the repo (CSP and self-hosting rule). Use 1200×630 PNG/JPG and set `og:image:width`/`height`/`alt`.
5. **Icons.** Add a committed favicon (`favicon.ico` or SVG) and a 180px `apple-touch-icon`. `theme-color` stays `#07060f` to match `--bg`.
6. **Indexing.** The site is public, so no `noindex`. Invite data lives in the URL hash, which is never sent to servers or indexed — keep it that way.
7. **Structured data.** None. There is nothing (product, rating, organization) that JSON-LD would truthfully describe.
8. **Locale.** Keep `<html lang="vi">`. No hreflang until a second language exists.

## Checks

- Meta tags need no CSP change: CSP governs what the page loads, not what crawlers fetch for `og:image`.
- After deploy, verify the card with the real URL (Facebook Sharing Debugger, or paste into Zalo). Localhost previews prove nothing.
- Keep the diff limited to `<head>` and the new image/icon files.
