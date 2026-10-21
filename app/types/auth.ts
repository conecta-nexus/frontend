export type UserRole = 'STUDENT' | 'COMPANY' | 'ADMIN'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  scopes: string[]
  is_active?: boolean
  is_email_verified?: boolean
  created_at?: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface VerifyResponse {
  valid: boolean
  user_id: string
  email: string
  role: UserRole
  scopes: string[]
}

export interface DataConsent {
  id: string
  user_id: string
  policy_version: string
  is_accepted: boolean
  accepted_at: string
}

export interface StudentProfile {
  id: string
  user_id: string
  full_name: string
  student_code: string
  academic_program: string
  current_semester: number
  completed_courses: string[]
  technical_skills: string[]
  interest_areas: string[]
  bio: string | null
  contact_email: string
  contact_phone: string | null
  is_profile_complete: boolean
  created_at: string
  updated_at: string
}

export interface CompanyProfile {
  id: string
  user_id: string
  nit: string
  business_name: string
  economic_sector: string
  description: string | null
  website_url: string | null
  public_links: string[]
  contact_name: string
  contact_email: string
  contact_phone: string
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface StudentRegisterPayload {
  email: string
  password: string
  full_name: string
  student_code: string
  academic_program?: string
  current_semester: number
  completed_courses?: string[]
  technical_skills?: string[]
  interest_areas?: string[]
  bio?: string
  contact_email?: string
  contact_phone?: string
}

export interface CompanyRegisterPayload {
  email: string
  password: string
  nit: string
  business_name: string
  economic_sector: string
  description?: string
  website_url?: string
  public_links?: string[]
  contact_name: string
  contact_email?: string
  contact_phone: string
}
