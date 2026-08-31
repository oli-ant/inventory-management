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
      <!-- Toggling collapse is meaningless while 768-1024px forces the icon rail
           (railForced), so the button is hidden entirely rather than just disabled. -->
      <button
        v-if="!railForced"
        class="collapse-toggle"
        type="button"
        :aria-label="rail ? t('nav.expand') : t('nav.collapse')"
        :aria-expanded="String(!rail)"
        :title="rail ? t('nav.expand') : undefined"
        @click="toggleCollapsed"
      >
        <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 4h18v16H3z" /><path d="M9 4v16" /><path :d="rail ? 'm14 9 3 3-3 3' : 'm17 9-3 3 3 3'" />
        </svg>
        <span class="nav-label">{{ t('nav.collapse') }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useAppShell } from '../composables/useAppShell'

const props = defineProps({
  items: { type: Array, required: true },          // [{ path, labelKey, icon, badge? }]
  brandTitle: { type: String, required: true },
  brandSubtitle: { type: String, default: '' }
})

const { t } = useI18n()
const route = useRoute()
const { rail, railForced, toggleCollapsed, closeMobile } = useAppShell()

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
  /* The .sidebar-open -> translateX(0) rule lives in App.vue's global block:
     this project's build does not support the :global() scoped-style escape. */
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
