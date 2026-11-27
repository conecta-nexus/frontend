type WriteOperation = 'create' | 'publish'

const validationLabels: Record<string, string> = {
  title: 'título',
  business_process: 'proceso de negocio',
  description: 'descripción',
  economic_sector: 'sector económico',
  modality: 'modalidad',
  difficulty_level: 'dificultad',
  min_semester: 'semestre mínimo',
  required_skills: 'habilidades',
  knowledge_areas: 'áreas de conocimiento',
}

function responseStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return
  const failure = error as { status?: number; statusCode?: number; response?: { status?: number } }
  return failure.response?.status ?? failure.statusCode ?? failure.status
}

export function isDefinitiveCreateRejection(error: unknown): boolean {
  // These responses reject the request before a Challenge row can be created.
  return [400, 401, 403, 404, 405, 413, 415, 422, 429].includes(responseStatus(error) ?? 0)
}

function validationFields(error: unknown): string[] {
  const detail = (error as { data?: { detail?: unknown } } | null)?.data?.detail
  if (!Array.isArray(detail)) return []

  const labels = new Set<string>()
  for (const item of detail) {
    const location: unknown = item?.loc
    if (!Array.isArray(location) || location[0] !== 'body') continue
    const field: unknown = location[1]
    if (typeof field === 'string' && Object.hasOwn(validationLabels, field)) {
      labels.add(validationLabels[field]!)
    }
  }
  return [...labels]
}

export function challengeWriteMessage(error: unknown, operation: WriteOperation): string {
  const status = responseStatus(error)
  if (status === 401) return 'Tu sesión venció. Inicia sesión para continuar.'
  if (status === 403) return 'Tu cuenta no tiene permiso para realizar esta operación.'
  if (status === 400 || status === 422) {
    const fields = validationFields(error)
    return fields.length
      ? `Revisa estos campos e inténtalo de nuevo: ${fields.join(', ')}.`
      : operation === 'publish'
        ? 'No se pudo publicar el reto en su estado actual. Revisa su estado en la gestión de retos.'
        : 'Algunos datos del reto no son válidos. Revisa el formulario e inténtalo de nuevo.'
  }
  if (status === 429) return 'Hay muchas solicitudes en este momento. Espera un poco y vuelve a intentarlo.'
  if (!status) {
    return operation === 'publish'
      ? 'Se perdió la conexión al publicar. Verifica el estado del borrador antes de continuar.'
      : 'Se perdió la conexión al guardar. Revisa tus retos para comprobar si el borrador quedó guardado.'
  }
  if (status >= 500) {
    return operation === 'publish'
      ? 'El servicio tuvo un problema al publicar. Verifica el estado del borrador antes de continuar.'
      : 'El servicio tuvo un problema al guardar. Revisa tus retos para confirmar si se creó el borrador.'
  }
  return operation === 'publish'
    ? 'No se pudo confirmar la publicación. Revisa el estado del reto antes de volver a intentarlo.'
    : 'No se pudo guardar el reto. Revisa la información e inténtalo de nuevo.'
}
