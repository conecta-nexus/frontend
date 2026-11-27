import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack'
import type { AuthUser } from '~/types/auth'

export function useApi() {
  const config = useRuntimeConfig()
  const baseUrl = ((config.public.apiBase as string) || '/api/v1').replace(/\/$/, '')
  const accessToken = useState<string | null>('auth_access_token', () => null)
  const user = useState<AuthUser | null>('auth_user', () => null)
  const sessionGeneration = useState<number>('auth_session_generation', () => 0)
  const explicitSessionEpoch = useState<number>('auth_explicit_session_epoch', () => 0)

  async function apiFetch<T>(
    endpoint: string,
    options: NitroFetchOptions<NitroFetchRequest> = {},
  ): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${cleanEndpoint}`

    const requestGeneration = sessionGeneration.value
    const requestExplicitEpoch = explicitSessionEpoch.value
    const requestUserId = user.value?.id ?? null

    const headers = new Headers((options.headers as HeadersInit) || {})
    if (accessToken.value) {
      headers.set('Authorization', `Bearer ${accessToken.value}`)
    }

    try {
      return await $fetch<T>(url, {
        ...options,
        headers,
      })
    } catch (err: unknown) {
      const fetchError = err as { status?: number }
      // Attempt silent refresh on 401 Unauthorized for protected endpoints
      if (
        fetchError?.status === 401 &&
        !cleanEndpoint.includes('/auth/login') &&
        !cleanEndpoint.includes('/auth/refresh') &&
        !cleanEndpoint.includes('/auth/register')
      ) {
        // Never refresh or retry if session logged out or changed identity mid-flight
        if (
          explicitSessionEpoch.value !== requestExplicitEpoch ||
          sessionGeneration.value !== requestGeneration ||
          (user.value?.id ?? null) !== requestUserId
        ) {
          throw err
        }

        const { refreshTokens, logout } = useAuth()
        const refreshed = await refreshTokens()

        // Abort both retry and logout if user explicitly logged out, registered, or switched account mid-401
        if (explicitSessionEpoch.value !== requestExplicitEpoch) {
          throw err
        }

        if (refreshed) {
          if (
            sessionGeneration.value !== requestGeneration ||
            (user.value?.id ?? null) !== requestUserId ||
            !accessToken.value
          ) {
            throw err
          }

          headers.set('Authorization', `Bearer ${accessToken.value}`)
          return await $fetch<T>(url, {
            ...options,
            headers,
          })
        }

        void logout()
      }
      throw err
    }
  }

  return {
    apiFetch,
    baseUrl,
  }
}
