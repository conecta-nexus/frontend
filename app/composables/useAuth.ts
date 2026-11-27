import { computed } from 'vue'
import type {
  AuthUser,
  CompanyProfile,
  CompanyRegisterPayload,
  DataConsent,
  StudentProfile,
  StudentRegisterPayload,
  TokenResponse,
  UserRole,
} from '~/types/auth'
import { decodeJwtPayload } from '~/utils/jwt'

interface JwtClaims {
  sub: string
  email: string
  role: UserRole
  scope?: string
  scopes?: string[]
  type?: string
  is_active?: boolean
  exp?: number
}

interface AuthRuntimeState {
  refreshPromise: Promise<boolean> | null
  refreshEpoch: number
  refreshTokenSnapshot: string | null
  initPromise: Promise<boolean> | null
  initEpoch: number
}

// Keyed per NuxtApp instance so Promises are never stored in SSR hydration state
// and never shared across concurrent requests or isolated app instances.
const authRuntimeByContext = new WeakMap<object, AuthRuntimeState>()

function getAuthRuntime(nuxtApp: object): AuthRuntimeState {
  let runtime = authRuntimeByContext.get(nuxtApp)
  if (!runtime) {
    runtime = {
      refreshPromise: null,
      refreshEpoch: -1,
      refreshTokenSnapshot: null,
      initPromise: null,
      initEpoch: -1,
    }
    authRuntimeByContext.set(nuxtApp, runtime)
  }
  return runtime
}

export function useAuth() {
  const nuxtApp = useNuxtApp()
  const { apiFetch, baseUrl } = useApi()

  // Primary authentication reactive states (SSR-isolated per Nuxt context via useState)
  const accessToken = useState<string | null>('auth_access_token', () => null)
  const refreshToken = useCookie<string | null>('auth_refresh_token', {
    maxAge: 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  const user = useState<AuthUser | null>('auth_user', () => null)
  const studentProfile = useState<StudentProfile | null>('auth_student_profile', () => null)
  const companyProfile = useState<CompanyProfile | null>('auth_company_profile', () => null)
  const consent = useState<DataConsent | null>('auth_consent', () => null)
  const isInitializing = useState<boolean>('auth_is_initializing', () => false)
  const sessionGeneration = useState<number>('auth_session_generation', () => 0)
  const explicitSessionEpoch = useState<number>('auth_explicit_session_epoch', () => 0)

  const runtime = getAuthRuntime(nuxtApp)

  const isAuthenticated = computed(() => !!accessToken.value || !!refreshToken.value)
  const userRole = computed<UserRole | null>(() => user.value?.role || null)
  const activeProfile = computed(() => {
    if (userRole.value === 'STUDENT') return studentProfile.value
    if (userRole.value === 'COMPANY') return companyProfile.value
    return null
  })

  function invalidatePendingRuntime() {
    runtime.refreshPromise = null
    runtime.refreshEpoch = -1
    runtime.refreshTokenSnapshot = null
    runtime.initPromise = null
    runtime.initEpoch = -1
  }

  function advanceSessionGeneration(): number {
    sessionGeneration.value += 1
    invalidatePendingRuntime()
    return sessionGeneration.value
  }

  function beginExplicitSessionTransition(): number {
    explicitSessionEpoch.value += 1
    return advanceSessionGeneration()
  }

  function resetSessionRefs() {
    accessToken.value = null
    refreshToken.value = null
    user.value = null
    studentProfile.value = null
    companyProfile.value = null
    consent.value = null
    isInitializing.value = false
  }

  /**
   * Parse JWT and update reactive user state
   */
  function parseJwtUser(token: string): AuthUser | null {
    const claims = decodeJwtPayload<JwtClaims>(token)
    if (!claims || !claims.sub) {
      user.value = null
      return null
    }

    const rawScopes = claims.scope || ''
    const scopesList = claims.scopes || (rawScopes ? rawScopes.split(' ') : [])

    const authUserData: AuthUser = {
      id: claims.sub,
      email: claims.email,
      role: claims.role,
      scopes: scopesList,
      is_active: claims.is_active ?? true,
    }

    user.value = authUserData
    return authUserData
  }

  /**
   * Log in user with email and password
   */
  async function login(credentials: { email: string; password: string }): Promise<TokenResponse> {
    const loginEpoch = beginExplicitSessionTransition()
    resetSessionRefs()

    const data = await $fetch<TokenResponse>(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: credentials,
    })

    if (sessionGeneration.value !== loginEpoch) {
      throw new Error('Authentication session superseded during login')
    }

    accessToken.value = data.access_token
    refreshToken.value = data.refresh_token
    parseJwtUser(data.access_token)

    // Load user consent & profile in the background with session epoch guard
    await Promise.allSettled([fetchConsent(), fetchProfile()])

    return data
  }

  /**
   * Rotate refresh token to obtain a fresh access token (single-flight & epoch-guarded per Nuxt context)
   */
  async function refreshTokens(): Promise<boolean> {
    const currentRefreshToken = refreshToken.value
    if (!currentRefreshToken) return false

    const startEpoch = sessionGeneration.value
    if (
      runtime.refreshPromise &&
      runtime.refreshEpoch === startEpoch &&
      runtime.refreshTokenSnapshot === currentRefreshToken
    ) {
      return await runtime.refreshPromise
    }

    let promise: Promise<boolean> | null = null
    promise = (async () => {
      try {
        const data = await $fetch<TokenResponse>(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          body: { refresh_token: currentRefreshToken },
        })

        // Ignore late response if logout or another login superseded this session
        if (sessionGeneration.value !== startEpoch) {
          return false
        }

        accessToken.value = data.access_token
        refreshToken.value = data.refresh_token
        parseJwtUser(data.access_token)
        return true
      } catch {
        // Never wipe a newer session if a superseded refresh fails late; preserve explicitSessionEpoch for 401 logout handling
        if (sessionGeneration.value === startEpoch) {
          advanceSessionGeneration()
          resetSessionRefs()
        }
        return false
      } finally {
        if (runtime.refreshPromise === promise) {
          runtime.refreshPromise = null
          runtime.refreshEpoch = -1
          runtime.refreshTokenSnapshot = null
        }
      }
    })()

    runtime.refreshPromise = promise
    runtime.refreshEpoch = startEpoch
    runtime.refreshTokenSnapshot = currentRefreshToken
    return await promise
  }

  /**
   * Register a new student following the multi-step contract:
   * 1. Register auth credential
   * 2. Log in to get RS256 token pair
   * 3. Record Law 1581 consent
   * 4. Create student domain profile
   */
  async function registerStudent(payload: StudentRegisterPayload): Promise<StudentProfile> {
    const registerEpoch = beginExplicitSessionTransition()
    resetSessionRefs()

    // Step 1: Register auth credentials
    await $fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      body: {
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        role: 'STUDENT',
      },
    })

    if (sessionGeneration.value !== registerEpoch) {
      throw new Error('Authentication session superseded during registration')
    }

    // Step 2: Login to acquire tokens
    const tokenData = await $fetch<TokenResponse>(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: {
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      },
    })

    if (sessionGeneration.value !== registerEpoch) {
      throw new Error('Authentication session superseded during registration')
    }

    accessToken.value = tokenData.access_token
    refreshToken.value = tokenData.refresh_token
    parseJwtUser(tokenData.access_token)

    // Step 3: Register Habeas Data Consent
    const consentData = await apiFetch<DataConsent>('/profiles/consent', {
      method: 'POST',
      body: {
        is_accepted: true,
        policy_version: 'v1.0-2026',
      },
    })
    if (sessionGeneration.value !== registerEpoch) {
      throw new Error('Authentication session superseded during consent registration')
    }
    consent.value = consentData

    // Step 4: Create Student Domain Profile
    const profile = await apiFetch<StudentProfile>('/profiles/students/me', {
      method: 'POST',
      body: {
        full_name: payload.full_name.trim(),
        student_code: payload.student_code.trim(),
        academic_program: payload.academic_program || 'Ingeniería de Sistemas',
        current_semester: Number(payload.current_semester),
        completed_courses: payload.completed_courses || [],
        technical_skills: payload.technical_skills || [],
        interest_areas: payload.interest_areas || [],
        bio: payload.bio || '',
        contact_email: payload.contact_email?.trim() || payload.email.trim().toLowerCase(),
        contact_phone: payload.contact_phone?.trim() || null,
      },
    })

    if (sessionGeneration.value !== registerEpoch) {
      throw new Error('Authentication session superseded during profile creation')
    }

    studentProfile.value = profile
    return profile
  }

  /**
   * Register a new company following the multi-step contract:
   * 1. Register auth credential
   * 2. Log in to get RS256 token pair
   * 3. Record Law 1581 consent
   * 4. Create company domain profile
   */
  async function registerCompany(payload: CompanyRegisterPayload): Promise<CompanyProfile> {
    const registerEpoch = beginExplicitSessionTransition()
    resetSessionRefs()

    // Step 1: Register auth credentials
    await $fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      body: {
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
        role: 'COMPANY',
      },
    })

    if (sessionGeneration.value !== registerEpoch) {
      throw new Error('Authentication session superseded during registration')
    }

    // Step 2: Login to acquire tokens
    const tokenData = await $fetch<TokenResponse>(`${baseUrl}/auth/login`, {
      method: 'POST',
      body: {
        email: payload.email.trim().toLowerCase(),
        password: payload.password,
      },
    })

    if (sessionGeneration.value !== registerEpoch) {
      throw new Error('Authentication session superseded during registration')
    }

    accessToken.value = tokenData.access_token
    refreshToken.value = tokenData.refresh_token
    parseJwtUser(tokenData.access_token)

    // Step 3: Register Habeas Data Consent
    const consentData = await apiFetch<DataConsent>('/profiles/consent', {
      method: 'POST',
      body: {
        is_accepted: true,
        policy_version: 'v1.0-2026',
      },
    })
    if (sessionGeneration.value !== registerEpoch) {
      throw new Error('Authentication session superseded during consent registration')
    }
    consent.value = consentData

    // Step 4: Create Company Domain Profile
    const profile = await apiFetch<CompanyProfile>('/profiles/companies/me', {
      method: 'POST',
      body: {
        nit: payload.nit.trim(),
        business_name: payload.business_name.trim(),
        economic_sector: payload.economic_sector.trim(),
        description: payload.description || '',
        website_url: payload.website_url || null,
        public_links: payload.public_links || [],
        contact_name: payload.contact_name.trim(),
        contact_email: payload.contact_email?.trim() || payload.email.trim().toLowerCase(),
        contact_phone: payload.contact_phone.trim(),
      },
    })

    if (sessionGeneration.value !== registerEpoch) {
      throw new Error('Authentication session superseded during profile creation')
    }

    companyProfile.value = profile
    return profile
  }

  /**
   * Fetch Habeas Data consent status for current user
   */
  async function fetchConsent(): Promise<DataConsent | null> {
    const startEpoch = sessionGeneration.value
    const startUserId = user.value?.id ?? null

    try {
      const data = await apiFetch<DataConsent>('/profiles/consent/me')
      if (sessionGeneration.value !== startEpoch || (user.value?.id ?? null) !== startUserId) {
        return null
      }
      consent.value = data
      return data
    } catch {
      if (sessionGeneration.value === startEpoch && (user.value?.id ?? null) === startUserId) {
        consent.value = null
      }
      return null
    }
  }

  /**
   * Fetch domain profile for current role
   */
  async function fetchProfile(): Promise<StudentProfile | CompanyProfile | null> {
    const startRole = userRole.value
    const startUserId = user.value?.id ?? null
    const startEpoch = sessionGeneration.value
    if (!startRole) return null

    try {
      if (startRole === 'STUDENT') {
        const student = await apiFetch<StudentProfile>('/profiles/students/me')
        if (sessionGeneration.value !== startEpoch || (user.value?.id ?? null) !== startUserId) {
          return null
        }
        studentProfile.value = student
        return student
      }
      if (startRole === 'COMPANY') {
        const company = await apiFetch<CompanyProfile>('/profiles/companies/me')
        if (sessionGeneration.value !== startEpoch || (user.value?.id ?? null) !== startUserId) {
          return null
        }
        companyProfile.value = company
        return company
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Initialize session on client reload if a refresh token cookie exists (single-flight & epoch-guarded per Nuxt context)
   */
  async function initSession(): Promise<boolean> {
    if (!refreshToken.value) {
      return false
    }

    if (accessToken.value && user.value) {
      return true
    }

    const startEpoch = sessionGeneration.value
    if (runtime.initPromise && runtime.initEpoch === startEpoch) {
      return await runtime.initPromise
    }

    isInitializing.value = true
    let promise: Promise<boolean> | null = null
    promise = (async () => {
      try {
        const success = await refreshTokens()
        if (success && sessionGeneration.value === startEpoch) {
          await Promise.allSettled([fetchConsent(), fetchProfile()])
        }
        return success && sessionGeneration.value === startEpoch
      } finally {
        if (sessionGeneration.value === startEpoch) {
          isInitializing.value = false
        }
        if (runtime.initPromise === promise) {
          runtime.initPromise = null
          runtime.initEpoch = -1
        }
      }
    })()

    runtime.initPromise = promise
    runtime.initEpoch = startEpoch
    return await promise
  }

  /**
   * Clear local session tokens and reactive variables
   */
  function clearSession() {
    beginExplicitSessionTransition()
    resetSessionRefs()
  }

  /**
   * Log out session, notify backend and navigate to login unless superseded by a new session
   */
  async function logout() {
    const currentRefresh = refreshToken.value
    const logoutEpoch = beginExplicitSessionTransition()
    resetSessionRefs()

    if (currentRefresh) {
      try {
        await $fetch(`${baseUrl}/auth/logout`, {
          method: 'POST',
          body: { refresh_token: currentRefresh },
        })
      } catch {
        // Silently discard logout network errors
      }
    }

    if (sessionGeneration.value === logoutEpoch) {
      await navigateTo('/auth/login')
    }
  }

  /**
   * Update mutable fields of student profile (PATCH /profiles/students/me)
   */
  async function updateStudentProfile(data: {
    current_semester?: number
    technical_skills?: string[]
    interest_areas?: string[]
    bio?: string
  }): Promise<StudentProfile> {
    const startEpoch = sessionGeneration.value
    const startUserId = user.value?.id ?? null
    const updated = await apiFetch<StudentProfile>('/profiles/students/me', {
      method: 'PATCH',
      body: data,
    })
    if (sessionGeneration.value === startEpoch && (user.value?.id ?? null) === startUserId) {
      studentProfile.value = updated
    }
    return updated
  }

  /**
   * Update mutable fields of company profile (PATCH /profiles/companies/me)
   */
  async function updateCompanyProfile(data: {
    economic_sector?: string
    description?: string
    website_url?: string | null
    public_links?: string[]
    contact_name?: string
    contact_email?: string
    contact_phone?: string
  }): Promise<CompanyProfile> {
    const startEpoch = sessionGeneration.value
    const startUserId = user.value?.id ?? null
    const updated = await apiFetch<CompanyProfile>('/profiles/companies/me', {
      method: 'PATCH',
      body: data,
    })
    if (sessionGeneration.value === startEpoch && (user.value?.id ?? null) === startUserId) {
      companyProfile.value = updated
    }
    return updated
  }

  /**
   * Complete student profile if registration was interrupted or registered prior to profile service
   */
  async function completeStudentProfile(data: {
    full_name: string
    student_code: string
    current_semester: number
    academic_program?: string
    contact_phone?: string
    bio?: string
  }): Promise<StudentProfile> {
    const startEpoch = sessionGeneration.value
    const startUserId = user.value?.id ?? null

    if (!consent.value?.is_accepted) {
      const consentData = await apiFetch<DataConsent>('/profiles/consent', {
        method: 'POST',
        body: {
          is_accepted: true,
          policy_version: 'v1.0-2026',
        },
      })
      if (sessionGeneration.value !== startEpoch || (user.value?.id ?? null) !== startUserId) {
        throw new Error('Authentication session superseded during consent registration')
      }
      consent.value = consentData
    }

    const profile = await apiFetch<StudentProfile>('/profiles/students/me', {
      method: 'POST',
      body: {
        full_name: data.full_name.trim(),
        student_code: data.student_code.trim(),
        academic_program: data.academic_program || 'Ingeniería de Sistemas',
        current_semester: Number(data.current_semester),
        completed_courses: [],
        technical_skills: [],
        interest_areas: [],
        bio: data.bio || '',
        contact_email: user.value?.email || '',
        contact_phone: data.contact_phone?.trim() || null,
      },
    })
    if (sessionGeneration.value !== startEpoch || (user.value?.id ?? null) !== startUserId) {
      throw new Error('Authentication session superseded during profile creation')
    }
    studentProfile.value = profile
    return profile
  }

  /**
   * Complete company profile if registration was interrupted
   */
  async function completeCompanyProfile(data: {
    business_name: string
    nit: string
    economic_sector: string
    contact_name: string
    contact_phone: string
  }): Promise<CompanyProfile> {
    const startEpoch = sessionGeneration.value
    const startUserId = user.value?.id ?? null

    if (!consent.value?.is_accepted) {
      const consentData = await apiFetch<DataConsent>('/profiles/consent', {
        method: 'POST',
        body: {
          is_accepted: true,
          policy_version: 'v1.0-2026',
        },
      })
      if (sessionGeneration.value !== startEpoch || (user.value?.id ?? null) !== startUserId) {
        throw new Error('Authentication session superseded during consent registration')
      }
      consent.value = consentData
    }

    const profile = await apiFetch<CompanyProfile>('/profiles/companies/me', {
      method: 'POST',
      body: {
        nit: data.nit.trim(),
        business_name: data.business_name.trim(),
        economic_sector: data.economic_sector.trim(),
        contact_name: data.contact_name.trim(),
        contact_email: user.value?.email || '',
        contact_phone: data.contact_phone.trim(),
      },
    })
    if (sessionGeneration.value !== startEpoch || (user.value?.id ?? null) !== startUserId) {
      throw new Error('Authentication session superseded during profile creation')
    }
    companyProfile.value = profile
    return profile
  }

  return {
    accessToken,
    refreshToken,
    user,
    studentProfile,
    companyProfile,
    consent,
    isAuthenticated,
    userRole,
    activeProfile,
    isInitializing,
    sessionGeneration,
    login,
    registerStudent,
    registerCompany,
    completeStudentProfile,
    completeCompanyProfile,
    updateStudentProfile,
    updateCompanyProfile,
    refreshTokens,
    fetchConsent,
    fetchProfile,
    initSession,
    logout,
    clearSession,
  }
}
