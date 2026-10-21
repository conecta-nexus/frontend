/**
 * Safe JWT payload decoder for both client and server environments.
 */
export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')

    if (typeof atob === 'function') {
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      )
      return JSON.parse(jsonPayload) as T
    }

    if (typeof Buffer !== 'undefined') {
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8')
      return JSON.parse(jsonPayload) as T
    }

    return null
  } catch {
    return null
  }
}
