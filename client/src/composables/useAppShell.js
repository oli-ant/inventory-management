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
