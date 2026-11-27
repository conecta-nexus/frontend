import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useApi } from '~/composables/useApi'
import { useAuth } from '~/composables/useAuth'

function encodeBase64Url(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload)
  return Buffer.from(json, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function makeJwt(claims: { sub: string, email: string, role: 'STUDENT' | 'COMPANY' }): string {
  const header = encodeBase64Url({ alg: 'RS256', typ: 'JWT' })
  const body = encodeBase64Url({
    ...claims,
    scope: 'profile:read consent:read',
    is_active: true,
    exp: Math.floor(Date.now() / 1000) + 900,
  })
  return `${header}.${body}.signature`
}

interface TestContext {
  nuxtApp: Record<string, unknown>
  states: Map<string, ReturnType<typeof ref>>
  cookies: Map<string, ReturnType<typeof ref>>
}

function createContext(): TestContext {
  return {
    nuxtApp: {},
    states: new Map(),
    cookies: new Map(),
  }
}

describe('useAuth and useApi real session isolation (A-01)', () => {
  const fetchMock = vi.fn()
  const navigateToMock = vi.fn()
  let activeContext = createContext()

  beforeEach(() => {
    activeContext = createContext()
    fetchMock.mockReset()
    navigateToMock.mockReset().mockResolvedValue(undefined)

    vi.stubGlobal('$fetch', fetchMock)
    vi.stubGlobal('navigateTo', navigateToMock)
    vi.stubGlobal('useApi', useApi)
    vi.stubGlobal('useAuth', useAuth)
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: 'http://localhost:8080/api/v1' } }))
    vi.stubGlobal('useNuxtApp', () => activeContext.nuxtApp)
    vi.stubGlobal('useState', <T>(key: string, init: () => T) => {
      if (!activeContext.states.has(key)) {
        activeContext.states.set(key, ref(init()))
      }
      return activeContext.states.get(key)!
    })
    vi.stubGlobal('useCookie', <T>(key: string) => {
      if (!activeContext.cookies.has(key)) {
        activeContext.cookies.set(key, ref<T | null>(null))
      }
      return activeContext.cookies.get(key)!
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('deduplicates concurrent refreshTokens calls within the same context and never stores Promises in useState', async () => {
    const tokenA = makeJwt({ sub: 'user-a', email: 'a@ufps.edu.co', role: 'STUDENT' })
    let resolveRefresh: ((val: unknown) => void) | undefined
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { resolveRefresh = resolve }))

    const auth = useAuth()
    auth.refreshToken.value = 'refresh-token-1'

    const p1 = auth.refreshTokens()
    const p2 = auth.refreshTokens()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/api/v1/auth/refresh', {
      method: 'POST',
      body: { refresh_token: 'refresh-token-1' },
    })

    // Ensure no Promises leaked into serializable useState hydration map
    for (const [, stateRef] of activeContext.states) {
      expect(typeof (stateRef.value as { then?: unknown } | null)?.then).not.toBe('function')
    }

    resolveRefresh?.({
      access_token: tokenA,
      refresh_token: 'refresh-token-2',
      token_type: 'bearer',
      expires_in: 900,
    })

    const [r1, r2] = await Promise.all([p1, p2])
    expect(r1).toBe(true)
    expect(r2).toBe(true)
    expect(auth.accessToken.value).toBe(tokenA)
    expect(auth.refreshToken.value).toBe('refresh-token-2')
    expect(auth.user.value?.id).toBe('user-a')
  })

  it('isolates refreshTokens and state completely across independent SSR contexts', async () => {
    const ctxA = createContext()
    const ctxB = createContext()
    const tokenA = makeJwt({ sub: 'ssr-a', email: 'a@ufps.edu.co', role: 'STUDENT' })
    const tokenB = makeJwt({ sub: 'ssr-b', email: 'b@empresa.co', role: 'COMPANY' })

    let resolveA: ((val: unknown) => void) | undefined
    let resolveB: ((val: unknown) => void) | undefined
    fetchMock
      .mockImplementationOnce(() => new Promise((resolve) => { resolveA = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveB = resolve }))

    activeContext = ctxA
    const authA = useAuth()
    authA.refreshToken.value = 'refresh-ssr-a'
    const promiseA = authA.refreshTokens()

    activeContext = ctxB
    const authB = useAuth()
    authB.refreshToken.value = 'refresh-ssr-b'
    const promiseB = authB.refreshTokens()

    expect(fetchMock).toHaveBeenCalledTimes(2)

    resolveA?.({ access_token: tokenA, refresh_token: 'rot-a', token_type: 'bearer', expires_in: 900 })
    resolveB?.({ access_token: tokenB, refresh_token: 'rot-b', token_type: 'bearer', expires_in: 900 })

    await Promise.all([promiseA, promiseB])

    expect(authA.accessToken.value).toBe(tokenA)
    expect(authA.user.value?.id).toBe('ssr-a')
    expect(authB.accessToken.value).toBe(tokenB)
    expect(authB.user.value?.id).toBe('ssr-b')
  })

  it('prevents a delayed refreshTokens success from restoring session after logout', async () => {
    const tokenA = makeJwt({ sub: 'user-a', email: 'a@ufps.edu.co', role: 'STUDENT' })
    let resolveRefresh: ((val: unknown) => void) | undefined
    fetchMock
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRefresh = resolve }))
      .mockResolvedValueOnce({ message: 'Logged out' })

    const auth = useAuth()
    auth.refreshToken.value = 'refresh-before-logout'

    const refreshPromise = auth.refreshTokens()
    await auth.logout()

    resolveRefresh?.({
      access_token: tokenA,
      refresh_token: 'should-not-restore',
      token_type: 'bearer',
      expires_in: 900,
    })

    const result = await refreshPromise
    expect(result).toBe(false)
    expect(auth.accessToken.value).toBeNull()
    expect(auth.refreshToken.value).toBeNull()
    expect(auth.user.value).toBeNull()
  })

  it('prevents late refresh success or error from Account A overwriting or clearing Account B after new login', async () => {
    const tokenB = makeJwt({ sub: 'user-b', email: 'b@empresa.co', role: 'COMPANY' })
    let rejectRefreshA: ((err: unknown) => void) | undefined

    fetchMock
      .mockImplementationOnce(() => new Promise((_res, rej) => { rejectRefreshA = rej }))
      .mockResolvedValueOnce({ access_token: tokenB, refresh_token: 'refresh-b', token_type: 'bearer', expires_in: 900 })
      .mockResolvedValueOnce({ id: 'consent-b', is_accepted: true, policy_version: 'v1.0-2026' })
      .mockResolvedValueOnce({ id: 'comp-b', business_name: 'Empresa B' })

    const auth = useAuth()
    auth.refreshToken.value = 'refresh-a'
    const refreshA = auth.refreshTokens()

    // Account B logs in while Account A refresh is still in-flight
    await auth.login({ email: 'b@empresa.co', password: 'Secret123!' })

    // Account A's refresh now fails late -> MUST NOT clear Account B's session!
    rejectRefreshA?.(new Error('401 Invalid refresh token'))
    const okA = await refreshA

    expect(okA).toBe(false)
    expect(auth.accessToken.value).toBe(tokenB)
    expect(auth.refreshToken.value).toBe('refresh-b')
    expect(auth.user.value?.id).toBe('user-b')
    expect(auth.companyProfile.value?.business_name).toBe('Empresa B')
  })

  it('deduplicates initSession and guards delayed fetchProfile/fetchConsent across identity switch', async () => {
    const tokenA = makeJwt({ sub: 'user-a', email: 'a@ufps.edu.co', role: 'STUDENT' })
    const tokenB = makeJwt({ sub: 'user-b', email: 'b@ufps.edu.co', role: 'STUDENT' })

    let resolveProfileA: ((val: unknown) => void) | undefined
    let resolveConsentA: ((val: unknown) => void) | undefined

    fetchMock.mockImplementation((url: string, opts?: { headers?: Headers }) => {
      const authHeader = opts?.headers?.get('Authorization') || ''
      if (url.endsWith('/auth/refresh')) {
        return Promise.resolve({ access_token: tokenA, refresh_token: 'rot-a', token_type: 'bearer', expires_in: 900 })
      }
      if (url.endsWith('/auth/login')) {
        return Promise.resolve({ access_token: tokenB, refresh_token: 'rot-b', token_type: 'bearer', expires_in: 900 })
      }
      if (url.includes('/profiles/consent/me')) {
        if (authHeader.includes(tokenA)) {
          return new Promise((resolve) => { resolveConsentA = resolve })
        }
        return Promise.resolve({ id: 'consent-b', is_accepted: true })
      }
      if (url.includes('/profiles/students/me')) {
        if (authHeader.includes(tokenA)) {
          return new Promise((resolve) => { resolveProfileA = resolve })
        }
        return Promise.resolve({ id: 'stud-b', full_name: 'Estudiante B', current_semester: 9 })
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    const auth = useAuth()
    auth.refreshToken.value = 'seed-a'

    const init1 = auth.initSession()
    const init2 = auth.initSession()

    // Give initSession a microtask to start refresh + consent/profile
    await Promise.resolve()
    await Promise.resolve()

    // Switch identity via login for User B before User A's profile/consent finish
    await auth.login({ email: 'b@ufps.edu.co', password: 'Secret123!' })

    // User A's delayed profile & consent resolve -> MUST NOT overwrite User B!
    resolveConsentA?.({ id: 'consent-a', is_accepted: false })
    resolveProfileA?.({ id: 'stud-a', full_name: 'Estudiante A', current_semester: 6 })

    await Promise.all([init1, init2])

    expect(auth.user.value?.id).toBe('user-b')
    expect(auth.studentProfile.value?.full_name).toBe('Estudiante B')
    expect(auth.consent.value?.is_accepted).toBe(true)
    expect(auth.isInitializing.value).toBe(false)
  })

  it('retries 401 cleanly for same user after refresh, but aborts retry if identity changes mid-401', async () => {
    const tokenA1 = makeJwt({ sub: 'user-a', email: 'a@ufps.edu.co', role: 'STUDENT' })
    const tokenA2 = makeJwt({ sub: 'user-a', email: 'a@ufps.edu.co', role: 'STUDENT' })
    const tokenB = makeJwt({ sub: 'user-b', email: 'b@ufps.edu.co', role: 'STUDENT' })

    const auth = useAuth()
    const { apiFetch } = useApi()

    // Case 1: Same user 401 -> refreshes once and retries with new token
    auth.accessToken.value = tokenA1
    auth.refreshToken.value = 'ref-a1'
    auth.user.value = { id: 'user-a', email: 'a@ufps.edu.co', role: 'STUDENT', scopes: [] }

    fetchMock
      .mockRejectedValueOnce({ status: 401 })
      .mockResolvedValueOnce({ access_token: tokenA2, refresh_token: 'ref-a2', token_type: 'bearer', expires_in: 900 })
      .mockResolvedValueOnce({ ok: true })

    const res = await apiFetch<{ ok: boolean }>('/notifications/me')
    expect(res.ok).toBe(true)
    expect(auth.accessToken.value).toBe(tokenA2)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    // Case 2: Identity switches during 401 -> MUST NOT retry with User B's token!
    fetchMock.mockReset()
    let rejectFirstCall: ((err: unknown) => void) | undefined
    fetchMock
      .mockImplementationOnce(() => new Promise((_res, rej) => { rejectFirstCall = rej }))
      .mockResolvedValueOnce({ access_token: tokenB, refresh_token: 'ref-b', token_type: 'bearer', expires_in: 900 })
      .mockResolvedValueOnce({ id: 'c-b', is_accepted: true })
      .mockResolvedValueOnce({ id: 's-b', full_name: 'B' })

    const inFlightCall = apiFetch('/notifications/me')
    await auth.login({ email: 'b@ufps.edu.co', password: 'Secret123!' })

    rejectFirstCall?.({ status: 401 })
    await expect(inFlightCall).rejects.toEqual({ status: 401 })
    expect(auth.accessToken.value).toBe(tokenB)
    expect(auth.user.value?.id).toBe('user-b')
  })

  it('shares runtime across multiple useAuth calls in the same app context and never stores Promises in useState (H-01)', async () => {
    const refreshedToken = makeJwt({ sub: 'shared-u1', email: 'shared@ufps.edu.co', role: 'STUDENT' })
    let resolveRefresh: ((value: unknown) => void) | undefined

    fetchMock.mockImplementationOnce(() => new Promise((resolve) => {
      resolveRefresh = resolve
    }))

    const auth1 = useAuth()
    const auth2 = useAuth()
    auth1.refreshToken.value = 'seed-shared-refresh'

    const p1 = auth1.refreshTokens()
    const p2 = auth2.refreshTokens()

    // Concurrent calls across two composable invocations in the same Nuxt app must deduplicate to 1 network request
    expect(fetchMock).toHaveBeenCalledTimes(1)
    for (const stateRef of activeContext.states.values()) {
      expect(stateRef.value).not.toBeInstanceOf(Promise)
    }

    resolveRefresh?.({
      access_token: refreshedToken,
      refresh_token: 'rotated-shared-refresh',
      token_type: 'bearer',
      expires_in: 900,
    })

    const [ok1, ok2] = await Promise.all([p1, p2])
    expect(ok1).toBe(true)
    expect(ok2).toBe(true)
    expect(auth2.user.value?.id).toBe('shared-u1')
    expect(auth2.accessToken.value).toBe(refreshedToken)
  })

  it('clears prior refreshToken during login/register, blocks delayed logout navigation over new login, and logs out on definitive 401 refresh failure (H-03)', async () => {
    const tokenB = makeJwt({ sub: 'user-b', email: 'b@ufps.edu.co', role: 'STUDENT' })
    const auth = useAuth()
    const { apiFetch } = useApi()

    // Case A: Prior refreshToken MUST be wiped immediately while new login is pending so initSession/refreshTokens cannot resurrect A
    auth.refreshToken.value = 'stale-refresh-account-a'
    let resolveLoginB: ((value: unknown) => void) | undefined
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/auth/login')) {
        return new Promise((resolve) => { resolveLoginB = resolve })
      }
      if (url.includes('/profiles/')) {
        return Promise.resolve(null)
      }
      return Promise.reject(new Error(`Unexpected URL during login transition: ${url}`))
    })

    const loginPromiseB = auth.login({ email: 'b@ufps.edu.co', password: 'PasswordB1!' })
    expect(auth.refreshToken.value).toBeNull()
    expect(await auth.initSession()).toBe(false)
    expect(await auth.refreshTokens()).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveLoginB?.({
      access_token: tokenB,
      refresh_token: 'refresh-account-b',
      token_type: 'bearer',
      expires_in: 900,
    })
    await loginPromiseB
    expect(auth.user.value?.id).toBe('user-b')

    // Case B: Late logout completion from previous session MUST NOT redirect an active newer session to /auth/login
    fetchMock.mockReset()
    navigateToMock.mockClear()
    let resolveLogoutNetwork: (() => void) | undefined
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/auth/logout')) {
        return new Promise<void>((resolve) => { resolveLogoutNetwork = resolve })
      }
      if (url.endsWith('/auth/login')) {
        return Promise.resolve({
          access_token: tokenB,
          refresh_token: 'refresh-account-b2',
          token_type: 'bearer',
          expires_in: 900,
        })
      }
      if (url.includes('/profiles/')) {
        return Promise.resolve(null)
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`))
    })

    const logoutPromise = auth.logout()
    await auth.login({ email: 'b@ufps.edu.co', password: 'PasswordB1!' })
    resolveLogoutNetwork?.()
    await logoutPromise
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(auth.user.value?.id).toBe('user-b')
    expect(auth.refreshToken.value).toBe('refresh-account-b2')

    // Case C: Definitive refresh failure on a protected route 401 MUST clear expired tokens and invoke logout -> /auth/login
    fetchMock.mockReset()
    navigateToMock.mockClear()
    fetchMock
      .mockRejectedValueOnce({ status: 401 })
      .mockRejectedValueOnce({ status: 401 })
      .mockResolvedValueOnce({})

    await expect(apiFetch('/challenges')).rejects.toEqual({ status: 401 })
    await Promise.resolve()
    await Promise.resolve()
    expect(auth.accessToken.value).toBeNull()
    expect(auth.refreshToken.value).toBeNull()
    expect(navigateToMock).toHaveBeenCalledWith('/auth/login')
  })
})
