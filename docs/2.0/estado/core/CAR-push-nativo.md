# CAR · Push nativo app Capacitor (rama `cursor/push-nativo-fcm-ca4d`)

## Qué entró

- Modelo `core.suscripciones_push` con `tipo` `web | nativa`, `token`, `plataforma` enum `ios|android`; únicos completos `(tenant_id, endpoint)` y `(tenant_id, token)` (sin índices parciales).
- Capacidad `core.push.suscribir` / `quitar` con union discriminada web/nativa.
- Emisor FCM HTTP v1 en `@opai/integrations` (`FIREBASE_SERVICE_ACCOUNT`); sin env, inactivo.
- `avisarAlCelular` enruta web + nativo con ruta en `data` (título genérico).
- App web: `ClientePushNativo` tras login; interruptor del portal trabajador activa push nativo en app.
- Capacitor: `@capacitor/push-notifications` 8.0.2; iOS `aps-environment` production y `remote-notification`; Android cableado `google-services` documentado en `apps/movil/README.md`.

## Push tras campana

Conectado donde ya existía aviso in-app: núcleo Comunicaciones, pauta (ruta `/trabajador`), tickets, solicitudes comerciales, CPQ aprobaciones, rendiciones, desempeño bajo meta, CRM actividades vencidas.

## Sin campana hoy (no inventados en este PR)

- **Terreno / rondas:** no hay consumidor que cree `core.notificaciones` para eventos de rondas.
- **Libro de novedades (terreno):** sin aviso in-app dedicado en consumidores.
- **Portal cliente — novedades e informes mensuales:** el resumen y el correo del informe existen; no hay campana in-app al publicar informe.
- **Asistencia supervisor (marcas sin correo transaccional):** `asistencia.alerta.fuera_de_geocerca` y similares llegan por Comunicaciones si hay regla `inapp`; las alertas art. 45 al trabajador son solo correo (`consumidorAlertas`).

## Pendiente

- Migración en Neon (`migracion-pendiente`) tras merge: aplicar con respaldo en `dev` y `main`.
- Colocar `google-services.json`, `GoogleService-Info.plist` y `FIREBASE_SERVICE_ACCOUNT` en entornos (fuera del repo).