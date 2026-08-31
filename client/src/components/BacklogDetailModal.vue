<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen && backlogItem" class="modal-overlay" @click="close">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">Inventory Shortage Details</h3>
            <button class="close-button" :aria-label="t('common.close')" @click="close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="shortage-header">
              <div class="shortage-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path d="M24 8L24 28M24 34L24 36" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                  <circle cx="24" cy="24" r="18" stroke="currentColor" stroke-width="3"/>
                </svg>
              </div>
              <div class="shortage-title-section">
                <h4 class="item-name">{{ translateProductName(backlogItem.item_name) }}</h4>
                <div class="item-sku">SKU: {{ backlogItem.item_sku }}</div>
              </div>
              <span class="priority-badge" :class="backlogItem.priority">
                {{ backlogItem.priority }} Priority
              </span>
            </div>

            <div class="shortage-summary">
              <div class="summary-card danger">
                <div class="summary-label">Shortage Amount</div>
                <div class="summary-value">{{ shortage }} units</div>
              </div>
              <div class="summary-card warning">
                <div class="summary-label">Days Delayed</div>
                <div class="summary-value">{{ backlogItem.days_delayed }} days</div>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Order ID</div>
                <div class="info-value order-id">{{ backlogItem.order_id }}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Item SKU</div>
                <div class="info-value sku">{{ backlogItem.item_sku }}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Quantity Needed</div>
                <div class="info-value">{{ backlogItem.quantity_needed }} units</div>
              </div>

              <div class="info-item">
                <div class="info-label">Quantity Available</div>
                <div class="info-value">{{ backlogItem.quantity_available }} units</div>
              </div>

              <div class="info-item">
                <div class="info-label">Expected Date</div>
                <div class="info-value">{{ formatDate(backlogItem.expected_date) }}</div>
              </div>

              <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value">
                  <span class="badge danger">Backordered</span>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="close">Close</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from '../composables/useI18n'

const { t, translateProductName } = useI18n()

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  backlogItem: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const shortage = computed(() => {
  if (!props.backlogItem) return 0
  return props.backlogItem.quantity_needed - props.backlogItem.quantity_available
})

const close = () => {
  emit('close')
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  /* Scrim tint has no dedicated token; rgba literal is the one allowed exception */
  background: rgba(15, 23, 42, 0.5);
  display: grid;
  place-items: center;
  padding: var(--space-6);
  z-index: var(--z-modal);
}

.modal-container {
  width: 100%;
  max-width: 700px;
  max-height: calc(100vh - 2 * var(--space-6));
  overflow: auto;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: var(--text-xl);
  font-weight: var(--weight-semibold);
  color: var(--color-text-strong);
  letter-spacing: var(--tracking-tight);
}

.close-button {
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: var(--transition-colors);
}

.close-button:hover {
  background: var(--color-bg-subtle);
  color: var(--color-text-strong);
}

.close-button:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.modal-body {
  flex: 1;
  padding: var(--space-6);
}

.shortage-header {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-6);
}

.shortage-icon {
  width: 64px;
  height: 64px;
  /* Flat token color replaces the old gradient - no gradient tokens in the system */
  background: var(--color-danger);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-on-primary);
  flex-shrink: 0;
}

.shortage-title-section {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-strong);
  margin: 0 0 var(--space-2) 0;
}

.item-sku {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.priority-badge {
  height: 22px;
  display: inline-flex;
  align-items: center;
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.025em;
  flex-shrink: 0;
}

.priority-badge.high {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.priority-badge.medium {
  background: var(--color-caution-subtle);
  color: var(--color-caution);
}

.priority-badge.low {
  background: var(--color-info-subtle);
  color: var(--color-info);
}

.shortage-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-8);
}

/* Inner stat box: uniform chrome, the value color carries the danger/warning meaning */
.summary-card {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}

.summary-label {
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.summary-value {
  font-size: var(--text-3xl);
  font-weight: var(--weight-bold);
  color: var(--color-text-strong);
}

.summary-card.danger .summary-value {
  color: var(--color-danger);
}

.summary-card.warning .summary-value {
  color: var(--color-caution);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.info-label {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.info-value {
  font-size: var(--text-base);
  color: var(--color-text-strong);
  font-weight: var(--weight-medium);
}

.info-value.order-id,
.info-value.sku {
  font-family: var(--font-mono);
  color: var(--color-primary);
}

.badge {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--weight-semibold);
}

.badge.danger {
  background: var(--color-danger-subtle);
  color: var(--color-danger);
}

.modal-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.btn-secondary {
  height: var(--control-height);
  padding: 0 var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  font-weight: var(--weight-medium);
  font-size: var(--text-sm);
  color: var(--color-text);
  cursor: pointer;
  transition: var(--transition-colors);
  font-family: inherit;
}

.btn-secondary:hover {
  background: var(--color-bg-subtle);
}

.btn-secondary:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

/* Modal transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--duration-base) var(--ease-standard);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform var(--duration-base) var(--ease-standard);
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}

@media (max-width: 768px) {
  .modal-overlay { padding: var(--space-3); }
  .modal-header,
  .modal-body,
  .modal-footer { padding: var(--space-4); }
}
</style>
