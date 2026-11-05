# BRIEF DE IMPLEMENTACIÓN — Rendiciones R2b: pantallas de quien rinde

Rama `claude/rendiciones-r2-quien-rinde-abxb3f` · `Fixes CAR-197` (hijo de CAR-163). Diseño aprobado por Carlos el 5-nov-2026 en Claude Design («Rendiciones OPAI 2.0 — módulo completo», «Teléfono · quien rinde» y «Mis rendiciones» de escritorio). **El export no está aún en `docs/2.0/design/export-rendiciones-v3/`:** se construyó con la descripción del encargo y se pidió el export (comentario `@opai-2.0:` en el PR) para comparar capturas. Fuentes: [BRIEF R1](BRIEF-rendiciones-r1.md), [BRIEF R2a](BRIEF-rendiciones-r2a.md), ADR-044/045, ADR-069.

## 1. Alcance
Solo interfaz de quien rinde, sobre las capacidades de R1 y R2a. **No** incluye bandeja del aprobador, lotes de pago, reporte, configuración, Plataforma/CAR-188 ni «No tengo documento» (excepciones de turno extra y dinero a terceros: etapa posterior, decisión del 5-nov-2026).

## 2. Pantallas
- **Mis rendiciones** (`/rendiciones` en el ERP, `/supervisor/rendiciones` en Supervisor): pestañas por ruta (server-first) con contador; tarjeta en 375 y tabla desde 1024 con código REN-n, motivo, total, estado, fecha y quién revisa. La devuelta muestra el motivo de quien revisó y «Corregir y reenviar». Se agregó la pestaña **Rechazadas** (el encargo lista cinco) para que un rechazo y su motivo no desaparezcan de la vista.
- **Nueva rendición de compra**: paso 1 (foto o PDF con vista previa y quitar, tipo Boleta/Factura), paso 2 (monto, fecha no futura, folio, proveedor, descripción; aviso «Esta boleta ya fue rendida en REN-n» que no bloquea) y resumen (varios gastos con total corriente, motivo, centro de costo, aprobador). Guardar borrador y Enviar a aprobación con confirmación (aprobador y total).
- **Nueva rendición de kilometraje**: origen y destino (instalación o dirección con `core.geo.autocompletar/detalle`), ida y vuelta, peaje opcional con foto, desglose línea por línea y total que devuelve `rendiciones.kilometraje.calcular`; el monto nunca se escribe. Sin método: «Tu empresa aún no configura el kilometraje».
- **Ficha**, **Corregir y reenviar** (el mismo formulario con los datos cargados) y **Anular**.
- Estados cargando (esqueleto de `PaginaPortal`), vacío («Aún no has rendido gastos», con la acción), error con reintento y sin permiso.

## 3. Datos y capacidades
- Migración aditiva `20261107120000_rendiciones_tipo_documento`: `rendicion_items.tipo_documento` (`boleta` | `factura`, por defecto `boleta`, con CHECK). RLS ya existente. Etiqueta `migracion-pendiente`; la aplica el bot con respaldo.
- Nuevas capacidades de lectura (MCP, `portales: erp, supervisor`): `rendiciones.opciones.obtener` (centros de costo, aprobadores sin uno mismo, aprobador por defecto, exigir respaldo, destino del respaldo, método de kilometraje) y `rendiciones.duplicados.consultar` (misma regla de alcance que el aviso de `crear`).
- `listar`/`obtener` devuelven `aprobadorNombre` y `creadaEn`; `obtener` suma al viaje lat/lng, fecha y tramo (para corregir); el viaje acepta `peajeDocumentoId` (foto del peaje).
- Las capacidades de rendir y `core.geo.autocompletar/detalle` se abren al portal `supervisor`. Aprobar, rechazar y devolver siguen solo en el ERP.

## 4. Permisos y alcance
`rendiciones:rendir` abre las pantallas; el viewer ve «sin permiso». Supervisor no ve bandeja, reporte ni configuración (no existen en este PR). El alcance se aplica en la consulta (ADR-022). **Respaldo:** `core.documentos` solo deja subir a la empresa (con `documentos.manage`) o a una instalación a cargo (permiso `subir_alcance`); el formulario usa lo primero o, para un supervisor, su primera instalación a cargo, sin visibilidad en portales. Un supervisor sin instalación a cargo no puede subir boletas y ve el motivo.

## 5. Navegación y rendimiento
ERP: área Finanzas (queda en 7 entradas, el máximo). Supervisor: «Rendiciones» fuera de la barra inferior, en «Más». Consultas por navegación: lista 1 (`listar`); formulario 1 (`opciones`) más 0–1 por cálculo y por aviso de duplicado; ficha 2 (`obtener`, `opciones`).

## 6. Verificación
`pnpm typecheck && pnpm lint && pnpm test` (instantánea MCP, inventario de paridad, auditoría de lecturas) y `pnpm test:db` (`rendiciones-r2b-db.test.ts`); build y presupuesto de JS; Playwright a 375, 1024 y 1280 (`apps/web/e2e/rendiciones-r2b.spec.ts`).

## 7. Adenda R2c (CAR-200)
`rendiciones.opciones.obtener` ya no lista a todos los aprobadores: solo los elegibles que define la empresa (`aprobadores_elegibles_ids`), el aprobador por defecto y el asignado a la rendición que se corrige (`rendicionId`). Sin ninguno, quien rinde solo guarda borrador. El servidor sigue aceptando a cualquier miembro que pueda aprobar si se le indica por id (API/MCP); lo que se restringe es lo que se lista. Pendiente: selector de usuarios en Configuración (hoy el ajuste es JSON de ids).
