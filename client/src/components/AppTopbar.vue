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
