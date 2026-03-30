/**
 * Utilidades puras de formateo para el módulo de WhatsApp.
 * Funciones sin efectos secundarios — fácilmente testeables de forma unitaria.
 */

/**
 * Normaliza un número de teléfono argentino a formato internacional E.164 sin el +.
 *
 * Casos soportados:
 *  "11 4567-8901"    → "5491145678901"  ✅ CABA sin código país
 *  "0114567890"      → "5491145678901"  ✅ con 0 de larga distancia
 *  "+5491145678901"  → "5491145678901"  ✅ ya completo con +
 *  "5491145678901"   → "5491145678901"  ✅ ya completo sin +
 *  "549XXXXXXXXXX"   → "549XXXXXXXXXX"  ✅ ya tiene 549, no duplicar
 *  "1545678901"      → ⚠️ lanza Error descriptivo (15 sin área)
 *
 * @throws {Error} Si el número tiene formato local con "15" sin código de área.
 */
export function formatPhone(raw: string): string {
  // 1. Eliminar todo lo que no sea dígito (espacios, guiones, paréntesis, +)
  const digits = raw.replace(/\D/g, '')

  // 2. Ya completo con 549 (ej: "5491145678901") — devolver tal cual
  if (digits.startsWith('549') && digits.length >= 12) {
    return digits
  }

  // 3. Ya tiene código de país 54 pero sin 9 (ej: "541145678901") — devolver tal cual
  if (digits.startsWith('54') && digits.length >= 11) {
    return digits
  }

  // 4. Quitar el 0 inicial de larga distancia (ej: "0114567890" → "114567890")
  const withoutLeadingZero = digits.startsWith('0') ? digits.slice(1) : digits

  // 5. Número local con 15 sin código de área — no se puede resolver, error descriptivo
  if (withoutLeadingZero.startsWith('15')) {
    throw new Error(
      `[formatPhone] Número "${raw}" tiene formato local con 15 sin código de área. ` +
      'Se requiere el número completo (ej: "1145678901").'
    )
  }

  // 6. Si es un celular de Argentina (10 dígitos sin el 0 inicial), agregamos 549.
  // Ejemplo: "1145678901" -> "5491145678901"
  if (withoutLeadingZero.length === 10) {
    return `549${withoutLeadingZero}`
  }

  // 7. Fallback: agregar solo el 54
  return `54${withoutLeadingZero}`
}

/**
 * Separa un string ISO 8601 en fecha y hora formateadas para el template de YCloud.
 *
 * @param isoString - Fecha/hora en formato ISO 8601 (ej: "2025-01-15T14:30:00")
 * @returns Objeto con `date` ("15/01/2025") y `time` ("14:30") en zona horaria Argentina
 * @throws {Error} Si el string no es una fecha válida
 */
export function formatDateTime(isoString: string): { date: string; time: string } {
  const dt = new Date(isoString)

  if (isNaN(dt.getTime())) {
    throw new Error(
      `[formatDateTime] Fecha inválida: "${isoString}". ` +
      'Se esperaba un string ISO 8601 válido (ej: "2025-01-15T14:30:00").'
    )
  }

  const zone = 'America/Argentina/Buenos_Aires'

  const date = dt.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: zone,
  })

  const time = dt.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: zone,
  })

  return { date, time }
}
