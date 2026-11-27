<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import NotificationDrawer from '~/components/notifications/NotificationDrawer.vue'
import { useNotifications } from '~/composables/useNotifications'

const { accessToken, user } = useAuth()
const {
  unreadCount,
  formattedBadge,
  isOpen,
  toggleDrawer,
  startPolling,
  stopPolling,
  resetState,
} = useNotifications()

const activeUserId = computed(() =>
  accessToken.value && user.value?.id ? user.value.id : null,
)

const buttonAriaLabel = computed(() => {
  if (unreadCount.value <= 0) {
    return 'Notificaciones, sin mensajes pendientes'
  }
  return unreadCount.value === 1
    ? 'Notificaciones, 1 notificación sin leer'
    : `Notificaciones, ${unreadCount.value} notificaciones sin leer`
})

onMounted(() => {
  if (activeUserId.value) {
    startPolling()
  }
})

watch(activeUserId, (nextUserId, prevUserId) => {
  if (nextUserId === prevUserId) return

  stopPolling({ force: true })
  resetState(nextUserId)

  if (nextUserId) {
    startPolling()
  }
})

onBeforeUnmount(() => {
  stopPolling()
  if (!activeUserId.value) {
    resetState(null)
  }
})
</script>

<template>
  <div class="relative inline-flex items-center">
    <button
      type="button"
      data-testid="notification-bell-button"
      :aria-label="buttonAriaLabel"
      :aria-expanded="isOpen ? 'true' : 'false'"
      aria-controls="notification-drawer-panel"
      aria-haspopup="dialog"
      class="relative inline-flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl border-2 border-neutral-900 bg-surface text-text-main shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-neutral-100 active:scale-95 active:shadow-none dark:border-neutral-700 dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.12)] dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
      @click="toggleDrawer"
    >
      <UIcon
        name="i-lucide-bell"
        class="h-4 w-4 sm:h-5 sm:w-5"
        aria-hidden="true"
      />

      <span
        v-if="unreadCount > 0"
        data-testid="notification-bell-badge"
        class="absolute -right-1.5 -top-1.5 inline-flex min-w-[20px] items-center justify-center rounded-full border-2 border-neutral-900 bg-institutional-500 px-1 py-0.5 text-[10px] font-black leading-none text-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-950"
      >
        {{ formattedBadge }}
      </span>
    </button>

    <NotificationDrawer />
  </div>
</template>
