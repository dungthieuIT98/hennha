---
name: hennha-ui
description: UI rules for the Hẹn Nha gift-project (vanilla HTML/CSS/JS, GSAP, Lottie, strict CSP, web3 night theme). Use for any UI work in this repo — building or changing screens, components, animation, forms, dialogs, copy layout, page metadata — and for reviewing or auditing UI, accessibility, motion performance, or writing a DESIGN.md.
license: MIT (adapted from ibelick/ui-skills and stevembarclay/pencilplaybook, see LICENSES.md)
---

# Hẹn Nha UI

One rulebook for every UI change in this project. Rules are ordered by priority; when two conflict, the earlier section wins.

## Modes

| Request | Mode | Output |
| --- | --- | --- |
| build / fix / change UI (default) | **Implement** | Edit code, then verify in a browser |
| review `<file>` | **Review** | Violations list (quote snippet · why, one sentence · concrete fix). No edits |
| audit / improve / "what should we fix" | **Audit** | Read [references/audit.md](references/audit.md). Read-only, max 3 findings |
| title, OG, favicon, share preview | **Metadata** | Read [references/metadata.md](references/metadata.md) |
| document the design system | **DESIGN.md** | Read [references/design-md.md](references/design-md.md) |

## 1. Project constraints (never break)

- Stack is vanilla. Do not add Tailwind, React, a component library, or any npm runtime dependency. Vendor libs live in `vendor/` and are self-hosted.
- CSP is `default-src 'none'`, scripts/styles `'self'` only: no inline `<script>`, no `style="…"` attributes in HTML, no external URLs for fonts, images, or scripts. Setting styles through JS (CSSOM, GSAP) is fine.
- Build DOM with `HN.el(tag, cls, text)` and `textContent`. Never `innerHTML` with data — invite text comes from the URL.
- Every screen registers cleanup with `HN.onLeave(fn)`: tweens, intervals, observers, listeners on `document`/`window`.
- Prefer minimal diffs. Do not refactor or restyle code unrelated to the task.

## 2. Visual identity

- The web3 night look is intentional: dark background, glass panels, neon pink/violet/cyan gradients, glow. Keep it. Do not "clean up" gradients or glow.
- Reuse tokens in `css/app.css` `:root` (`--pink`, `--violet`, `--cyan`, `--gold`, `--mint`, `--error`, `--grad`, `--grad-btn`, `--stroke*`, `--glass`, `--radius`, `--display`, `--body`, `--mono`). Add a new color or gradient only when no token can express it, and add it to `:root`.
- Reuse existing classes before writing new ones: `.btn` (`-ghost`, `-sm`, `-lg`, `-block`), `.glass`, `.glow-border`, `.choice`, `.option`, `.chip`, `.seg`, `.field`/`.input-wrap`/`.hint`, `.eyebrow`, `.sub`, `.badge`, `.ticket`.
- One primary (`.btn`) action per view; secondary actions use `.btn-ghost` or `.link`.
- Glow must never be the only signal of a state. Selected/active/error states also change border, text, icon, or an ARIA attribute.
- Empty states give one clear next action.

## 3. Accessibility

- Every control has an accessible name. Icon-only buttons get `aria-label`; decorative emoji/icons get `aria-hidden="true"`.
- Use native elements: `<button>` for actions, `<a href>` for navigation, `<dialog>` for modals. Do not put `role="tab"`, `listbox`, or `option` on things without the full keyboard model. Toggle groups are buttons with `aria-pressed`; disclosures use `aria-expanded` + `aria-controls`.
- Modals: use `HN.sheet(build)` (bottom sheet) or follow `HN.shot`. Both use `showModal()`, which provides focus containment, Escape, and focus restore. If an action must run after a sheet closes, use `close(() => next())`.
- When a step or screen changes, move focus with `HN.focusHeading(container)`. When a re-render replaces the focused button, re-focus its replacement.
- Never remove focus outlines without a visible replacement. `:focus-visible` already draws the cyan ring.
- Forms: `<label for>` on every field, `aria-required` on required ones, the error `<p>` linked with `aria-describedby` and `aria-live="polite"`, `aria-invalid` toggled together with `.invalid`. A disabled submit button explains why in a visible hint.
- Loading: use `aria-busy` plus changed button text instead of `disabled` when the button keeps focus.
- Text contrast is at least 4.5:1 (3:1 for 24px+ text and for icons/borders/control edges). `--muted` on `--bg` passes; check new colors.
- Touch targets are at least 44×44px on mobile. Never block paste.
- Split or animated text (`HN.split`) keeps the full sentence in a `.sr-only` span.

## 4. Motion

Motion is part of the product, but it must be cheap and interruptible.

- Animate only `transform` and `opacity` (GSAP `x`, `y`, `scale`, `rotation`, `opacity`/`autoAlpha`). Never animate `left`, `top`, `width`, `height`, `margin`, or `padding`. Paint properties (`background-position`, `box-shadow`, `color`) are allowed only on small elements.
- Interaction feedback (hover, press, toggle) takes 200ms or less. Entrances and step transitions take 250–600ms. One-shot celebrations (burst, elastic reveals) may run longer.
- Use GSAP named eases (`power2/3.out` for enter, `power2.in` for exit, `back.out` for playful pops). No new `cubic-bezier` curves.
- Every infinite loop must:
  - go through `HN.loop(tween)`, which kills it on leave and skips it under reduced motion,
  - pause off-screen via `HN.pauseOffscreen([[node, [tweens]]])`, which also pauses CSS animations through `.paused`,
  - mount Lottie only through `HN.mountLotties`, which pauses off-screen loops.
- Respect `prefers-reduced-motion`: check `HN.reduce` before adding new JS motion. CSS is already globally clamped.
- Do not animate `blur()`/`backdrop-filter`, and do not put `backdrop-filter` on continuously moving elements. Keep static blur on panels only.
- `will-change` only on short-lived animated nodes (e.g. `.particle`), never permanently.
- No scroll-event-driven animation. Use `IntersectionObserver` (`HN.reveal`) or CSS scroll timelines.
- Measure once, then animate (FLIP). Never interleave layout reads and writes in a loop.

## 5. Layout and typography

- Use `dvh` with a `vh` fallback line, never bare `100vh` for full-height layouts.
- Fixed elements respect `env(safe-area-inset-*)` (`viewport-fit=cover` is on).
- z-index for page layers comes only from the scale in `:root` (`--z-bg` … `--z-toast`). Small numbers inside an isolated component are fine. Dialogs use the top layer and need no z-index.
- Headings use `text-wrap: balance` and paragraphs use `pretty` (set globally). Numbers that update or align (counts, times, countdowns, dates) use `font-variant-numeric: tabular-nums`.
- Do not change existing `letter-spacing` conventions: mono uppercase eyebrows are tracked wide on purpose. Do not add tracking elsewhere.
- Body line-height is 1.5 or more, headings 1.0–1.2. Keep body measure at 75ch or less.
- Long user strings (names, messages) use `overflow-wrap: anywhere`. Single-line rows use ellipsis.
- Check 390px and 1280px widths, and the receiver flow inside the 360px preview iframe.

## 6. Verify (Implement mode)

1. `node --check` on every file in `js/*.js` and `js/screens/*.js`.
2. Serve the folder (`python -m http.server 8765 --bind 127.0.0.1`) and drive it with `playwright-core` plus the system Chrome (`executablePath`). Install it in the scratchpad, never in the project.
3. Exercise the changed flow by mouse and keyboard (Tab, Enter, Escape). Use `{ force: true }` when clicking elements that loop-animate.
4. Screenshot at 390px and 1280px and look at them. Check for zero `pageerror` events (`favicon.ico` 404 is known).
5. Stop the server task when done.

Before handing over, state in one line which rules you applied and any you deliberately skipped, with the reason.
