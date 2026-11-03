# Brief CAR-154 · Adaptadores SimpleAPI/Octava reales y emisión completa

**Linear:** CAR-154 (P3 auditoría 2026-11). **Rama:** `fix/car-154-simpleapi-real-1f1d`.

## Objetivo

Permitir emitir DTE reales con SimpleAPI (mismo contrato HTTP que OPAI 1.0) y alinear Octava, con payload completo (líneas, CAF, referencias OC/HES, resolución SII), nota de crédito con el adaptador del tenant, preflight y pantalla de `dte_config.emisionProveedor`.

## Alcance entregado

- Adaptador `@opai/integrations` SimpleAPI v1: `POST /api/v1/dte/generar` → `envio/generar` → `envio/enviar`, multipart, auth Basic.
- Payload de emisión desde capacidades: líneas, CAF del rango activo, referencias en borrador/emisión/NC, resolución SII en `dte_config`.
- `finanzas.ventas.preflight_emision` (lectura) y pantalla **Finanzas › Configuración DTE**.
- Tests de contrato con fixtures JSON (sin red ni credenciales).
- Migración aditiva `20261103180000_finanzas_dte_emision_real` (columnas resolución SII).

## Supuestos por confirmar (sin acceso a OPAI 1.0 ni certificación en este entorno)

| Tema | Supuesto en 2.0 | Riesgo |
|------|-----------------|--------|
| Host API | `https://api.simpleapi.cl/api/v1/...` | Bajo si coincide con 1.0 |
| Auth | Basic `base64(apiKey + ':')` | Medio (docs públicas mencionan también header ApiKey) |
| Multipart generar | Campos `input`, `caf`, `certificado`, `password`, `ambiente` | Alto — validar contra set SII |
| Multipart envío | Campos `xml`, `certificado`, `password`, `ambiente`, `resolucion`, `fechaResolucion` | Alto |
| JSON `input` | Estructura tipo SDK ChileSystems (`Documento`, `Detalle`, `Referencia`, `Caratula`) | Medio |
| Consulta SII | `POST /api/v1/envio/consultar` con `trackId` | Medio |
| Octava | Base `https://api.octava.cl/api/v1`, rutas `cesion/enviar` y `cesion/estado/{id}` | Alto — confirmar con proveedor |

## Fuera de alcance (P4 / Carlos)

- Envío del PDF/XML al cliente, ficha de venta con acciones, checklist gráfico de producción.
- Prueba en certificación SII con credenciales reales (D5).

## Verificación

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm test:db   # si toca migración
```

Fixes CAR-154
