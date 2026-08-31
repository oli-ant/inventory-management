# Checklists

Used by `saas-redesign` Step 0 (Audit) and Step 5 (Visual QA). Copy the relevant list into your working notes and tick items off; report anything left unticked in the final summary.

## Audit (Step 0)

Structure
- [ ] Shell component identified (file + line range of header/nav markup and of `<router-view>`)
- [ ] Router file identified; every route listed with path, component, name/meta
- [ ] Nav labels: i18n key per route noted; hardcoded labels flagged for new keys
- [ ] Locale files listed (all of them get the new keys)
- [ ] Components currently inside the header listed (profile menu, language switcher, search, notifications) with how their dropdowns are positioned
- [ ] Root-level modals / toasts mounted in the shell listed (must survive the rewrite)
- [ ] Global (unscoped) style block located; shared primitive class names listed (`.page-header`, `.card`, `.stats-grid`, `.stat-card`, tables, `.badge`, `.loading`, `.error`, modal classes)

Couplings
- [ ] `grep -rn "position: *sticky" src/` — each hit noted with its `top:` value
- [ ] `grep -rn "top: *[0-9]\+px" src/` — hardcoded header offsets noted
- [ ] Selectors that reference the old header (`.top-nav`, `.nav-container`, `header >`) noted
- [ ] Duplicated container rules (`max-width`, horizontal padding) across shell / filter bar / views noted
- [ ] Existing z-index values collected (`grep -rn "z-index" src/`) to map onto the `--z-*` scale
- [ ] Palette in use collected (`grep -rno "#[0-9a-fA-F]\{6\}" src/ | sort | uniq -c | sort -rn`) and mapped to tokens; outliers flagged

Baseline
- [ ] App starts; every route loads without console errors (record any pre-existing ones so they are not blamed on the redesign)
- [ ] "Before" screenshots taken with Playwright for every route at 1440px and 768px, saved to a scratch directory
- [ ] Project test/build commands identified and passing before changes

## Visual QA (Step 5)

Run with the dev server up, via Playwright MCP. Breakpoints: **1440, 1024, 768** (resize the browser for each).

Route x breakpoint matrix (screenshot each cell, compare with "before")
- [ ] `/` (dashboard)
- [ ] every other primary route
- [ ] one deep-linked reload per route (load the URL directly, not via click) — active nav item still correct

Shell behaviour
- [ ] Active nav item matches the current route after click, reload, and browser back/forward
- [ ] Exactly one item active at a time; `/` is not active on other routes
- [ ] Collapse toggle: rail shows icons only, `title` tooltip on hover, content reflows, no label text peeking
- [ ] Collapse state survives a full reload (localStorage)
- [ ] <= 767px: sidebar hidden, hamburger visible; drawer opens; closes on overlay click, `Escape`, and link click; body content not horizontally scrollable while open
- [ ] Topbar title updates per route and is translated when the language switches
- [ ] Language switcher and profile menu open fully visible (not clipped by topbar), above filter bar and content
- [ ] Filter bar sticks immediately under the topbar while scrolling a long page; no gap, no overlap
- [ ] Modals open centred above sidebar and topbar; scrim covers the sidebar too; page behind does not scroll

Visual consistency (spot-check at 1440)
- [ ] Page titles same size/weight/spacing on every view
- [ ] Card padding, radius, border, shadow identical across views (inspect 3 cards on 3 views)
- [ ] Grid gaps use the spacing scale (20/24px), section spacing consistent
- [ ] Tables: header style, row height, hover, numeric alignment consistent across views
- [ ] Badges: same height/radius/typography everywhere; colours still mean the same status
- [ ] Form controls 36px tall with visible focus ring
- [ ] No raw hex colours or off-scale spacing introduced (`git diff | grep -n "#[0-9a-fA-F]\{6\}"` on added lines should only show tokens.css)
- [ ] No emojis or icon-font glyphs in markup

Accessibility
- [ ] `Tab` from page load reaches: sidebar links -> collapse toggle -> topbar controls -> filters -> content, each with a visible focus style
- [ ] `<aside>`, `<nav aria-label>`, `<header>`, `<main>` landmarks present exactly once
- [ ] Active link has `aria-current="page"`; hamburger/collapse buttons have `aria-label` and `aria-expanded`
- [ ] Text contrast >= 4.5:1 for nav labels (default, hover, active) and muted text on cards
- [ ] `prefers-reduced-motion`: width/transform transitions disabled

Regression
- [ ] Zero new console errors or Vue warnings on any route
- [ ] No horizontal scrollbar on `body` at any breakpoint (wide tables scroll inside their container)
- [ ] Filters still change the data on every view that used them
- [ ] All root modals still open from their triggers (profile details, tasks, detail modals)
- [ ] Project tests pass; production build succeeds
- [ ] "After" screenshots saved next to "before" and referenced in the summary
