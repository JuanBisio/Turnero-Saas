# Turnero SaaS - Sistema de Gestión de Turnos

Sistema multi-tenant de gestión de turnos para comercios con agenda inteligente, reservas públicas y automatización.

## 🚀 Estado del Proyecto

### ✅ FASE 1 - Estructura Base (COMPLETADA)
- Framework Next.js 15 con App Router
- Tailwind CSS v4 configurado
- Supabase integrado (cliente + servidor)
- Middleware multi-tenant (shop_slug)
- Estructura de rutas dashboard + widget

### ✅ FASE 2 - Motor de Disponibilidad (COMPLETADA)
- Algoritmo `getAvailableSlots` con 5 pasos
- Manejo de zonas horarias con date-fns-tz
- Colisión con appointments y exceptions
- Respeto a schedules por profesional
- Buffer time y minimum lead time
- API REST endpoint `/api/v1/availability`

### ✅ FASE 3 - Dashboard Administrativo (COMPLETADA)
- ✅ Layout con sidebar y navegación
- ✅ Theme toggle (Dark/Light mode)
- ✅ **CRUD Profesionales**
  - Lista con crear/editar/eliminar
  - Editor de horarios por día de semana (Lun-Dom)
  - Configuración de buffer_time
- ✅ **CRUD Servicios**
  - Lista con crear/editar/eliminar
  - Configuración duración y precio
- ✅ **Vista Agenda**
  - Calendario mensual
  - Selector de profesional
  - Lista de turnos del día
  - Estados: pendiente/confirmado/cancelado
- ✅ **Configuración (Integraciones n8n)**
  - Gestión de webhook URL
  - Visualización de API Key
  - Toggle activar/desactivar webhooks
  - Logs de últimos 10 webhooks
  - Botón "Enviar Prueba"

### ✅ FASE 4 - Widget Embebible (COMPLETADA)
- ✅ Ruta pública `/widget/[shop_slug]`
- ✅ Stepper de 5 pasos
  - Paso 1: Selección de Servicio
  - Paso 2: Selección de Profesional
  - Paso 3: Selección de Fecha
  - Paso 4: Selección de Horario (integra getAvailableSlots)
  - Paso 5: Formulario Cliente + CAPTCHA
- ✅ Cloudflare Turnstile CAPTCHA
- ✅ Creación de appointments vía API pública
- ✅ Generación de cancellation_token
- ✅ Página de cancelación pública `/widget/[shop_slug]/cancelar/[token]`

### ✅ FASE 5 - Integración n8n y Webhooks (COMPLETADA)
- ✅ **API de Entrada (n8n → App)**
  - `POST /api/v1/admin/appointments/external`
  - Autenticación con Bearer token (API key)
  - Rate limiting 100 req/min
  - Bypass CAPTCHA para canal confiable
  - Validación ventana 30 días
- ✅ **Webhooks de Salida (App → n8n)**
  - Evento `appointment.created`
  - Evento `appointment.cancelled`
  - Header `X-Webhook-Secret` para validación
  - Retry logic 3x con backoff exponencial (1s, 2s, 3s)
  - Logging completo en tabla `webhook_logs`
- ✅ **Payload JSON**
  - Timestamps con timezone del shop
  - Datos completos: customer, professional, service
  - Link de cancelación único
- ✅ **UI de Gestión**
  - Configuración de webhook URL
  - Mostrar/regenerar API Key
  - Webhook secret (SHA256)
  - Switch activar/desactivar
  - Historial últimos 10 webhooks

---

## 🗄️ Base de Datos

### Tablas Principales
- `shops` - Comercios multi-tenant
- `professionals` - Profesionales por shop
- `schedules` - Horarios semanales de profesionales
- `services` - Servicios ofrecidos
- `appointments` - Turnos reservados
- `exceptions` - Bloqueos y excepciones de horarios
- `webhook_logs` - Auditoría de webhooks enviados

### RLS (Row Level Security)
Configurado para aislamiento por `shop_id`

---

## 🛠️ Configuración

### 1. Variables de Entorno

Copia `.env.local.example` a `.env.local` y configura:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Webhooks y Seguridad
WEBHOOK_MASTER_SECRET=secret-aleatorio-aqui
CANCELLATION_SECRET=otro-secret-aleatorio

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# CAPTCHA (Cloudflare Turnstile)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

### 2. Migraciones SQL

Ejecuta en Supabase SQL Editor:
1. `/supabase/migrations/001_initial_schema.sql` (schema base)
2. `/supabase/migrations/005_webhooks.sql` (webhook support)

### 3. Instalar Dependencias

```bash
npm install
```

### 4. Ejecutar

```bash
npm run dev
```

---

## 📍 Rutas Principales

### Dashboard (Autenticado)
- `/dashboard/[shop_slug]/agenda` - Vista de calendario y turnos
- `/dashboard/[shop_slug]/profesionales` - Gestión de profesionales
- `/dashboard/[shop_slug]/servicios` - Gestión de servicios
- `/dashboard/[shop_slug]/configuracion` - Configuración e integraciones

### Widget Público
- `/widget/[shop_slug]` - Interfaz de reserva para clientes
- `/widget/[shop_slug]/cancelar/[token]` - Cancelación sin login

### API
- `GET /api/v1/availability` - Consultar slots disponibles
- `GET /api/public/availability` - Consultar slots (público)
- `POST /api/public/appointments` - Crear turno (público, bypasses RLS)
- `POST /api/v1/admin/appointments/external` - Crear turno desde n8n
- `POST /api/v1/appointments/cancel` - Cancelar turno
- `POST /api/v1/admin/webhooks/test` - Enviar webhook de prueba
- `POST /api/v1/webhooks/trigger` - Trigger webhook post-creación

---

## 🔌 Integración con n8n

### Crear Turno desde n8n

```bash
curl -X POST https://tu-app.com/api/v1/admin/appointments/external \
  -H "Authorization: Bearer TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "professional_id": "uuid-prof",
    "service_id": "uuid-service",
    "start_time": "2026-01-22T14:00:00-03:00",
    "customer_name": "Cliente Ejemplo",
    "customer_phone": "+54 9 11 1234-5678",
    "customer_email": "cliente@example.com"
  }'
```

### Recibir Webhooks en n8n

1. Configura Webhook node en n8n
2. Obtén la URL del webhook
3. En Dashboard → Configuración → Integraciones:
   - Pega la URL de n8n
   - Activa webhooks
   - Copia el `Webhook Secret`
4. En n8n, valida el header `X-Webhook-Secret`

**Eventos:**
- `appointment.created` - Turno creado
- `appointment.cancelled` - Turno cancelado
- `webhook.test` - Prueba manual

---

## 🎨 Tema y Diseño

- **Colores:**
  - Primary: `#2563eb` (azul)
  - Accent: `#38bdf8` (celeste)
- **Componentes:** Shadcn UI (Tailwind-based)
- **Dark Mode:** Soporte completo vía next-themes

---

## 🔐 Seguridad

- ✅ RLS habilitado en Supabase
- ✅ API key validation para endpoints externos
- ✅ Webhook secret (SHA256) para validación
- ✅ Rate limiting 100 req/min por shop
- ✅ CAPTCHA en widget público
- ✅ Service role key solo en server-side

---

## 📦 Dependencias Principales

```json
{
  "next": "16.1.4",
  "@supabase/supabase-js": "^2.x",
  "date-fns": "^4.x",
  "date-fns-tz": "^3.x",
  "next-themes": "^0.4.x",
  "@marsidev/react-turnstile": "^0.x"
}
```

---

## 🚧 Pendientes / Mejoras Futuras

- [ ] Autenticación completa (Supabase Auth)
- [ ] Realtime subscriptions para agenda
- [ ] Bloqueo manual de rangos horarios
- [ ] Notificaciones por email
- [ ] Analytics y reportes
- [ ] Exportación de datos
- [ ] Multi-idioma

---

## 📝 Notas Importantes

1. **Service Role Key**: Nunca expongas en el frontend. Solo server-side.
2. **Timezone**: Configurar correctamente en `shops.timezone`
3. **Migraciones**: Ejecutar en orden en Supabase
4. **CAPTCHA**: Usar site key de producción en deploy
5. **Webhooks**: Configurar retry policy según necesidades

---

## 📄 Licencia

Proyecto privado - Todos los derechos reservados
