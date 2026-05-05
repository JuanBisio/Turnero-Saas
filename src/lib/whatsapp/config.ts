/**
 * Configuración del cliente de YCloud.
 * En modo multi-tenant, cada shop usa sus propias credenciales desde DB.
 * Las variables de entorno actúan solo como fallback para el shop "demo".
 */
export const ycloudConfig = {
  apiKey:        process.env.YCLOUD_API_KEY        ?? "",
  defaultSender: process.env.YCLOUD_DEFAULT_SENDER ?? "",
  baseUrl:       "https://api.ycloud.com/v2",
} as const;
