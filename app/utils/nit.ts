/**
 * Colombian DIAN NIT verification digit calculator and validator.
 * Conforms to DIAN Modulo 11 specifications used in backend apps/companies/validators.py.
 */

const NIT_WEIGHTS = [41, 37, 29, 23, 19, 17, 13, 7, 3]

export function calculateNitCheckDigit(nitNumber: string): number {
  const cleanDigits = nitNumber.replace(/\D/g, '')
  if (cleanDigits.length !== 9) {
    throw new Error('El NIT debe contener exactamente 9 dígitos antes del dígito de verificación.')
  }

  const weightedSum = cleanDigits
    .split('')
    .reduce((acc, digit, idx) => acc + Number.parseInt(digit, 10) * NIT_WEIGHTS[idx], 0)

  const remainder = weightedSum % 11
  return remainder in [0, 1] || remainder === 0 || remainder === 1 ? remainder : 11 - remainder
}

export function isValidNit(nit: string): boolean {
  const regex = /^(\d{9})-(\d)$/
  const match = nit.trim().match(regex)
  if (!match) return false

  const number = match[1]
  const checkDigit = Number.parseInt(match[2], 10)
  return calculateNitCheckDigit(number) === checkDigit
}

export function normalizeNit(raw: string): string {
  // Strip dots, spaces, etc.
  const cleaned = raw.replace(/[.\s]/g, '').trim()
  if (cleaned.includes('-')) {
    const [num, cd] = cleaned.split('-')
    const padded = num.padStart(9, '0').slice(-9)
    return `${padded}-${cd}`
  }
  const digitsOnly = cleaned.replace(/\D/g, '')
  if (digitsOnly.length === 9) {
    const cd = calculateNitCheckDigit(digitsOnly)
    return `${digitsOnly}-${cd}`
  }
  return cleaned
}
