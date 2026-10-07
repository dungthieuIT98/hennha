# Audit mode

Find at most three UI problems that are proven, not guessed, then write plans only for the ones the user picks. Audit mode is read-only on product files: write only under `design-plans/`.

## 1. Pick one surface

Honor the user's scope. If it is broad, pick one route (`#/`, `#/create`, `#/n/<code>`, `#/q`) and say which. Trace it from its `<template id="tpl-…">` in `index.html` through `SCREENS.<name>` in `js/app.js`, the `HN.*` helpers in `js/core.js`, and the rules in `css/app.css` that actually match its elements.

## 2. Record the design language

```markdown
## Design language
- Audited surface:
- Design sources: (SKILL.md rules, :root tokens, DESIGN.md if present)
- Governing owners and consumers: (classes/helpers used and where)
- Explicit exceptions: None documented
```

## 3. Prove each finding

A candidate becomes a finding only when all three proofs hold:

1. **Contract.** A rule in SKILL.md, a token or class in `css/app.css`, or a direct contradiction between two parts of the same flow. Repetition or personal taste is not a contract.
2. **Runtime.** The cited rule, value, or element actually reaches the surface: the selector matches, the code path runs, the state is reachable.
3. **Correction.** Exactly one change follows from the evidence, naming the existing token/class/helper to reuse. If several fixes are plausible, or the fix needs new product intent, drop it.

In scope: visual presentation, copy layout, component styling, accessibility (SKILL.md §3), and motion cost (§4). Out of scope unless asked: data wiring, routing, storage, security, and code style.

Hierarchy, density, or "feels cluttered" claims need screenshots. Take them (SKILL.md §6) or drop the claim.

## 4. Try to falsify

Re-open every cited line. Delete a finding if it doesn't match the code exactly, the rule doesn't govern that property, the difference is deliberate (e.g. the web3 glow), another finding has the same root cause, or the fix invents intent.

## 5. Report

```markdown
## Findings
| # | Problem | Evidence (file:line) | Proposed change | Scope | Confidence |
| --- | --- | --- | --- | --- | --- |

## Improve first
<One finding: strongest evidence and highest leverage, and why.>
```

If nothing survives, write `No supported findings were found.` and `No supported recommendation.`

Then stop and ask which findings to plan. If the user asked to fix directly, offer a plan first; switch to Implement mode only when they confirm.

## 6. Plan template

One plan per selected change, saved as `design-plans/<slug>.md`. Write it so an agent with no context can execute it.

```markdown
# <Outcome>

Written against: <git rev-parse --short HEAD, or "uncommitted">

## Evidence
- Surface: <route / state>
- Problem: <direct observation>
- Rule: <SKILL.md section, token, or class>
- Owner: <file:line>
- Affected: <other routes/classes sharing the owner>

## Decision
<The change and why it fixes the root cause.>

## Reuse
- <token / class / HN helper>
- Exemplar: <file:line already doing it right>

## Changes
1. <file>
   - Change: <exact edit>
   - Preserve: <identity/behavior that must not change>
   - Verify: <observable result>

## Validation
- Flows: <routes, states, keyboard path, 390px + 1280px>
- Check: `node --check js/*.js` → no output

## Stop if
- <assumption that, if false, means the plan is wrong>
```
