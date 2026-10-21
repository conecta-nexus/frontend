import type { NitroFetchOptions, NitroFetchRequest } from 'nitropack'

export function useApi() {
  const config = useRuntimeConfig()
  const baseUrl = ((config.public.apiBase as string) || '/api/v1').replace(/\/$/, '')
  const accessToken = useState<string | null>('auth_access_token', () => null)

  async function apiFetch<T>(
    endpoint: string,
    options: NitroFetchOptions<NitroFetchRequest> = {},
  ): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${cleanEndpoint}`

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
        const { refreshTokens, logout } = useAuth()
        const refreshed = await refreshTokens()
        if (refreshed && accessToken.value) {
          headers.set('Authorization', `Bearer ${accessToken.value}`)
          return await $fetch<T>(url, {
            ...options,
            headers,
          })
        } else {
          logout()
        }
      }
      throw err
    }
  }

  return {
    apiFetch,
    baseUrl,
  }
}
