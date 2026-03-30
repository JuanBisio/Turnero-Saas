/**
 * Configuración del cliente de YCloud.
 * Las variables de entorno se validan al cargar el módulo.
 * Si faltan, el proceso falla rápido en startup (fail-fast).
 */

const apiKey = process.env.YCLOUD_API_KEY
const defaultSender = process.env.YCLOUD_DEFAULT_SENDER

if (!apiKey || !defaultSender) {
  throw new Error(
    '[YCloud] Variables de entorno requeridas no configuradas. ' +
    'Verificá que YCLOUD_API_KEY y YCLOUD_DEFAULT_SENDER estén definidas en .env.local'
  )
}

export const ycloudConfig = {
  /** API Key de autenticación para YCloud */
  apiKey,
  /** Número de WhatsApp remitente verificado en YCloud (formato: 549XXXXXXXXXX) */
  defaultSender,
  /** URL base de la API de YCloud v2 */
  baseUrl: 'https://api.ycloud.com/v2',
} as const
