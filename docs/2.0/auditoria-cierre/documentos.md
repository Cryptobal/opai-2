# Auditoría de cierre · 10 · Documentos

**Fecha:** 16-nov-2026 · **Sesión:** Auditoría de cierre (tanda 09, 10 y 11) · **Foto:** `main` en `5c0a5a8`.

**Avance real: 67 %** (Linear: 6 de 10 en Done).

Método: el de [`asistencia.md`](asistencia.md#cómo-se-calculó-igual-en-los-tres-informes-de-esta-tanda). Alcance 10,5 / 15 = 70 %; estándares 3,5 / 6 = 58 %; pruebas 60 %. Total: **67 %**.

## Lo más importante

1. **Hay una fuga de datos de sueldo abierta.** La copia firmada de un anexo pierde el filtro de anexos, así que quien no tiene `anexos.read` puede verla (CAR-512). La corrección (#849) está abierta desde el 15-nov. Es el riesgo más alto del módulo; quedó comentado en el ticket.
2. **El núcleo documental está completo:** explorador, subida con vínculos a cualquier entidad, vencimientos, tipos, plantillas con versiones, generación de PDF con logo desde persona, cuenta e instalación, firma electrónica con verificación, y documentos en el portal del trabajador.
3. **Faltan, respecto de 1.0, el envío masivo** (CAR-633) **y las firmas pendientes en los portales** (CAR-634).

## 1. Tickets contra PR

| Ticket | Estado | PR | ¿En `main`? | ¿Hace lo que pide? |
|---|---|---|---|---|
| CAR-82 · Control de acceso y firma (construcción) | Done | #140, #153 (firma) | Sí | Solo la firma. El control de acceso del título se construyó después en CAR-122 |
| CAR-127 · Documentos v4 | Done | #440, #444, #492, #522, #531, #534 | Sí | Sí |
| CAR-315 · Editor de plantillas más claro | Done | #515, #559 | Sí | Sí |
| CAR-407 · Documentos en el buscador | Done | #869 | Sí | Sí |
| CAR-431 · e2e del selector de plantilla | Done | #777 | Sí | Sí, pero `anexo-contrato` está en rojo el 16-nov (CAR-635) |
| CAR-499 · Contratos y anexos al portal del trabajador | Done | #848 | Sí | Sí, y destapó CAR-512 |
| CAR-512 · La copia firmada de un anexo pierde el filtro | In Progress (Alta) | #849 abierto | No | **Fuga vigente** |
| CAR-496 · Archivos en tickets y visitas | In Progress | #978 abierto | No | — |
| CAR-421 · Campos personalizados en plantillas | In Progress | #985 abierto | No | — |
| CAR-30 · Formatos de Gard, editor y firma con Face ID (alcance) | Backlog | — | No | — |

## 2. Alcance contra 1.0

Fuente 1.0: `opai/documentos/*` (laborales, plantillas, envío masivo, seguimiento), `opai/configuracion/firmas` y `portal/supervisor/firmas`.

| # | Qué hace 1.0 | En 2.0 | Detalle |
|---|---|---|---|
| 1 | Explorador de documentos | Está | |
| 2 | Subir y vincular a cualquier entidad | Está | ADR-019 |
| 3 | Vencimientos y pedido de renovación | Está | |
| 4 | Tipos de documento | Está | |
| 5 | Plantillas: crear, editar, versiones, publicar | Está | |
| 6 | Generar el documento desde persona, cuenta o instalación (PDF con logo) | Está | |
| 7 | Firma: enviar, firmar, rechazar, recordar, verificar, política | Está | |
| 8 | Firmas pendientes en el portal Supervisor | Falta | CAR-634 |
| 9 | Envío masivo de documentos laborales | Falta | CAR-633 |
| 10 | Seguimiento de lo enviado | Parcial | La lista de Firmas cubre el estado; no hay vista por lote |
| 11 | Firma con Face ID | Falta | CAR-30 (Backlog) |
| 12 | Documentos en el portal del trabajador | Está | |
| 13 | Archivos en tickets y visitas | Falta | #978 |
| 14 | Campos personalizados como variables | Falta | #985 |
| 15 | Buscador general | Está | |

## 3. Estándares

| Chequeo | Resultado | Evidencia |
|---|---|---|
| Lista y ficha (CAR-545) | Parcial | Firmas en CAR-564 |
| Paginación y búsqueda | No | `core.documentos.list`, `core.documentos.vencimientos` y `core.firmas.list` siguen en `listas-pendientes.json` (CAR-635) |
| Sin duplicados | Parcial | La marca documental de CPQ y la marca de la empresa están sin unificar (`inventario-duplicados.md` §5) |
| Sin textos internos | Sí | |
| Permisos por rol | **Parcial** | Fuga de CAR-512 |
| MCP | Sí | |

## 4. Pruebas

e2e del editor de plantillas, generar documento (`@preview`) y mis documentos: en verde. `anexo-contrato.spec.ts`: **rojo** en iPad el 16-nov (CAR-635). Base: sin prueba que cubra la copia firmada de un anexo; la agrega #849.

## 5. Tickets creados

| Prioridad | Ticket |
|---|---|
| Media | CAR-633 Envío masivo de documentos laborales |
| Media | CAR-634 Firmas pendientes en los portales Supervisor y Trabajador |
| Media | CAR-635 Listas al contrato CAR-353 y e2e de anexo en rojo |

Comentario en CAR-512 para priorizar #849.
