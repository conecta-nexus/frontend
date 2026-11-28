export type ModerationActionType = 'CHALLENGE_SUSPEND' | 'USER_SUSPEND' | 'CONTENT_FLAG'

export type ModerationTargetType = 'CHALLENGE' | 'USER'

export type ModerationActorRole = 'ADMIN'

export interface AuditLogEntry {
  id: string
  actor_id: string
  actor_email: string
  actor_role: ModerationActorRole | string
  action_type: ModerationActionType | string
  target_id: string
  target_type: ModerationTargetType | string
  justification: string
  ip_address: string
  created_at: string
}

export interface AuditLogQueryFilters {
  page?: number
  page_size?: number
  action_type?: ModerationActionType | ''
  actor_id?: string
  start_date?: string
  end_date?: string
}

export interface PaginatedAuditLogResponse {
  count: number
  next: string | null
  previous: string | null
  results: AuditLogEntry[]
}

export interface SuspensionRequestPayload {
  justification: string
}

export interface SuspensionActionResponse {
  audit_log: AuditLogEntry
  target: Record<string, unknown>
}
