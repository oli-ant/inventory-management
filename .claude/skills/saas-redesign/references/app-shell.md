# App Shell Templates

Copy-ready pieces for Step 2 and Step 3 of the `saas-redesign` skill. All styles reference `design-tokens.css`; install that first.

Contents:

1. `composables/useAppShell.js` — sidebar collapsed / mobile drawer state
2. `components/AppSidebar.vue` — brand, nav from `navItems`, inline SVG icons, collapse toggle
3. `components/AppTopbar.vue` — hamburger, title, actions slot
4. `App.vue` — shell markup, what to keep from the old file, global layout CSS
5. Global primitives re-pointed at tokens (drop-in replacement for the old global block)
6. Sticky-offset patch for a filter bar
7. Adapting to other projects

The components use `<script setup>`. If the project uses `export default { setup() { … return {…} } }`, keep that style — the logic is identical.

---

## 1. `src/composables/useAppShell.js`

```js
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const STORAGE_KEY = 'app.sidebarCollapsed'
// Between these widths the sidebar is always an icon rail; below the min it is an off-canvas drawer.
const RAIL_QUERY = '(min-width: 768px) and (max-width: 1024px)'

// Module-level refs so every component calling useAppShell() shares one state:
// App.vue owns the layout classes, AppSidebar/AppTopbar toggle them.
const collapsed = ref(false)   // user's explicit preference (desktop > 1024px)
const narrow = ref(false)      // viewport is in the forced-rail range
const mobileOpen = ref(false)
let initialised = false

// What the layout should actually render: the user's choice on wide screens,
// always the icon rail on narrow desktops/tablets. The toggle is hidden while forced.
const rail = computed(() => collapsed.value || narrow.value)
const railForced = computed(() => narrow.value)

const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
  localStorage.setItem(STORAGE_KEY, String(collapsed.value))
}
const openMobile = () => { mobileOpen.value = true }
const closeMobile = () => { mobileOpen.value = false }

export function useAppShell() {
  // One-time wiring. Several components call useAppShell(); the listeners and
  // watchers below are app-lifetime singletons, so they are registered only on
  // the first call (App.vue's setup) instead of once per caller.
  if (!initialised) {
    initialised = true
    collapsed.value = localStorage.getItem(STORAGE_KEY) === 'true'

    // matchMedia listener keeps `narrow` in sync on resize/orientation change
    // without a resize handler firing on every pixel.
    const mql = window.matchMedia(RAIL_QUERY)
    narrow.value = mql.matches
    mql.addEventListener('change', (e) => { narrow.value = e.matches })

    // Navigating from the drawer should close it; watching the route covers
    // link clicks, programmatic pushes and browser back/forward alike.
    // useRoute() needs a component setup context, which the first caller provides.
    const route = useRoute()
    watch(() => route.fullPath, closeMobile)

    // Lock page scroll behind the open drawer so content doesn't move under the scrim.
    watch(mobileOpen, (open) => { document.body.style.overflow = open ? 'hidden' : '' })

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && mobileOpen.value) closeMobile() })
  }

  return { collapsed, rail, railForced, mobileOpen, toggleCollapsed, openMobile, closeMobile }
}
```

---

## 2. `src/components/AppSidebar.vue`

```vue
<template>
  <aside class="app-sidebar" :class="{ collapsed: rail }">
    <div class="sidebar-brand">
      <!-- Monogram stays visible in the 64px rail; full name hides -->
      <span class="brand-mark" aria-hidden="true">{{ brandInitials }}</span>
      <div class="brand-text">
        <span class="brand-name">{{ brandTitle }}</span>
        <span v-if="brandSubtitle" class="brand-subtitle">{{ brandSubtitle }}</span>
      </div>
      <button
        class="sidebar-close"
        type="button"
        :aria-label="t('nav.closeMenu')"
        @click="closeMobile"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
      </button>
    </div>

    <nav class="sidebar-nav" :aria-label="t('nav.primary')">
      <ul>
        <li v-for="item in items" :key="item.path">
          <router-link
            :to="item.path"
            class="nav-item"
            :class="{ active: isActive(item.path) }"
            :aria-current="isActive(item.path) ? 'page' : undefined"
            :title="rail ? t(item.labelKey) : undefined"
          >
            <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path v-for="d in icons[item.icon] || icons.dot" :key="d" :d="d" />
            </svg>
            <span class="nav-label">{{ t(item.labelKey) }}</span>
            <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
          </router-link>
        </li>
      </ul>
    </nav>

    <div class="sidebar-footer">
      <slot name="footer" />
      <!-- Hidden while the viewport forces the rail (768-1024px): toggling would do nothing visible -->
      <button
        v-if="!railForced"
        class="collapse-toggle"
        type="button"
        :aria-label="collapsed ? t('nav.expand') : t('nav.collapse')"
        :aria-expanded="String(!collapsed)"
        :title="collapsed ? t('nav.expand') : undefined"
        @click="toggleCollapsed"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 4h18v16H3z" /><path d="M9 4v16" /><path :d="collapsed ? 'm14 9 3 3-3 3' : 'm17 9-3 3 3 3'" />
        </svg>
        <span class="nav-label">{{ t('nav.collapse') }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '../composables/useI18n'   // adapt to the project's i18n
import { useAppShell } from '../composables/useAppShell'

const props = defineProps({
  items: { type: Array, required: true },          // [{ path, labelKey, icon, badge? }]
  brandTitle: { type: String, required: true },
  brandSubtitle: { type: String, default: '' }
})

const { t } = useI18n()
const route = useRoute()
const { collapsed, rail, railForced, toggleCollapsed, closeMobile } = useAppShell()

const brandInitials = computed(() =>
  props.brandTitle.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
)

// '/' must match exactly, otherwise every route would light up Overview;
// other items match their own path and any nested child (/orders/123).
const isActive = (path) =>
  path === '/' ? route.path === '/' : route.path === path || route.path.startsWith(path + '/')

// Inline SVG paths (24x24, stroke = currentColor). Add icons here; never emoji or icon fonts.
const icons = {
  dashboard: ['M3 3h7v9H3z', 'M14 3h7v5h-7z', 'M14 12h7v9h-7z', 'M3 16h7v5H3z'],
  inventory: [
    'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z',
    'M3.3 7 12 12l8.7-5', 'M12 22V12'
  ],
  orders: ['M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'M9 2h6v4H9z', 'M9 12h6', 'M9 16h6'],
  finance: ['M3 6h18v13H3z', 'M3 10h18', 'M7 15h3'],
  demand: ['M22 7 13.5 15.5 8.5 10.5 2 17', 'M16 7h6v6'],
  reports: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 18v-2', 'M12 18v-5', 'M16 18v-8'],
  backlog: ['M12 6v6l4 2', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
  settings: [
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H8a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V8a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z'
  ],
  dot: ['M12 12h.01']
}
</script>

<style scoped>
.app-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  width: var(--sidebar-current-width);
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  z-index: var(--z-sidebar);
  overflow: hidden;               /* labels clip instead of wrapping while width animates */
  transition: width var(--duration-base) var(--ease-standard);
}

/* ---- Brand ---- */
.sidebar-brand {
  height: var(--topbar-height);   /* aligns the brand row with the topbar baseline */
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--sidebar-border);
  flex-shrink: 0;
}
.brand-mark {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: var(--text-sm);
  font-weight: var(--weight-bold);
  letter-spacing: 0.02em;
}
.brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: var(--leading-tight);
}
.brand-name {
  font-size: var(--text-md);
  font-weight: var(--weight-bold);
  color: var(--sidebar-brand-text);
  letter-spacing: var(--tracking-tight);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.brand-subtitle {
  font-size: var(--text-xs);
  color: var(--sidebar-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sidebar-close { display: none; }

/* ---- Nav ---- */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3) var(--space-3);
}
.sidebar-nav ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.nav-item,
.collapse-toggle {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: var(--nav-item-height);
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  color: var(--sidebar-text);
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  text-decoration: none;
  white-space: nowrap;
  transition: var(--transition-colors);
}
.nav-item:hover,
.collapse-toggle:hover {
  background: var(--sidebar-item-hover-bg);
  color: var(--sidebar-text-hover);
}
.nav-item:focus-visible,
.collapse-toggle:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}
.nav-item.active {
  background: var(--sidebar-active-bg);
  color: var(--sidebar-active-text);
  font-weight: var(--weight-semibold);
}
.nav-item.active::before {
  /* 3px accent bar on the left edge of the active item */
  content: '';
  position: absolute;
  left: calc(-1 * var(--space-3));
  top: var(--space-2);
  bottom: var(--space-2);
  width: 3px;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--sidebar-active-bar);
}
.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.sidebar-close svg {
  width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round;
}
.nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity var(--duration-fast) var(--ease-standard);
}
.nav-badge {
  margin-left: auto;
  padding: 0 var(--space-2);
  min-width: 20px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  border-radius: var(--radius-full);
  background: var(--color-bg-subtle);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
}

/* ---- Footer ---- */
.sidebar-footer {
  padding: var(--space-3);
  border-top: 1px solid var(--sidebar-border);
  flex-shrink: 0;
}
.collapse-toggle {
  width: 100%;
  border: 0;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
}

/* ---- Collapsed rail (desktop) ---- */
.collapsed .brand-text,
.collapsed .nav-label,
.collapsed .nav-badge {
  opacity: 0;
  pointer-events: none;
  width: 0;
}
.collapsed .sidebar-brand { padding: 0; justify-content: center; }
.collapsed .nav-item,
.collapsed .collapse-toggle { justify-content: center; padding: 0; gap: 0; }
.collapsed .nav-item.active::before { left: calc(-1 * var(--space-3) + 1px); }

/* ---- Mobile drawer ---- */
@media (max-width: 767.98px) {
  .app-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    width: var(--sidebar-width);            /* drawer is always full width, never the rail */
    transform: translateX(-100%);
    transition: transform var(--duration-base) var(--ease-standard);
    box-shadow: var(--shadow-lg);
    z-index: calc(var(--z-overlay) + 1);    /* above its own scrim, below modals */
  }
  :global(.app-shell.sidebar-open) .app-sidebar { transform: translateX(0); }
  /* Collapse is a desktop concept; undo rail styling inside the drawer */
  .collapsed .brand-text,
  .collapsed .nav-label,
  .collapsed .nav-badge { opacity: 1; pointer-events: auto; width: auto; }
  .collapsed .sidebar-brand { padding: 0 var(--space-4); justify-content: flex-start; }
  .collapsed .nav-item { justify-content: flex-start; padding: 0 var(--space-3); gap: var(--space-3); }
  .collapse-toggle { display: none; }
  .sidebar-close {
    display: grid;
    place-items: center;
    margin-left: auto;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--sidebar-text);
    cursor: pointer;
  }
  .sidebar-close:hover { background: var(--sidebar-item-hover-bg); }
}

@media (prefers-reduced-motion: reduce) {
  .app-sidebar, .nav-label { transition: none; }
}
</style>
```

Note on `:global(...)`: Vue scoped styles support `:global()`; if the project's tooling does not, move that one rule into `App.vue`'s global block as `.app-shell.sidebar-open .app-sidebar { transform: translateX(0); }`.

---

## 3. `src/components/AppTopbar.vue`

```vue
<template>
  <header class="app-topbar">
    <button
      class="topbar-menu"
      type="button"
      :aria-label="t('nav.openMenu')"
      :aria-expanded="String(mobileOpen)"
      @click="openMobile"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></svg>
    </button>
    <h1 class="topbar-title">{{ title }}</h1>
    <div class="topbar-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup>
import { useI18n } from '../composables/useI18n'
import { useAppShell } from '../composables/useAppShell'

defineProps({ title: { type: String, default: '' } })
const { t } = useI18n()
const { mobileOpen, openMobile } = useAppShell()
</script>

<style scoped>
.app-topbar {
  position: sticky;
  top: 0;
  z-index: var(--z-topbar);
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--content-padding-x);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.topbar-title {
  /* h1 for document outline; visually a modest section label, the big title lives in .page-header */
  font-size: var(--text-md);
  font-weight: var(--weight-semibold);
  color: var(--color-text-strong);
  letter-spacing: var(--tracking-tight);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.topbar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.topbar-menu {
  display: none;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  place-items: center;
}
.topbar-menu:hover { background: var(--color-bg-subtle); color: var(--color-text-strong); }
.topbar-menu:focus-visible { outline: none; box-shadow: var(--focus-ring); }
.topbar-menu svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }

@media (max-width: 767.98px) {
  .topbar-menu { display: grid; }
}
</style>
```

---

## 4. `src/App.vue` — shell

Template (keep every root-level modal and all existing `setup()` logic; only the header/nav markup is replaced):

```vue
<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': rail, 'sidebar-open': mobileOpen }">
    <AppSidebar
      :items="navItems"
      :brand-title="t('nav.companyName')"
      :brand-subtitle="t('nav.subtitle')"
    />
    <!-- Sibling of the sidebar (not a child) so it can sit between drawer and page in the stacking order -->
    <div class="sidebar-overlay" aria-hidden="true" @click="closeMobile" />

    <div class="app-main">
      <AppTopbar :title="currentTitle">
        <template #actions>
          <LanguageSwitcher />
          <ProfileMenu @show-profile-details="showProfileDetails = true" @show-tasks="showTasks = true" />
        </template>
      </AppTopbar>
      <FilterBar />
      <main class="main-content">
        <router-view />
      </main>
    </div>

    <!-- root modals unchanged: ProfileDetailsModal, TasksModal, ... -->
  </div>
</template>
```

Script additions (merge into the existing `setup()`; nothing existing is removed):

```js
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import AppTopbar from './components/AppTopbar.vue'
import { useAppShell } from './composables/useAppShell'

// Single source of truth for primary navigation (order = display order).
const navItems = [
  { path: '/',          labelKey: 'nav.overview',       icon: 'dashboard' },
  { path: '/inventory', labelKey: 'nav.inventory',      icon: 'inventory' },
  { path: '/orders',    labelKey: 'nav.orders',         icon: 'orders' },
  { path: '/spending',  labelKey: 'nav.finance',        icon: 'finance' },
  { path: '/demand',    labelKey: 'nav.demandForecast', icon: 'demand' },
  { path: '/reports',   labelKey: 'nav.reports',        icon: 'reports' }
]

// inside setup():
const route = useRoute()
const { rail, mobileOpen, closeMobile } = useAppShell()
// Longest matching prefix wins so nested routes (/orders/123) still resolve to "Orders".
const currentTitle = computed(() => {
  const match = navItems
    .filter(i => i.path === '/' ? route.path === '/' : route.path.startsWith(i.path))
    .sort((a, b) => b.path.length - a.path.length)[0]
  return match ? t(match.labelKey) : ''
})
// return { ...existing, navItems, rail, mobileOpen, closeMobile, currentTitle }
```

Global layout CSS (replaces `.app`, `.top-nav`, `.nav-container`, `.logo`, `.subtitle`, `.nav-tabs*`, `.main-content`):

```css
.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-current-width) minmax(0, 1fr);
  min-height: 100vh;
  background: var(--color-bg);
  transition: grid-template-columns var(--duration-base) var(--ease-standard);
}
.app-shell.sidebar-collapsed {
  --sidebar-current-width: var(--sidebar-width-collapsed);
}
.app-main {
  min-width: 0;                 /* lets wide tables scroll inside instead of stretching the grid */
  display: flex;
  flex-direction: column;
}
.main-content {
  flex: 1;
  width: 100%;
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: var(--content-padding);
}
.sidebar-overlay { display: none; }

@media (max-width: 767.98px) {
  .app-shell,
  .app-shell.sidebar-collapsed { grid-template-columns: minmax(0, 1fr); }
  .app-shell.sidebar-open .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    z-index: var(--z-overlay);
  }
}
```

---

## 5. Global primitives on tokens

Drop-in replacement for the shared classes most Vue dashboards carry in `App.vue`. Keep the selectors the project already uses; change only values.

```css
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  background: var(--color-bg);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Page header: title + description, optional actions on the right */
.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-1) var(--space-4);
  flex-wrap: wrap;
  margin-bottom: var(--space-6);
}
/* Views that render bare <h2>/<p> children stack full-width; a view that wraps
   title+desc in a div and adds an actions element still gets side-by-side. */
.page-header > h2, .page-header > p { flex-basis: 100%; }
.page-header h2 {
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-strong);
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-tight);
  margin-bottom: var(--space-1);
}
.page-header p { color: var(--color-text-muted); font-size: var(--text-md); }

/* Cards */
.card,
.stat-card,
.chart-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.card { padding: var(--space-5); margin-bottom: var(--space-6); }
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.card-title {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  color: var(--color-text-strong);
  letter-spacing: var(--tracking-tight);
}

/* Stat cards */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-5);
  margin-bottom: var(--space-6);
}
.stat-card { padding: var(--space-5); }
.stat-label {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: var(--space-2);
}
.stat-value {
  font-size: var(--text-3xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-strong);
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-tight);
}
.stat-card.success .stat-value { color: var(--color-success); }
.stat-card.warning .stat-value { color: var(--color-warning); }
.stat-card.danger  .stat-value { color: var(--color-danger); }
.stat-card.info    .stat-value { color: var(--color-info); }

/* Tables */
.table-container { overflow-x: auto; margin: 0 calc(-1 * var(--space-5)); padding: 0 var(--space-5); }
table { width: 100%; border-collapse: collapse; font-size: var(--text-base); }
thead th {
  background: var(--color-bg-subtle);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-align: left;
  padding: var(--space-3) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  white-space: normal;          /* headers may wrap to two lines so more columns fit beside the sidebar */
  vertical-align: bottom;
  line-height: 1.3;
}
thead th:first-child { border-top-left-radius: var(--radius-md); }
thead th:last-child  { border-top-right-radius: var(--radius-md); }
tbody td {
  padding: var(--space-3) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  vertical-align: middle;
  white-space: nowrap;          /* SaaS tables scroll inside .table-container rather than wrapping cells */
}
td.wrap, th.wrap { white-space: normal; min-width: 220px; }   /* opt-in for long free-text columns */
tbody tr:last-child td { border-bottom: 0; }
tbody tr:hover td { background: var(--color-bg-subtle); }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }

/* Badges: keep existing semantic class names, map to tokens */
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  height: 22px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  line-height: 1;
  white-space: nowrap;
}
.badge.success, .badge.delivered, .badge.in-stock  { background: var(--color-success-subtle); color: var(--color-success); }
.badge.info, .badge.shipped, .badge.processing     { background: var(--color-info-subtle);    color: var(--color-info); }
.badge.warning, .badge.pending, .badge.low-stock   { background: var(--color-caution-subtle); color: var(--color-caution); }
.badge.danger, .badge.cancelled, .badge.out-of-stock { background: var(--color-danger-subtle); color: var(--color-danger); }

/* Form controls */
.btn, select, input[type="text"], input[type="search"], input[type="number"], input[type="date"] {
  height: var(--control-height);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-strong);
  font: inherit;
  font-size: var(--text-sm);
  transition: var(--transition-colors), box-shadow var(--duration-fast) var(--ease-standard);
}
select {
  appearance: none; -webkit-appearance: none; padding-right: var(--space-8); cursor: pointer;
  /* chevron colour mirrors --slate-500; CSS vars cannot be used inside a data URI */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right var(--space-3) center; background-size: 16px;
}
select:hover, input:hover { border-color: var(--slate-400); }
select:focus, input:focus, .btn:focus-visible { outline: none; border-color: var(--color-primary-soft); box-shadow: var(--focus-ring); }
.btn { display: inline-flex; align-items: center; gap: var(--space-2); font-weight: var(--weight-medium); cursor: pointer; }
.btn:hover { background: var(--color-bg-subtle); }
.btn-primary { background: var(--color-primary); border-color: var(--color-primary); color: var(--color-on-primary); }
.btn-primary:hover { background: var(--color-primary-hover); border-color: var(--color-primary-hover); }

/* States */
.loading, .error {
  padding: var(--space-10);
  text-align: center;
  border-radius: var(--radius-lg);
  color: var(--color-text-muted);
}
.error { background: var(--color-danger-subtle); color: var(--color-danger); border: 1px solid var(--color-danger); }

/* Modals (shared pattern: .modal-overlay > .modal-content) */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: grid;
  place-items: center;
  padding: var(--space-6);
  z-index: var(--z-modal);
}
.modal-content {
  width: 100%;
  max-width: 720px;
  max-height: calc(100vh - 2 * var(--space-6));
  overflow: auto;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}
.modal-header, .modal-body, .modal-footer { padding: var(--space-5) var(--space-6); }
.modal-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--color-border); }
.modal-footer { border-top: 1px solid var(--color-border); display: flex; justify-content: flex-end; gap: var(--space-2); }
```

If modal components carry their own scoped copies of these rules, delete the scoped copies during the polish pass so the global ones apply (or keep scoped and swap values for tokens — pick one approach per project and stay consistent).

---

## 6. Sticky-offset patch (filter bar or any secondary toolbar)

```css
.filters-bar {
  position: sticky;
  /* Pinned directly under AppTopbar; the shared token keeps both in sync if the topbar height changes. */
  top: var(--topbar-height);
  z-index: var(--z-filterbar);
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-3) 0;
}
.filters-container {
  max-width: var(--content-max-width);
  margin: 0 auto;
  padding: 0 var(--content-padding-x);
  display: flex;
  align-items: center;
  gap: var(--space-2) var(--space-4);
  flex-wrap: wrap;
}
.filters-grid { display: flex; align-items: center; gap: var(--space-2) var(--space-4); flex-wrap: wrap; flex: 1; }
@media (max-width: 1024px) { .filter-select { min-width: 120px; } }
@media (max-width: 767.98px) {
  /* Two-column grid with stacked labels so the bar never overflows on phones */
  .filters-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2) var(--space-3); }
  .filter-group { flex-direction: column; align-items: stretch; }
  .filter-select { width: 100%; min-width: 0; }
}
.filter-group label {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.filter-select { min-width: 140px; }   /* sizing/colors come from the global select rule */
```

Dropdown menus that moved into the topbar (profile, language):

```css
.dropdown-menu {
  position: absolute;
  right: 0;
  top: calc(100% + var(--space-2));
  z-index: var(--z-dropdown);
  min-width: 200px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: var(--space-2);
}
```

---

## 7. Adapting to other projects

- **Router with named routes / meta**: prefer `meta: { navKey, icon }` on the route records and build `navItems` from `router.getRoutes()` filtered by `meta.navKey`, so nav and router cannot drift.
- **vue-i18n instead of a custom composable**: swap `useI18n` import for `import { useI18n } from 'vue-i18n'`; keys stay the same.
- **Grids that hold tables**: use `grid-template-columns: repeat(N, minmax(0, 1fr))` and `min-width: 0` on the card, otherwise a `nowrap` table's min-content width pushes the card past the viewport.
- **No global filter bar**: drop `<FilterBar/>` and section 6; nothing else changes.
- **Secondary nav sections** (e.g. "Settings", "Admin"): give `navItems` entries a `section` field and render one `<ul>` per section with a `.nav-section-label` (`--text-xs`, uppercase, `--sidebar-muted`, `padding: var(--space-4) var(--space-3) var(--space-2)`), hidden when collapsed.
- **Pinia/Vuex present**: `useAppShell` can live in the store instead; keep the localStorage persistence and the route watcher.
- **Tailwind projects**: keep the token file (Tailwind can read CSS variables via `theme.extend.colors`), and express the layout with utilities; the structure and behaviour rules in SKILL.md still apply.
