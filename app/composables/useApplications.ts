import { ref } from 'vue'
import { extractApiErrorMessage } from '~/utils/errors'

export interface ApplicationCreatePayload {
  challenge_id: string
  motivation_letter: string
}

export interface StudentApplicationResponse {
  id: string
  student_id: string
  challenge_id: string
  motivation_letter: string
  status: 'PENDING' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | string
  created_at: string
  updated_at: string
}

export const MOTIVATION_MIN_LENGTH = 50
export const MOTIVATION_MAX_LENGTH = 2000

export function getApplicationErrorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined
  const apiError = err as {
    status?: number
    statusCode?: number
    response?: { status?: number }
  }
  return apiError.status ?? apiError.statusCode ?? apiError.response?.status
}

export function formatApplicationError(err: unknown): string {
  const status = getApplicationErrorStatus(err)
  if (status === 409) {
    return 'Ya enviaste una postulación para este reto.'
  }
  if (status === 401) {
    return 'Tu sesión ha expirado. Inicia sesión nuevamente para postularte.'
  }
  if (status === 403) {
    return 'Solo los estudiantes habilitados pueden postularse a los retos.'
  }
  if (status === 404) {
    return 'Este reto ya no se encuentra disponible.'
  }
  if (status === 422) {
    return 'El reto no se encuentra abierto para recibir nuevas postulaciones.'
  }
  if (status === 502 || status === 503) {
    return 'El servicio de postulaciones no está disponible temporalmente. Intenta de nuevo.'
  }

  return extractApiErrorMessage(
    err,
    'No fue posible enviar tu postulación. Verifica tus datos e intenta nuevamente.',
  )
}

export function useApplications() {
  const { apiFetch } = useApi()
  const submitting = ref(false)
  const error = ref<string | null>(null)
  let latestSubmitSeq = 0

  function resetState() {
    latestSubmitSeq += 1
    submitting.value = false
    error.value = null
  }

  async function submitApplication(
    payload: ApplicationCreatePayload,
  ): Promise<StudentApplicationResponse> {
    if (submitting.value) {
      throw new Error('Ya hay un envío de postulación en curso.')
    }

    const capturedSeq = ++latestSubmitSeq
    submitting.value = true
    error.value = null

    try {
      return await apiFetch<StudentApplicationResponse>('/applications/', {
        method: 'POST',
        body: {
          challenge_id: payload.challenge_id,
          motivation_letter: payload.motivation_letter.trim(),
        },
      })
    } catch (err: unknown) {
      if (capturedSeq === latestSubmitSeq) {
        error.value = formatApplicationError(err)
      }
      throw err
    } finally {
      if (capturedSeq === latestSubmitSeq) {
        submitting.value = false
      }
    }
  }

  return {
    submitting,
    error,
    submitApplication,
    resetState,
  }
}
