---
name: verify
description: How to build, launch and drive this app (Vue 3 frontend + FastAPI backend) to verify a change end-to-end at its real surface. Use before committing non-trivial frontend or backend changes.
---

# Verify (inventory-management)

## Surfaces
- **Frontend (GUI)**: Vite dev server on http://localhost:3000 — drive with Playwright MCP (`mcp__playwright__*`), capture screenshots.
- **Backend (API)**: FastAPI on http://localhost:8001 — hit routes with `curl` (see `/api/...` list in CLAUDE.md); OpenAPI at `/docs`.

## Launch
Check first — servers are often already running:
```bash
lsof -ti:3000 >/dev/null && echo "3000 up"; lsof -ti:8001 >/dev/null && echo "8001 up"
```
If not: backend `cd server && uv run python main.py` (background), frontend `cd client && npm run dev` (background). The `/start` command does both. Subagents in the sandbox cannot bind ports; start servers from the main session. Never `pkill` vite/python you didn't start.

Build gate (no lint/test script in client): `cd client && npm run build`. Backend tests: `cd server && uv run pytest ../tests -q`.

## Drive (frontend)
- Routes: `/`, `/inventory`, `/orders`, `/spending`, `/demand`, `/reports`. Load directly with `browser_navigate`; SPA push via `browser_evaluate` + `history.pushState` + `popstate` also works.
- Breakpoints worth checking: 1440x900 (desktop), 1024x800 / 900x800 (forced icon rail), 760x900 and 390x844 (drawer + hamburger).
- Shell state: `localStorage['app.sidebarCollapsed']` ("true"/"false"); clear it before a run. Collapse toggle = `button[aria-label="Collapse sidebar"|"Expand sidebar"]`, hamburger = `button[aria-label="Open menu"]`, scrim = `.sidebar-overlay`.
- Useful DOM facts via `browser_evaluate`: active nav = `.nav-item.active` / `[aria-current="page"]`; topbar title = `h1.topbar-title`; page overflow = `document.documentElement.scrollWidth > clientWidth`.
- Modals: click a table row on `/inventory`, `/orders`, dashboard tables; they Teleport to body with `.modal-overlay`.
- Language: the topbar language switcher toggles en/ja; all nav labels should change.

## Gotchas
- Playwright returns the full accessibility tree after every action; table pages (`/inventory`, `/orders`, `/`) produce 100k+ char results. Delegate multi-page screenshot sweeps to a subagent and have it `mv` files from `.playwright-mcp/` (gitignored) to the scratch dir.
- Known pre-existing console noise (not regressions): `Failed to resolve component: PurchaseOrderModal` on `/`, `GET /api/tasks 404` + "Failed to load tasks", verbose `console.log` in `Reports.vue`.
- Headless screenshots with the mobile drawer open may show the sticky topbar/filter bar undimmed under the rgba scrim; `document.elementFromPoint` confirms the scrim is on top (compositing artifact). Verify stacking by hit-test, not by eye.
- `Backlog.vue` exists but has no route.
