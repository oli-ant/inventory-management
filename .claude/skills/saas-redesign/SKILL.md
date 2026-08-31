---
name: saas-redesign
description: Redesign a Vue 3 app into a modern SaaS-style UI — a left vertical sidebar replacing the top nav bar, design tokens for consistent spacing/color/radius, and polished cards, tables, forms and modals. Use when asked to modernize the UI, add a sidebar layout, replace the top navigation, do a visual polish pass, or make the app look like a professional SaaS product.
---

# SaaS Redesign (Vue 3)

Convert a Vue 3 SPA from a top-nav layout into a sidebar-based SaaS application shell, introduce design tokens so spacing, color, radius and elevation are consistent everywhere, and run a polish pass over every view. This is a **visual/structural** redesign: routes, data flow, API calls, computed logic and i18n behaviour must come out unchanged.

Reference files (read them before starting, pass them to subagents verbatim):

- `references/design-tokens.css` — the `:root` token sheet to install
- `references/app-shell.md` — copy-ready `App.vue` shell, `AppSidebar.vue`, `AppTopbar.vue`, and the sticky-offset patch
- `references/checklist.md` — audit checklist (step 0) and visual QA checklist (step 5)

## Target Outcome (definition of done)

```
+-----------+--------------------------------------------------+
|  SIDEBAR  |  TOPBAR   page title            [lang] [profile] |  <- sticky, --topbar-height
|  brand    +--------------------------------------------------+
|           |  FILTER BAR (existing, sticky under topbar)      |
|  nav      +--------------------------------------------------+
|  items    |                                                  |
|  w/ icons |  CONTENT  max-width var(--content-max-width)     |
|           |           padding  var(--content-padding)        |
|  -------  |           cards / grids / tables on tokens       |
|  collapse |                                                  |
+-----------+--------------------------------------------------+
   240px (64px collapsed, off-canvas drawer < 768px)
```

1. **App shell**: CSS-grid layout, full-height sticky left sidebar (`--sidebar-width` 240px) with brand block, primary nav (one `navItems` array, inline SVG icons, label, active state with `aria-current="page"`), and a collapse toggle in the footer. Collapsed = 64px icon rail with `title` tooltips, state persisted in `localStorage`. Below 768px the sidebar becomes an off-canvas drawer opened by a hamburger in the topbar, closed by overlay click, `Escape`, or navigation.
2. **Topbar**: slim (`--topbar-height` 56px) sticky bar in the main column: hamburger (mobile only), current page title, right-aligned global controls (language switcher, profile menu, anything that lived in the old header).
3. **Tokens**: one `tokens.css` with color, spacing, radius, shadow, typography, layout and z-index variables; global classes and component styles reference `var(--…)` instead of hex literals and ad-hoc rem values.
4. **Polish**: every view and modal uses the spacing scale (4/8px steps), radius 8/12px, `--shadow-sm` cards on `--color-bg` canvas, consistent page headers, table density, badge styles, focus rings, hover states.
5. **No regressions**: same routes, same data, same filters, same translations, zero console errors, no horizontal scroll at 1440 / 1024 / 768.

## Workflow

Work through the steps in order. Each step is small enough to verify on its own; keep the app building between steps.

### Step 0 — Audit (you, read-only)

Use `references/checklist.md` § Audit. At minimum establish and write down:

- **Shell component** (usually `src/App.vue`): header/nav markup, where `<router-view>` sits, global (unscoped) style block.
- **Router**: file and route list (`path`, component, existing `name`/meta). These become `navItems`.
- **Nav labels**: i18n keys used by the current nav; note any hardcoded labels.
- **Couplings to the old header** — grep for them:
  ```bash
  grep -rn "position: sticky\|position:sticky" src/
  grep -rn "top: *[0-9]\+px" src/            # hardcoded header offsets
  grep -rn "nav-container\|top-nav\|header" src/ --include=*.vue
  grep -rno "#[0-9a-fA-F]\{6\}" src/ | sort | uniq -c | sort -rn | head -30   # palette in use
  ```
- **Header-anchored dropdowns** (profile menu, language switcher, notifications): how they position (`absolute; right: 0; top: 100%` is fine in a topbar, breaks in a sidebar footer).
- **Shared primitives** already in global CSS (`.page-header`, `.card`, `.stats-grid`, `.stat-card`, tables, `.badge`, `.loading`, `.error`) — these get re-pointed at tokens, **not renamed**, so views keep working mid-migration.
- **Before screenshots**: start the app and use Playwright MCP to capture every route at 1440px and 768px wide. Save under a scratch dir; you compare against them in step 5.

### Step 1 — Install design tokens (you)

1. Create `src/assets/tokens.css` from `references/design-tokens.css`. Adjust the brand/primary values only if the app already has a different brand color; keep the slate neutrals.
2. Import it **first** in the entry file (`src/main.js`): `import './assets/tokens.css'` before `App.vue` so tokens exist when component styles evaluate.
3. In the global style block, replace literals with tokens in the shared primitives (body, `.page-header`, `.card*`, `.stat-card*`, `.stats-grid`, tables, `.badge*`, `.loading`, `.error`). Do not change selectors or markup in this step.
4. Build (`npm run build`) — must be clean.

### Step 2 — Build the app shell (delegate to `vue-expert`)

Creating or significantly modifying `.vue` files MUST be delegated to the **vue-expert** subagent. Give it, in one prompt:

- the full contents of `references/app-shell.md` and `references/design-tokens.css`
- the audit facts: router file + routes, i18n keys for nav labels, which components move from the header into the topbar, which modals stay mounted at the app root
- the project rules below (no emojis, unique keys, comment non-obvious logic, scoped styles, Composition API)

Deliverables from the subagent:

- `src/components/AppSidebar.vue` — per template. `navItems = [{ path, labelKey, icon }]` is the single source of truth for the menu; icons come from the inline SVG map in the template (add icons there, never emoji or an icon font).
- `src/components/AppTopbar.vue` — per template; hosts the hamburger, a title, and a right-side actions slot.
- `src/App.vue` restructured to:
  ```html
  <div class="app-shell" :class="{ 'sidebar-collapsed': collapsed, 'sidebar-open': mobileOpen }">
    <AppSidebar ... />
    <div class="sidebar-overlay" @click="mobileOpen = false" />
    <div class="app-main">
      <AppTopbar ...><template #actions> <LanguageSwitcher/> <ProfileMenu .../> </template></AppTopbar>
      <FilterBar />            <!-- if the app has one -->
      <main class="main-content"><router-view /></main>
    </div>
    <!-- root-level modals unchanged -->
  </div>
  ```
  All existing `setup()` logic (tasks, modals, auth, i18n) is preserved as-is; only shell state (`collapsed`, `mobileOpen`) is added.
- Old `.top-nav`, `.nav-container`, `.nav-tabs`, `.logo`, `.subtitle` rules removed from global CSS and replaced by the layout rules in the template.

### Step 3 — Decouple from the old header (you or vue-expert)

- Any `position: sticky; top: <header height>px` (typically the filter bar) becomes `top: var(--topbar-height)` and `z-index: var(--z-filterbar)`. Add a one-line comment explaining the variable keeps it aligned with the topbar.
- Inner containers that duplicated the header's `max-width`/`padding` (e.g. `.filters-container`, `.main-content`) use `var(--content-max-width)` and `var(--content-padding)`.
- Delete selectors that targeted the old header (`.nav-container > .language-switcher` etc.).
- Dropdowns now living in the topbar keep `right: 0; top: calc(100% + var(--space-2))` and get `z-index: var(--z-dropdown)`.
- i18n: add any new keys to **every** locale file — typically `nav.reports` (if hardcoded), `nav.collapse`, `nav.expand`, `nav.openMenu`, `nav.closeMenu`, `nav.primary` (aria-label). Never leave a hardcoded English label in the shell.

### Step 4 — Polish pass per view (delegate to `vue-expert`, one view per prompt for files > ~400 lines)

For each view and each modal component, the subagent applies tokens and the spacing scale without touching script logic:

- Page header: `h2` `--text-2xl`/700, description `--color-text-muted`, `margin-bottom: var(--space-6)`; optional right-side actions aligned on the same row.
- Cards / stat cards / chart cards: `background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); padding: var(--space-5)`. Grid gaps `var(--space-5)`; section spacing `var(--space-6)`.
- Tables: header `--color-bg-subtle`, uppercase `--text-xs` labels, row height ~44px, row hover `--color-bg-subtle`, numeric columns right-aligned, container `overflow-x: auto`.
- Badges/status: keep the existing green/blue/yellow/red semantics, map to `--color-success/-info/-warning/-danger` + their `-subtle` backgrounds, `--radius-full`.
- Form controls (selects, inputs, buttons): 36px height, `--radius-md`, border `--color-border-strong`, focus ring `box-shadow: var(--focus-ring)`; primary button `--color-primary` / hover `--color-primary-hover`.
- Modals: overlay `rgba(15,23,42,.5)` at `--z-overlay`, panel `--radius-xl`, `--shadow-lg`, `z-index: var(--z-modal)`, header/body/footer padding `var(--space-6)`.
- Charts (custom SVG): leave drawing code alone; only container padding/legend spacing may change.
- Remove now-duplicated per-view rules that the global primitives already cover.

### Step 5 — Verify (you, Playwright MCP)

Start the app and walk `references/checklist.md` § Visual QA: every route at 1440 / 1024 / 768, screenshots next to the "before" set, and explicitly check: active nav item follows the route (including on reload and browser back), collapse/expand persists across reload, mobile drawer opens/closes (hamburger, overlay, Escape, link click), filter bar sticks directly under the topbar while scrolling, dropdowns and modals render above the sidebar, no console errors, no horizontal scrollbar, keyboard Tab order sidebar -> topbar -> content with visible focus. Run the project's test/build commands.

### Step 6 — Review

Run the **code-reviewer** subagent on the diff; fix what it finds. Then summarize for the user: files added/changed, screenshots taken, anything intentionally left (e.g. a view too custom to tokenise fully).

## Rules and Guardrails

1. **No behaviour changes.** Routes, API calls, composables, computed properties, filter semantics and emitted events stay identical. If a redesign idea needs a logic change, list it as a follow-up instead of doing it.
2. **No emojis anywhere in the UI.** Icons are inline SVG (stroke 1.75–2, `currentColor`, 20px in nav). No icon fonts or new dependencies unless the user asks.
3. **Delegate `.vue` creation/major edits to vue-expert**, and pass along: the reference templates, tokens, "comment non-obvious logic", "unique keys in v-for (path/sku/id, never index)", "scoped styles", "no emojis".
4. **Tokens over literals.** New CSS may not introduce raw hex colors, px spacings outside the scale, or new z-index numbers — add a token if one is genuinely missing.
5. **Keep shared class names stable** (`.card`, `.page-header`, `.stats-grid`, `.badge`, …) so unrevised views never break mid-migration; restyle them, don't rename them.
6. **One z-index scale** (`--z-*` tokens). Sidebar < dropdown < overlay < modal.
7. **Accessibility**: `<aside>` + `<nav aria-label>`; `aria-current="page"` on the active link; collapse and hamburger buttons have `aria-label`/`aria-expanded`; `title` on icon-only links when collapsed; respect `prefers-reduced-motion` for width/transform transitions; text contrast >= 4.5:1 on both sidebar and content.
8. **i18n complete**: every new visible string or aria-label goes through `t()` with keys added to all locales.
9. **Comment non-obvious logic** at the point of change (localStorage persistence, the sticky offset variable, why the overlay is a sibling of the sidebar, route-matching rule for nested paths).
10. Frontend only — never touch `server/`, data files, or API contracts.

## Lessons Learned (pitfalls seen when this skill was first run)

Bake these into the delegation prompts; each one cost a fix-up round the first time.

- **Ship the global form-control rules with the shell.** If `select`/`input`/`.btn` rules from `app-shell.md` §5 are left out of the global block, every filter select renders as a bare native control. Include them in the Step 2 prompt explicitly.
- **`.page-header` children vary.** Some views render `<div class="page-header"><h2/><p/></div>` (bare children), others wrap title+desc and add actions. Use `flex-wrap` + `.page-header > h2, .page-header > p { flex-basis: 100% }` so both layouts work.
- **Grids that contain tables need `minmax(0, 1fr)` and `min-width: 0` on the card.** Bare `1fr` tracks take the table's min-content width, so a `nowrap` table blows the card past the viewport even though `.table-container` has `overflow-x: auto`.
- **Table density after losing 240px.** `td { white-space: nowrap }` + `th { white-space: normal }` (headers may wrap to two lines) keeps key columns visible at 1440 without horizontal scroll; offer `td.wrap` as an opt-in for long free-text columns and `.num` for right-aligned figures.
- **Reducing `auto-fit` minimums.** KPI/stat grids sized for a full-width layout (e.g. `minmax(220px,1fr)` × 5) leave an orphan card once the sidebar eats 240px; drop the minimum (180px) or the check will only show up in screenshots.
- **Forced icon rail is a viewport rule, not a preference.** `useAppShell` exposes `rail` (= user-collapsed OR 768–1024px) and `railForced`; bind layout classes to `rail`, hide the toggle while forced, persist only the user preference.
- **Register shell listeners once.** `useAppShell()` is called by App, Sidebar and Topbar; route watcher, Escape handler, matchMedia listener and body scroll-lock belong inside the one-time init block, not per caller.
- **Filter bar must wrap.** Give `.filters-container`/`.filters-grid` `flex-wrap: wrap`, shrink select min-width at <=1024, and switch to a 2-column grid with stacked labels at <768; otherwise it is the first thing to overflow.
- **Polish agents delete "dead" CSS that isn't dead.** Tell them to grep the template for every class before removing a rule (a donut legend swatch lost its size that way).
- **Hardcoded `aria-label="Close"` sneaks in.** Remind modal polish prompts that aria-labels go through `t()` too.
- **Headless screenshot artifact:** with the mobile drawer open, Playwright screenshots can show sticky topbar/filter bar undimmed under the rgba scrim even though `elementFromPoint` confirms the scrim covers them (an opaque test colour proves coverage). Verify with hit-testing before "fixing" stacking.
- **Playwright snapshots are huge on table pages.** Delegate screenshot sweeps to a subagent and have it move files to the scratch directory; keep the main context for decisions.

## Example Target: this repository (inventory-management)

Facts gathered so the audit is instant here; re-verify line numbers before editing.

- Shell: `client/src/App.vue` — template lines 2-39 (`header.top-nav > .nav-container > .logo + nav.nav-tabs + LanguageSwitcher + ProfileMenu`, then `<FilterBar/>`, then `main.main-content`). Global unscoped styles from ~line 164: reset, body, `.app` flex column, `.top-nav` (sticky, 70px via `.nav-container`), `.nav-tabs`, `.main-content` (max-width 1600px, padding 1.5rem 2rem), then shared primitives `.page-header`, `.stats-grid`, `.stat-card`, `.card`, tables, `.badge`, `.loading`, `.error`.
- Router: `client/src/main.js` — `/` Dashboard, `/inventory`, `/orders`, `/demand`, `/spending` (label key `nav.finance`), `/reports` (label hardcoded "Reports" -> add `nav.reports` to `locales/en.js` and `locales/ja.js`).
- Nav i18n keys: `nav.overview`, `nav.inventory`, `nav.orders`, `nav.finance`, `nav.demandForecast`, brand `nav.companyName` / `nav.subtitle` (composable `composables/useI18n.js`).
- Couplings: `components/FilterBar.vue` scoped style `.filters-bar { position: sticky; top: 70px; z-index: 90 }` and `.filters-container { max-width: 1600px; padding: 0 2rem }`; `App.vue` rule `.nav-container > .language-switcher`; `ProfileMenu.vue` / `LanguageSwitcher.vue` dropdowns are `absolute; right: 0; top: calc(100% + .5rem)` (fine once they sit in the topbar's right cluster).
- Root modals to keep in `App.vue`: `ProfileDetailsModal`, `TasksModal` (+ tasks logic in `setup()`).
- Views: `client/src/views/{Dashboard,Inventory,Orders,Spending,Demand,Reports,Backlog}.vue`; modals in `client/src/components/*Modal.vue` share a hand-rolled `.modal-overlay > .modal-content` pattern.
- Design system in `CLAUDE.md`: slate neutrals (#0f172a, #64748b, #e2e8f0), status green/blue/yellow/red, custom SVG charts, CSS Grid, no emojis — the token sheet encodes exactly this palette.
- Verify with the project commands/skills: `/start`, Playwright MCP against `http://localhost:3000`, `/test`, `cd client && npm run build`.

## Key Reminders

- Audit first, screenshots before and after, build stays green between steps.
- Tokens file imported before `App.vue`; literals become `var(--…)`; class names stay.
- Sidebar = one `navItems` array + inline SVG map; active state via route matching with `aria-current`.
- Collapse persisted in `localStorage`; drawer below 768px with overlay + Escape.
- Fix every `top: <px>` sticky offset to `var(--topbar-height)`.
- New strings -> all locale files. No emojis. Unique keys. Comment the non-obvious.
- Delegate `.vue` work to vue-expert with the references pasted in; finish with Playwright QA and code-reviewer.
