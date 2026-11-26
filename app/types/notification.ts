export type KnownNotificationEventType =
  | 'APPLICATION_CREATED'
  | 'APPLICATION_ACCEPTED'
  | 'APPLICATION_REJECTED'
  | 'CHALLENGE_CLOSED'

export type NotificationEventType = KnownNotificationEventType | (string & {})

export interface NotificationItem {
  id: string
  event_type: NotificationEventType
  title: string
  message: string
  link_url: string | null
  is_read: boolean
  created_at: string
}

export interface NotificationListResponse {
  items: NotificationItem[]
  unread_count: number
}

export interface MarkNotificationReadResponse {
  id: string
  is_read: true
  unread_count: number
}

export interface MarkAllNotificationsReadResponse {
  updated_count: number
  unread_count: number
}
