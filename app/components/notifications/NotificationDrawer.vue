<script setup lang="ts">
import { computed } from 'vue'
import { useNotifications } from '~/composables/useNotifications'
import type { NotificationItem } from '~/types/notification'
import {
  formatNotificationFullDate,
  formatNotificationTimestamp,
  getNotificationEventMeta,
  sanitizeNotificationLink,
} from '~/utils/notifications'

const {
  items,
  unreadCount,
  loading,
  loadingMore,
  markingAll,
  hasMore,
  error,
  actionError,
  isOpen,
  isMarking,
  fetchInitial,
  loadMore,
  markAllAsRead,
  handleNotificationClick,
} = useNotifications()

const unreadLabel = computed(() => {
  if (unreadCount.value <= 0) return 'Al día'
  return unreadCount.value === 1 ? '1 sin leer' : `${unreadCount.value} sin leer`
})

const canMarkAllAsRead = computed(
  () => unreadCount.value > 0 && !markingAll.value && !loading.value,
)

function hasSafeDestination(item: NotificationItem): boolean {
  return sanitizeNotificationLink(item.link_url) !== null
}

function getItemAriaLabel(item: NotificationItem): string {
  const status = item.is_read ? 'Leída' : 'No leída'
  const actionHint = hasSafeDestination(item)
    ? 'Abrir detalle de notificación'
    : 'Marcar notificación como leída'
  return `${status}: ${item.title}. ${actionHint}`
}
</script>

<template>
  <USlideover
    id="notification-drawer-panel"
    v-model:open="isOpen"
    side="right"
    title="Centro de notificaciones"
    description="Actualizaciones recientes sobre tus retos y postulaciones en Conecta Nexus."
    :ui="{
      overlay: 'bg-neutral-950/45 backdrop-blur-[1px]',
      content: 'w-full max-w-md border-l-2 border-neutral-900 bg-surface text-text-main shadow-[-6px_0px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-700 dark:shadow-[-6px_0px_0px_0px_rgba(255,255,255,0.08)]',
      header: 'border-b-2 border-neutral-900/15 bg-canvas/70 px-5 py-4 pr-14 dark:border-neutral-700 dark:bg-neutral-900/70',
      body: 'flex-1 overflow-y-auto px-4 py-4 sm:px-5',
      footer: 'border-t-2 border-neutral-900/15 bg-canvas/50 px-5 py-3.5 dark:border-neutral-700 dark:bg-neutral-900/50',
      title: 'text-lg font-black tracking-tight text-text-main',
      description: 'mt-0.5 text-xs font-medium text-text-muted',
    }"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Toolbar de estado y acción rápida -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <p class="text-xs font-bold uppercase tracking-wider text-text-muted">
              Actividad
            </p>
            <span
              data-testid="drawer-unread-summary"
              class="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border-2 px-2.5 py-0.5 text-[11px] font-black leading-none"
              :class="unreadCount > 0
                ? 'border-neutral-900 bg-institutional-500 text-white dark:border-neutral-600'
                : 'border-neutral-900/20 bg-surface text-text-muted dark:border-neutral-700'"
            >
              {{ unreadLabel }}
            </span>
          </div>
          <button
            type="button"
            data-testid="mark-all-read-btn"
            :disabled="!canMarkAllAsRead"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-neutral-900 bg-surface px-3 py-1.5 text-xs font-black text-text-main shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-canvas active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none dark:border-neutral-600 dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
            @click="markAllAsRead"
          >
            <UIcon
              :name="markingAll ? 'i-lucide-loader-circle' : 'i-lucide-check-check'"
              class="h-3.5 w-3.5"
              :class="{ 'animate-spin': markingAll }"
              aria-hidden="true"
            />
            <span>{{ markingAll ? 'Marcando...' : 'Marcar todas como leídas' }}</span>
          </button>
        </div>

        <!-- Error puntual de acción sin ocultar listado -->
        <div
          v-if="actionError"
          role="alert"
          data-testid="notification-action-error"
          class="flex items-start gap-2.5 rounded-2xl border-2 border-rose-600 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-900 dark:border-rose-500/70 dark:bg-rose-950/50 dark:text-rose-200"
        >
          <UIcon name="i-lucide-triangle-alert" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p class="flex-1">
            {{ actionError }}
          </p>
        </div>

        <!-- Skeleton de carga inicial -->
        <div
          v-if="loading && items.length === 0"
          data-testid="notifications-loading-skeleton"
          aria-busy="true"
          aria-label="Cargando notificaciones"
          class="space-y-3"
        >
          <div
            v-for="index in 3"
            :key="index"
            class="animate-pulse rounded-2xl border-2 border-neutral-900/15 bg-canvas/70 p-4 dark:border-neutral-700 dark:bg-neutral-900/60"
          >
            <div class="flex items-start gap-3">
              <div class="h-9 w-9 shrink-0 rounded-xl bg-neutral-300/70 dark:bg-neutral-700" />
              <div class="flex-1 space-y-2">
                <div class="h-3 w-24 rounded bg-neutral-300/80 dark:bg-neutral-700" />
                <div class="h-4 w-3/4 rounded bg-neutral-300/80 dark:bg-neutral-700" />
                <div class="h-3 w-full rounded bg-neutral-200 dark:bg-neutral-800" />
              </div>
            </div>
          </div>
        </div>

        <!-- Error de carga inicial con reintento -->
        <div
          v-else-if="error && items.length === 0"
          role="alert"
          data-testid="notifications-load-error"
          class="rounded-3xl border-2 border-neutral-900 bg-rose-50 p-5 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-600 dark:bg-rose-950/40 dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)]"
        >
          <div class="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-neutral-900 bg-white text-institutional-600 dark:border-neutral-600 dark:bg-neutral-900 dark:text-rose-300">
            <UIcon name="i-lucide-wifi-off" class="h-5 w-5" aria-hidden="true" />
          </div>
          <p class="text-sm font-black text-text-main">
            No pudimos cargar las notificaciones
          </p>
          <p class="mt-1 text-xs font-medium text-text-muted">
            {{ error }}
          </p>
          <button
            type="button"
            data-testid="notifications-retry-btn"
            class="mt-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-neutral-900 bg-institutional-500 px-4 py-2 text-xs font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-institutional-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
            @click="fetchInitial({ showLoader: true })"
          >
            <UIcon name="i-lucide-rotate-cw" class="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reintentar</span>
          </button>
        </div>

        <!-- Estado vacío -->
        <div
          v-else-if="items.length === 0"
          data-testid="notifications-empty-state"
          class="rounded-3xl border-2 border-dashed border-neutral-900/30 bg-canvas/60 px-5 py-10 text-center dark:border-neutral-700 dark:bg-neutral-900/40"
        >
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-neutral-900 bg-surface text-text-muted shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-600 dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]">
            <UIcon name="i-lucide-bell-off" class="h-5 w-5" aria-hidden="true" />
          </div>
          <p class="text-sm font-black text-text-main">
            No tienes notificaciones por ahora
          </p>
          <p class="mt-1 text-xs font-medium leading-relaxed text-text-muted">
            Cuando haya novedades sobre tus retos o postulaciones, aparecerán aquí al instante.
          </p>
        </div>

        <!-- Lista de notificaciones -->
        <ul
          v-else
          data-testid="notifications-list"
          class="space-y-3"
        >
          <li
            v-for="item in items"
            :key="item.id"
          >
            <button
              type="button"
              :data-testid="`notification-item-${item.id}`"
              :data-read="item.is_read ? 'true' : 'false'"
              :aria-label="getItemAriaLabel(item)"
              :disabled="isMarking(item.id)"
              class="group w-full rounded-2xl border-2 p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900"
              :class="item.is_read
                ? 'border-neutral-900/20 bg-surface/80 hover:border-neutral-900/50 hover:bg-canvas/60 dark:border-neutral-700/80 dark:bg-neutral-900/50 dark:hover:border-neutral-500'
                : 'border-neutral-900 bg-pastel-blue/25 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:border-neutral-500 dark:bg-pastel-blue/15 dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.12)]'"
              @click="handleNotificationClick(item)"
            >
              <div class="flex items-start gap-3">
                <div
                  class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2"
                  :class="getNotificationEventMeta(item.event_type).iconContainerClass"
                >
                  <UIcon
                    :name="getNotificationEventMeta(item.event_type).icon"
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                </div>

                <div class="min-w-0 flex-1 space-y-1.5">
                  <div class="flex items-center justify-between gap-2">
                    <span
                      class="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide"
                      :class="getNotificationEventMeta(item.event_type).badgeClass"
                    >
                      {{ getNotificationEventMeta(item.event_type).label }}
                    </span>

                    <div class="flex items-center gap-1.5 shrink-0">
                      <span
                        v-if="!item.is_read"
                        data-testid="notification-unread-dot"
                        aria-label="No leída"
                        class="h-2.5 w-2.5 rounded-full bg-institutional-500 ring-2 ring-white dark:ring-neutral-900"
                      />
                      <span
                        v-else
                        class="text-[10px] font-bold text-text-muted"
                      >
                        Leída
                      </span>
                    </div>
                  </div>

                  <p
                    class="text-sm leading-snug text-text-main break-words"
                    :class="item.is_read ? 'font-bold' : 'font-black'"
                  >
                    {{ item.title }}
                  </p>

                  <p class="text-xs leading-relaxed text-text-muted break-words">
                    {{ item.message }}
                  </p>

                  <div class="flex items-center justify-between gap-2 pt-1">
                    <time
                      :datetime="item.created_at"
                      :title="formatNotificationFullDate(item.created_at)"
                      class="text-[11px] font-bold text-text-muted"
                    >
                      {{ formatNotificationTimestamp(item.created_at) }}
                    </time>

                    <span
                      v-if="hasSafeDestination(item)"
                      class="inline-flex items-center gap-1 text-[11px] font-black text-institutional-600 dark:text-institutional-400 group-hover:underline"
                    >
                      <span>Ver detalle</span>
                      <UIcon name="i-lucide-arrow-right" class="h-3 w-3" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </li>
        </ul>

        <!-- Paginación Cargar más -->
        <div v-if="items.length > 0" class="pt-1 text-center">
          <button
            v-if="hasMore"
            type="button"
            data-testid="notifications-load-more-btn"
            :disabled="loadingMore"
            class="inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-neutral-900 bg-surface px-4 py-2.5 text-xs font-black text-text-main shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-canvas active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-600 dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-institutional-500"
            @click="loadMore"
          >
            <UIcon
              :name="loadingMore ? 'i-lucide-loader-circle' : 'i-lucide-chevrons-down'"
              class="h-4 w-4"
              :class="{ 'animate-spin': loadingMore }"
              aria-hidden="true"
            />
            <span>{{ loadingMore ? 'Cargando más...' : 'Cargar más notificaciones' }}</span>
          </button>

          <p
            v-else
            class="text-[11px] font-bold text-text-muted"
          >
            Has visto todas tus notificaciones
          </p>
        </div>
      </div>
    </template>
  </USlideover>
</template>
