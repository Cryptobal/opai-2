# Extracción de OPAI 1.0 — Integraciones, credenciales y configuración por tenant

**Fuente:** `Cryptobal/opai` @ `53bb97d`: `.env.example`, `src/lib/tenant-config.ts`, `src/app/(app)/opai/configuracion/*`, `prisma/schema.prisma` (campos cifrados), `src/components/ops/rondas/*` (Maps).
**Propósito:** saber qué es global de la plataforma, qué es por tenant, y qué estaba mal ubicado, para diseñar Integraciones y Configuración en 2.0 (ADR-018, ADR-027).

## 1. Servicios externos y dónde vive hoy la credencial

| Servicio | Uso | En 1.0 la credencial es… | En 2.0 |
|---|---|---|---|
| Resend | correo transaccional, webhooks, correo entrante | global (`RESEND_API_KEY`), remitente por tenant en `Setting` (`emailFrom`, `replyTo`, CCO por área) | Global de plataforma; por tenant: remitente, dominio verificado (DNS que el tenant configura), CCO. Opcional: key propia del tenant |
| Google OAuth (login), Gmail, Drive, Calendar | login ERP y productividad | global (`GOOGLE_CLIENT_ID/SECRET`); tokens OAuth de usuario cifrados en BD | Solo login Google (global). Gmail/Drive/Calendar no se portan |
| Google Maps | autocompletado de direcciones, mapas de rondas, heatmaps | global y **pública** (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) usada desde el navegador | Por defecto key de plataforma (con restricción por dominio y cuotas) incluida en el servicio; opcionalmente **key propia del tenant** (para cuotas altas) guardada cifrada. Geocodificación en servidor con key no pública |
| AWS Rekognition + Liveness | Face ID y prueba de vida | global (`AWS_*`, colección por tenant con prefijo) | Global de plataforma; colección aislada por tenant; nunca key por tenant |
| SimpleAPI / Chilesystems (DTE, SII) | facturación electrónica | global `DTE_*` + certificado digital **por tenant cifrado** (AES-256-GCM) + credenciales BNE por empleador cifradas | Por tenant: certificado digital, credenciales del proveedor DTE, datos SII; cifrados con clave de plataforma (ADR-027) |
| Fintoc | movimientos bancarios | global (`FINTOC_*`), vínculo bancario por tenant | Por tenant: enlace de cuenta (token de Fintoc cifrado) |
| Twilio WhatsApp | alertas y confirmaciones | global, un WABA, número asignado por tenant | Global; número y plantillas aprobadas por tenant |
| Pusher | tiempo real | global | Global (detrás de un adaptador) |
| OpenAI / Anthropic / Google | IA | global; proveedor configurable por tenant en `ai-service.ts` | Global con proveedor y modelo por tenant; opcionalmente key propia del tenant para facturación directa |
| Slack | integración completa | token por tenant cifrado (`SLACK_TOKEN_ENCRYPTION_KEY`) | Solo como canal de notificaciones, token por tenant cifrado (backlog) |
| Cloudflare R2 | archivos | global | Global; prefijo por tenant; URLs firmadas de corta duración |
| Upstash Redis | rate limit | global | Global (rate limit centralizado, pendiente en 2.0) |
| Sentry, Vercel Analytics | observabilidad | global | Global |
| Apollo | prospección | global | No se porta |
| go2rtc / Caddy | cámaras IP | relay propio, credenciales de cámara cifradas | Backlog (módulo cámaras) |
| Web4Leads → Fintoc | movimientos Santander de Gard | webhook entrante | Se mantiene como webhook entrante por tenant con firma |

**Regla observada:** en 1.0 varias credenciales que son del tenant (DTE, Slack, Gmail) ya se cifran con AES-256-GCM y una clave de plataforma; otras que deberían poder ser del tenant (Maps) son globales y públicas. 2.0 unifica: un solo almacén de secretos por tenant (ADR-027).

## 2. Configuración por tenant que existe en 1.0 (`Setting` key-value + pantallas)

Pantallas en `/opai/configuracion`: alertas-cobertura, asistente-ia, ats, auditoria, categorias-plantillas, conocimiento, correos-automaticos, cpq, crm, cumplimiento, documentos-operacionales, empresa, finanzas, firmas, fiscalizacion-dt, gamificacion, grupos, informes-vulnerabilidad, integraciones (gmail, google-calendar, google-drive, mcp, slack), inteligencia-artificial, mi-plan, notificaciones, ops, payroll, psicolaboral, roles, seguridad, tipos-ticket, usuarios. **Treinta entradas**: es el "Frankenstein" que ADR-018 evita.

Datos de empresa (`tenant-config.ts`), todos por tenant: razón social, RUT, dirección, comuna, ciudad, teléfono, representante legal (nombre, RUT), escritura pública (fecha, notaría); nombre comercial, marca corta, sitio web; **branding**: logo completo, isotipo, logo para fondo oscuro y claro, favicon, color primario, secundario y acento, nombre de app y tagline; correos por área (comercial, operaciones, finanzas, contacto), teléfono y enlace de WhatsApp; remitente y reply-to de correo; CCO por área (comercial, operaciones, finanzas, sistema); métricas para propuestas comerciales (años de operación, guardias activos, instalaciones, regiones, indicadores de cumplimiento y satisfacción, cuentas excluidas).

Claves de `Setting` con tenant: `marcacion_config`, `notification_preferences`, políticas de seguridad, presupuesto de tarjetas, últimos envíos.

## 3. Lo que 2.0 toma de aquí

1. **Perfil de empresa** del tenant (núcleo, Brief 02): identificación legal, representante legal, contacto por área, **marca** (logos en cuatro variantes, favicon, colores de marca para documentos y correos; la UI de OPAI no cambia de colores por tenant salvo acento opcional), métricas comerciales.
2. **Integraciones** por tenant (ADR-027): catálogo de integraciones con estado (no configurada, configurada, con error), credenciales cifradas, prueba de conexión, y registro de uso; cada módulo declara qué integraciones necesita.
3. **Marca en toda salida**: documentos, correos, PDF, portales de cliente y trabajador usan el logo y los colores de marca del tenant (ADR-028).
4. Una sola Configuración por ámbitos en vez de treinta pantallas (ADR-018).
