/**
 * Conecta Nexus — Challenge Domain TypeScript Interfaces and Types
 * Aligned with Challenge Backend Models (FastAPI / SQLAlchemy Async) and ADR-002
 */

export type DifficultyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

export type Modality = 'REMOTE' | 'HYBRID' | 'ON_SITE'

export type InitialChallengeStatus = 'DRAFT' | 'OPEN'

export type ChallengeStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'CLOSED'
  | 'CANCELLED'

export type AllowedMimeType =
  | 'application/pdf'
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const ALLOWED_ATTACHMENT_MIME_TYPES: AllowedMimeType[] = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]

/**
 * File attachment associated with a challenge
 */
export interface ChallengeAttachment {
  id: string
  challenge_id: string
  file_name: string
  file_size_bytes: number
  mime_type: AllowedMimeType | string
  storage_path?: string
  uploaded_by?: string
  download_url?: string
  created_at: string
}

/**
 * Complete representation of a Challenge entity
 */
export interface Challenge {
  id: string
  company_id: string
  title: string
  description: string
  business_process: string
  status: ChallengeStatus
  difficulty_level: DifficultyLevel
  modality: Modality
  min_semester: number
  economic_sector: string
  required_skills: string[]
  knowledge_areas: string[]
  attachments?: ChallengeAttachment[]
  created_at: string
  updated_at: string
}

/**
 * Privacy-safe challenge detail returned by the public catalog endpoint.
 * Corporate contact channels are intentionally absent from this projection.
 */
export interface PublicChallengeDetail extends Challenge {
  company_name?: string
  attachments: ChallengeAttachment[]
}

/**
 * Payload required to create a new challenge (HU-06)
 */
export interface ChallengeCreatePayload {
  title: string
  description: string
  business_process: string
  difficulty_level: DifficultyLevel
  modality: Modality
  min_semester: number
  economic_sector: string
  required_skills?: string[]
  knowledge_areas?: string[]
  status?: InitialChallengeStatus
}

/**
 * Payload for partial challenge updates (HU-06 / HU-08)
 */
export interface ChallengeUpdatePayload {
  title?: string
  description?: string
  business_process?: string
  difficulty_level?: DifficultyLevel
  modality?: Modality
  min_semester?: number
  economic_sector?: string
  required_skills?: string[]
  knowledge_areas?: string[]
  status?: InitialChallengeStatus
}

/**
 * Payload for voluntary challenge closure with mandatory reason (HU-08)
 */
export interface ChallengeClosePayload {
  reason: string
}

/**
 * Audit log recording challenge closure and justification
 */
export interface ChallengeClosureLog {
  id: string
  challenge_id: string
  closed_by: string
  justification: string
  created_at: string
}

/**
 * Multi-criteria filter and pagination options for public catalog (HU-09, HU-10)
 */
export interface ChallengeCatalogFilter {
  q?: string
  economic_sector?: string
  sector?: string
  modality?: Modality
  difficulty_level?: DifficultyLevel
  difficulty?: DifficultyLevel
  skill?: string
  knowledge_area?: string
  min_semester?: number
  page?: number
  limit?: number
  page_size?: number
}

/**
 * Generic paginated response wrapper from API
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

/**
 * Ephemeral signed download response
 */
export interface AttachmentDownloadResponse {
  download_url: string
  expires_in_seconds?: number
  file_name?: string
}

/**
 * Metadata provided when catalog filter yields 0 matches
 */
export interface ChallengeEmptyStateMetadata {
  query_params: Record<string, unknown>
  suggested_reset: boolean
  total_active_challenges: number
}
