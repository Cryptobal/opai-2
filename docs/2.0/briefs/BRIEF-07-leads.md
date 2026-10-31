# BRIEF 07 · Leads (Solicitudes) — Comercial

**Refs CAR-26.** Autorizado por Carlos el 30-oct-2026. Spec: [`modulos/comercial.md`](../modulos/comercial.md) (Solicitudes R1–R5, `/solicitudes`, `/solicitudes/[id]`). Diseño aprobado: [`diseño/export-leads`](../diseño/export-leads/README.md) (v2, pantallas 01–10). Leads es parte de Comercial: vive en `modules/comercial` y en el schema `comercial`.

## 1. Hoja de alcance (una página)

**Decisiones de Carlos (no se reabren).** Módulo liviano: las solicitudes se reciben, se ven, se procesan y se pasan a negocios y cotizaciones; la conversión sí va. Toda solicitud entra `nueva` (R1) con su texto original guardado tal cual y mostrado como contenido externo (texto plano, nunca enlace ni botón). Estados `nueva → en_revision → convertida | descartada` (con motivo, reversible); una duplicada se enlaza a la original. **Sin SLA** de primera respuesta y **acuse de recibo apagado por defecto** (reemplaza el R2 de `comercial.md`). Canales v1: formulario web, correo de entrada, agente (`comercial_solicitudes_create`, con vista previa) y registro manual; **WhatsApp no se lee automáticamente**. Los canales se configuran en Configuración › Módulos › Leads.

| De 1.0 (piso) | En 2.0 | Cómo |
|---|---|---|
| Crear lead a mano, por correo y por agente (`create_lead`, `create_lead_from_email`) | **Pasa** | Registro manual y agente en el PR 1; correo y formulario en el PR 2 |
| Bandeja con filtros y canal (`search_leads`, `get_lead_channel_report`) | **Pasa**, mejorada | Chip y filtro de canal; «posibles duplicadas» por correo o RUT |
| Aprobar o rechazar un lead (`approve_lead`, `reject_lead`) | **Pasa** simplificado | Derivar (`en_revision`) y descartar con motivo, reversible |
| Convertir a cuenta + contacto + negocio (`convert_lead`) | **Pasa**, mejorada | Un paso, reutilizando cuenta y contacto por RUT o correo, sin bloquear |
| Acuse de recibo (`set_lead_ack`) | **Pasa**, apagado por defecto | Ajuste `solicitudes_acuse_recibo`; el envío real llega con el correo de entrada (PR 2) |
| SLA de primera respuesta (`list_leads_sla`) | **No pasa** | Decisión de Carlos |
| Pesos de puntaje del lead (`set_lead_score_weights`) | **No pasa** | Módulo liviano; sin scoring |
| Eliminar un lead (`delete_lead`) | **No pasa** | Se descarta con motivo; nada se borra |

**Mejoras.** Texto externo marcado; duplicadas enlazadas; conversión con vista previa («qué se reutiliza, qué se crea»); permisos por rol; auditoría y MCP con `preview_`.

**Fuera (Propuestas B, sin decidir):** asignación automática, que el agente convierta, formulario alojado por OPAI.

## 2. Plan

### PR 1 (este)
Datos y capacidades primero, pantallas después.
- **Datos:** `comercial.solicitudes` y `comercial.canales_solicitud` (`leads.prisma`, migración `20261030210000_comercial_leads`, aditiva, FORCE RLS, checks de estado y canal, triggers de mismo tenant). Reversa en el SQL.
- **Capacidades** (`comercial.solicitudes.list|get|create|derivar|descartar|reabrir|marcar_duplicada|convertir`, `comercial.canales.get|update`), todas con `/api/v1`, MCP y `preview_`. Las lecturas están auditadas (NÚCLEO-H).
- **Permisos:** `comercial:solicitudes.read` y `.manage` (owner, admin, gerente y roles personalizados con el permiso; supervisor y viewer sin acceso) y `comercial:canales.manage` (solo owner y admin).
- **Pantallas:** Bandeja (01), Detalle (02/03), Registrar solicitud (06), Procesar y convertir → «Pasar a negocio» (04), origen en la ficha del negocio (05) y Configuración › Módulos › Leads (07) con los canales «Sin conectar».
- **Tests:** transiciones (dominio), `test:db` de aislamiento y flujo, snapshot MCP y paridad, e2e de las pantallas.

### PR 2 (pendiente, por dependencias)
- **Pasar a cotización:** requiere CPQ (#147). Punto de entrada: tras `comercial.solicitudes.convertir` el negocio ya existe con su cuenta y contacto; CPQ abre la Cotización rápida con cuenta, contacto y servicio de la solicitud (`solicitud.servicio`) y guarda «Origen: solicitud». El botón no existe en el PR 1.
- **Correo de entrada** y **endpoint del formulario web:** necesitan infraestructura y claves (dirección por tenant, clave del formulario en Integraciones). El PR 1 solo trae el modelo de canal y su configuración visible, sin credenciales.
- **Acuse de recibo:** el envío por Comunicaciones del núcleo, cuando haya canal de entrada.
- Adjuntos del correo a Documentos y los estados 08 del canal (clave revocada, mensaje rechazado).

## 3. Conversión (R4)
`comercial.solicitudes.convertir` en una transacción: reutiliza la cuenta por la indicada, por RUT, o por el contacto con ese correo; si no, la crea como prospecto. Reutiliza el contacto por correo o crea uno (principal si la cuenta es nueva). Crea el negocio en la primera etapa del embudo por defecto y enlaza solicitud, cuenta, contacto y negocio. Los datos enviados corrigen los de la solicitud. La instalación prospecto opcional se vincula después desde el negocio. Con `dryRun` devuelve el plan sin escribir.
