<template>
  <div class="app-shell" :class="{ 'sidebar-collapsed': rail, 'sidebar-open': mobileOpen }">
    <AppSidebar
      :items="navItems"
      :brand-title="t('nav.companyName')"
      :brand-subtitle="t('nav.subtitle')"
    />
    <!-- Sibling of the sidebar (not a child) so it can sit between the drawer and the page in the stacking order -->
    <div class="sidebar-overlay" aria-hidden="true" @click="closeMobile" />

    <div class="app-main">
      <AppTopbar :title="currentTitle">
        <template #actions>
          <LanguageSwitcher />
          <ProfileMenu
            @show-profile-details="showProfileDetails = true"
            @show-tasks="showTasks = true"
          />
        </template>
      </AppTopbar>
      <FilterBar />
      <main class="main-content">
        <router-view />
      </main>
    </div>

    <ProfileDetailsModal
      :is-open="showProfileDetails"
      @close="showProfileDetails = false"
    />

    <TasksModal
      :is-open="showTasks"
      :tasks="tasks"
      @close="showTasks = false"
      @add-task="addTask"
      @delete-task="deleteTask"
      @toggle-task="toggleTask"
    />
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api } from './api'
import { useAuth } from './composables/useAuth'
import { useI18n } from './composables/useI18n'
import { useAppShell } from './composables/useAppShell'
import AppSidebar from './components/AppSidebar.vue'
import AppTopbar from './components/AppTopbar.vue'
import FilterBar from './components/FilterBar.vue'
import ProfileMenu from './components/ProfileMenu.vue'
import ProfileDetailsModal from './components/ProfileDetailsModal.vue'
import TasksModal from './components/TasksModal.vue'
import LanguageSwitcher from './components/LanguageSwitcher.vue'

// Single source of truth for primary navigation (order = display order).
const navItems = [
  { path: '/',          labelKey: 'nav.overview',       icon: 'dashboard' },
  { path: '/inventory', labelKey: 'nav.inventory',      icon: 'inventory' },
  { path: '/orders',    labelKey: 'nav.orders',         icon: 'orders' },
  { path: '/spending',  labelKey: 'nav.finance',        icon: 'finance' },
  { path: '/demand',    labelKey: 'nav.demandForecast', icon: 'demand' },
  { path: '/reports',   labelKey: 'nav.reports',        icon: 'reports' }
]

export default {
  name: 'App',
  components: {
    AppSidebar,
    AppTopbar,
    FilterBar,
    ProfileMenu,
    ProfileDetailsModal,
    TasksModal,
    LanguageSwitcher
  },
  setup() {
    const { currentUser } = useAuth()
    const { t } = useI18n()
    const route = useRoute()
    // `rail` (not the raw `collapsed` preference) drives the layout class: it's true
    // both when the user collapsed the sidebar AND when the viewport forces the icon
    // rail at 768-1024px, so the grid column narrows in both cases.
    const { rail, mobileOpen, closeMobile } = useAppShell()
    const showProfileDetails = ref(false)
    const showTasks = ref(false)
    const apiTasks = ref([])

    // Merge mock tasks from currentUser with API tasks
    const tasks = computed(() => {
      return [...currentUser.value.tasks, ...apiTasks.value]
    })

    // Longest matching prefix wins so nested routes (/orders/123) still resolve to "Orders".
    const currentTitle = computed(() => {
      const match = navItems
        .filter(i => i.path === '/' ? route.path === '/' : route.path.startsWith(i.path))
        .sort((a, b) => b.path.length - a.path.length)[0]
      return match ? t(match.labelKey) : ''
    })

    const loadTasks = async () => {
      try {
        apiTasks.value = await api.getTasks()
      } catch (err) {
        console.error('Failed to load tasks:', err)
      }
    }

    const addTask = async (taskData) => {
      try {
        const newTask = await api.createTask(taskData)
        // Add new task to the beginning of the array
        apiTasks.value.unshift(newTask)
      } catch (err) {
        console.error('Failed to add task:', err)
      }
    }

    const deleteTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const isMockTask = currentUser.value.tasks.some(t => t.id === taskId)

        if (isMockTask) {
          // Remove from mock tasks
          const index = currentUser.value.tasks.findIndex(t => t.id === taskId)
          if (index !== -1) {
            currentUser.value.tasks.splice(index, 1)
          }
        } else {
          // Remove from API tasks
          await api.deleteTask(taskId)
          apiTasks.value = apiTasks.value.filter(t => t.id !== taskId)
        }
      } catch (err) {
        console.error('Failed to delete task:', err)
      }
    }

    const toggleTask = async (taskId) => {
      try {
        // Check if it's a mock task (from currentUser)
        const mockTask = currentUser.value.tasks.find(t => t.id === taskId)

        if (mockTask) {
          // Toggle mock task status
          mockTask.status = mockTask.status === 'pending' ? 'completed' : 'pending'
        } else {
          // Toggle API task
          const updatedTask = await api.toggleTask(taskId)
          const index = apiTasks.value.findIndex(t => t.id === taskId)
          if (index !== -1) {
            apiTasks.value[index] = updatedTask
          }
        }
      } catch (err) {
        console.error('Failed to toggle task:', err)
      }
    }

    onMounted(loadTasks)

    return {
      t,
      navItems,
      rail,
      mobileOpen,
      closeMobile,
      currentTitle,
      showProfileDetails,
      showTasks,
      tasks,
      addTask,
      deleteTask,
      toggleTask
    }
  }
}
</script>

<style>
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

/* ---- App shell layout ---- */
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
  background: var(--color-bg);
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
  /* This single fixed scrim must paint above the sticky .app-topbar (z-30) and
     .filters-bar (z-20) even though it's a grid-item sibling of .app-main, which
     contains both. That works because neither .app-shell nor .app-main sets its
     own position/transform/z-index, so neither establishes a stacking context:
     the topbar/filterbar's sticky+z-index contexts end up compared directly
     against this z-90 overlay in the same (root) stacking context, so 90 wins
     regardless of DOM order. Do not add position/transform/isolation to
     .app-shell or .app-main without re-checking this - doing so would trap the
     topbar/filterbar in a lower local stacking context and the scrim would stop
     covering them. */
  .app-shell.sidebar-open .sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    z-index: var(--z-overlay);
  }
  /* AppSidebar's scoped styles can't reach outside the component, so the
     drawer's open/closed transform toggle lives here instead of a :global() rule. */
  .app-shell.sidebar-open .app-sidebar { transform: translateX(0); }
}

/* ---- Global primitives on tokens ---- */

/* Page header: title + description, optional actions on the right */
.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-1) var(--space-4);
  margin-bottom: var(--space-6);
}
/* Views render bare `<h2>` + `<p>` as direct children of .page-header (no wrapper div),
   so without this they'd sit side-by-side as the two flex items and the description
   would float to the far right. Forcing each to flex-basis: 100% makes them wrap onto
   their own lines and stack, while a view that wraps title+description in its own div
   (leaving room for a sibling actions element) is unaffected since that div isn't a
   direct h2/p child. */
.page-header > h2,
.page-header > p {
  flex-basis: 100%;
}
.page-header h2 {
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-strong);
  letter-spacing: var(--tracking-tight);
  line-height: var(--leading-tight);
  margin-bottom: 0; /* the row-gap half of .page-header's gap now provides this spacing */
}
.page-header p { color: var(--color-text-muted); font-size: var(--text-md); }

/* Form controls: shared sizing/border/focus treatment for native inputs and buttons
   so FilterBar's selects (and any future text/date/number inputs) don't render as
   unstyled native controls. */
select, input[type="text"], input[type="search"], input[type="number"], input[type="date"], .btn {
  height: var(--control-height);
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  color: var(--color-text-strong);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  line-height: 1;
  transition: var(--transition-colors), box-shadow var(--duration-fast) var(--ease-standard);
}
select {
  appearance: none;
  -webkit-appearance: none;
  padding-right: var(--space-8);
  cursor: pointer;
  /* Data-URI SVG background can't reference CSS custom properties, so the stroke
     color (%2364748b) is a literal hex mirroring --slate-500. Keep in sync by hand
     if --slate-500 ever changes. */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-3) center;
  background-size: 16px;
}
select:hover, input[type="text"]:hover, input[type="search"]:hover, input[type="number"]:hover, input[type="date"]:hover {
  border-color: var(--slate-400);
}
select:focus, input:focus, .btn:focus-visible, button:focus-visible {
  outline: none;
  border-color: var(--color-primary-soft);
  box-shadow: var(--focus-ring);
}
select:disabled, input:disabled, button:disabled {
  opacity: .5;
  cursor: not-allowed;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  white-space: nowrap;
}
.btn:hover { background-color: var(--color-bg-subtle); }
.btn-primary {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-on-primary);
}
.btn-primary:hover {
  background-color: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

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
  padding-bottom: 0; /* no divider under the header, just the margin below */
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
.stat-card { padding: var(--space-5); transition: var(--transition-colors), box-shadow var(--duration-fast) var(--ease-standard); }
.stat-card:hover { border-color: var(--color-border-strong); box-shadow: var(--shadow-md); }
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
/* SaaS tables scroll horizontally inside the card rather than wrapping cells, so a
   narrow content column (240px sidebar eats into the 1440px viewport) doesn't force
   identifiers like "TMP-201" or "Warehouse B-05" onto two lines. */
.table-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }
table { width: 100%; border-collapse: collapse; font-size: var(--text-base); }
thead {
  background: var(--color-bg-subtle);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}
th {
  text-align: left;
  padding: var(--space-3) var(--space-3);
  font-weight: var(--weight-semibold);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  /* Headers may now wrap to two lines (unlike td, which stays single-line) so
     more columns fit before the table needs to scroll; vertical-align: bottom
     keeps short and wrapped headers baseline-aligned along the row's bottom edge. */
  white-space: normal;
  vertical-align: bottom;
  line-height: 1.3;
}
td {
  padding: var(--space-3) var(--space-3);
  border-top: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: var(--text-base);
  vertical-align: middle;
  white-space: nowrap;
}
tbody tr { transition: background-color var(--duration-fast) var(--ease-standard); }
tbody tr:hover { background: var(--color-bg-subtle); }
/* Numeric columns: views tag header+cell pairs with .num so figures line up on the right */
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
/* Opt-in for genuinely long free-text columns (notes, descriptions) that should still
   wrap instead of forcing the whole table wider; everything else stays single-line. */
td.wrap, th.wrap { white-space: normal; min-width: 220px; }

/* Badges: keep existing semantic class names, map to tokens.
   Pill shape (radius-full, 22px, inline-flex) but keep the uppercase/tracked
   look the views were designed around. */
.badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.025em;
  white-space: nowrap;
}

.badge.success,
.badge.increasing {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.badge.warning,
.badge.medium {
  /* "warning"/"medium" map to the amber caution token, not the orange warning token,
     so they read distinctly from danger/high at a glance */
  background: var(--color-caution-subtle);
  color: var(--color-caution);
}

.badge.danger,
.badge.decreasing,
.badge.high {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.badge.info,
.badge.low {
  background: var(--color-info-subtle);
  color: var(--color-info);
}

.badge.stable {
  /* No dedicated "neutral" status token; primary-muted bg + slate-700 text keeps
     it visually distinct from success/info/caution/danger */
  background: var(--color-primary-muted);
  color: var(--slate-700);
}

.loading {
  text-align: center;
  padding: var(--space-10);
  color: var(--color-text-muted);
  font-size: var(--text-md);
}

.error {
  background: var(--color-danger-subtle);
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  margin: var(--space-4) 0;
  font-size: var(--text-md);
}
</style>
