/**
 * Normalizes error responses from API Gateway, FastAPI (auth) and Django DRF (profile)
 * into human-readable Spanish error messages.
 */
export function extractApiErrorMessage(err: unknown, defaultMessage = 'Ha ocurrido un error inesperado'): string {
  if (!err || typeof err !== 'object') {
    return defaultMessage
  }

  const anyErr = err as {
    data?: unknown
    response?: {
      _data?: unknown
      status?: number
    }
    status?: number
    statusCode?: number
    statusMessage?: string
    message?: string
  }

  const payload = (anyErr.data || anyErr.response?._data) as {
    detail?: string | Array<{ msg?: string; loc?: string[] }>
    error?: {
      message?: string
      details?: Record<string, string[] | string>
    }
    message?: string
  } | string | undefined

  // If payload is a string (e.g. raw JSON or plain text)
  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload)
      if (parsed.detail) return translateMessage(parsed.detail)
      if (parsed.error?.message) return translateMessage(parsed.error.message)
    } catch {
      return translateMessage(payload)
    }
  }

  // 1. Django DRF error format from profile microservice
  if (payload?.error) {
    const errorObj = payload.error
    if (errorObj.details && typeof errorObj.details === 'object') {
      const detailsEntries = Object.entries(errorObj.details)
      if (detailsEntries.length > 0) {
        const [field, messages] = detailsEntries[0]
        const firstMsg = Array.isArray(messages) ? messages[0] : messages
        return `${field}: ${translateMessage(String(firstMsg))}`
      }
    }
    if (errorObj.message) {
      return translateMessage(errorObj.message)
    }
  }

  // 2. FastAPI or Gateway detail format
  if (payload?.detail) {
    if (typeof payload.detail === 'string') {
      return translateMessage(payload.detail)
    }
    if (Array.isArray(payload.detail) && payload.detail.length > 0) {
      const first = payload.detail[0]
      if (first.msg) {
        const field = first.loc ? first.loc.slice(1).join('.') : ''
        return field ? `${field}: ${translateMessage(first.msg)}` : translateMessage(first.msg)
      }
    }
  }

  // 3. General message
  if (payload?.message && typeof payload.message === 'string') {
    return translateMessage(payload.message)
  }

  // 4. HTTP Status code fallbacks
  const status = anyErr.status || anyErr.statusCode || anyErr.response?.status
  if (status === 409) {
    return 'Este correo electrónico o código ya se encuentra registrado en el sistema.'
  }
  if (status === 401) {
    return 'Credenciales inválidas. Verifica tu correo y contraseña.'
  }
  if (status === 403) {
    return 'Acceso denegado o tu cuenta se encuentra suspendida.'
  }
  if (status === 502 || status === 504) {
    return 'El Gateway no pudo comunicarse con el microservicio correspondiente.'
  }

  if (anyErr.message && typeof anyErr.message === 'string') {
    return translateMessage(anyErr.message)
  }

  return defaultMessage
}

function translateMessage(msg: string): string {
  const clean = msg.trim()
  if (/email is already registered/i.test(clean)) {
    return 'Este correo electrónico ya se encuentra registrado en el sistema.'
  }
  if (/invalid email or password/i.test(clean)) {
    return 'Credenciales inválidas. Por favor verifica tu correo y contraseña.'
  }
  if (/account is inactive or suspended/i.test(clean)) {
    return 'Tu cuenta se encuentra inactiva o suspendida.'
  }
  if (/invalid or expired refresh token/i.test(clean)) {
    return 'La sesión ha expirado o el token de refresco es inválido.'
  }
  if (/current semester must be between 6 and 10/i.test(clean)) {
    return 'El semestre académico debe estar entre 6° y 10° semestre.'
  }
  if (/a student profile already exists for this user/i.test(clean)) {
    return 'Ya existe un perfil de estudiante para este usuario.'
  }
  if (/a company profile already exists for this user/i.test(clean)) {
    return 'Ya existe un perfil empresarial para este usuario.'
  }
  if (/invalid colombian nit verification digit/i.test(clean)) {
    return 'El dígito de verificación del NIT es inválido según el algoritmo DIAN.'
  }
  return clean
}
