# Formulario web de solicitudes (Leads PR 2)

Integración del sitio público del tenant (por ejemplo [gard.cl](https://www.gard.cl)) con OPAI 2.0 para crear **solicitudes** en Comercial con canal `formulario_web`, UTM y página de origen.

## Requisitos

1. **Clave del canal** (`opai_frm_…`): la genera un administrador en **Configuración → Módulos → Comercial → Canales de entrada → Formulario web → Generar nueva clave**. Solo se muestra una vez; en configuración queda el sufijo de cuatro caracteres.
2. **Endpoint** por tenant: `POST https://<host-opai>/api/t/<slug-tenant>/solicitudes`  
   En producción de prueba: `https://test.opai.cl/api/t/<slug>/solicitudes` (el slug es el de la empresa en OPAI, no el dominio del sitio).
3. **Cabeceras obligatorias**
   - `Authorization: Bearer <clave del formulario>`
   - `Content-Type: application/json`
   - `Idempotency-Key: <uuid o clave única ≥ 8 caracteres>` (evita duplicar si el usuario reintenta)
4. **Cuerpo JSON** (campos principales)
   - `mensaje` (obligatorio): texto de la consulta
   - `email` o `telefono` (al menos uno)
   - `nombre`, `empresa`, `asunto`, `comuna`, `servicio`, `rut` (opcionales)
   - `utmSource`, `utmMedium`, `utmCampaign`, `utmContent`, `utmTerm`, `paginaOrigen` (opcionales)
   - `website` (honeypot antispam): **debe ir vacío** o omitirse; si trae valor, el envío se rechaza

5. **Dominio autorizado** (opcional en configuración): si se define (p. ej. `gard.cl`), los envíos desde navegador deben traer `Origin` o `Referer` de ese dominio. Las llamadas **server-side** desde el backend de gard.cl (sin esas cabeceras) siguen permitidas.

## Comportamiento en OPAI

- Crea una solicitud en estado `nueva` con `registradaPorTipo: sistema`.
- Notifica al **responsable por defecto** del canal (campana in-app).
- **Acuse de recibo** al correo del solicitante: apagado por defecto (`solicitudes_acuse_recibo` en ajustes del módulo Comercial); sin SLA.

## Ejemplo curl (gard.cl → OPAI)

Sustituye `SLUG`, `CLAVE` y la URL base según el tenant y el entorno:

```bash
curl -sS -X POST 'https://test.opai.cl/api/t/SLUG/solicitudes' \
  -H 'Authorization: Bearer CLAVE' \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: 7f3c9a2e-4b1d-4c8e-9f0a-1b2c3d4e5f6a' \
  -d '{
    "mensaje": "Necesito cotizar servicio de guardias para bodega en Maipú.",
    "nombre": "María González",
    "empresa": "Distribuidora Ejemplo SpA",
    "email": "maria@ejemplo.cl",
    "servicio": "Guardias 24/7",
    "utmSource": "google",
    "utmMedium": "cpc",
    "utmCampaign": "contacto-web",
    "paginaOrigen": "https://www.gard.cl/contacto",
    "website": ""
  }'
```

Respuesta exitosa (`201`):

```json
{ "ok": true, "id": "<uuid solicitud>", "creadaEn": "2026-11-03T12:00:00.000Z" }
```

## Paridad agent-first

| Superficie | Identificador |
| --- | --- |
| Capacidad interna (ruta pública) | `comercial.solicitudes.recibir_formulario_web` |
| Rotar clave (solo personas, UI/API sesión) | `comercial.canales.rotar_token_formulario` |
| API v1 / MCP | Misma capacidad de rotación vía sesión humana; el POST público no usa MCP |

Refs: [BRIEF-07-leads](../briefs/BRIEF-07-leads.md) PR 2, diseño Canales (`diseño/export-leads`).
