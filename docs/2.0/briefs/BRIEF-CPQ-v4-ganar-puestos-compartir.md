# BRIEF · CPQ v4 (PR E): crear puestos al ganar, compartir la cotización y archivar

**Repo:** `Cryptobal/opai-2` · **Fecha:** 4-nov-2026 · **Tarea:** CAR-162, PR E de la [auditoría CPQ](../auditoria-cpq-2026-11.md#5-plan) · **Diseño:** export aprobado `docs/2.0/diseño/export-cpq-v4/` (3-nov): `CrearPuestos`, `Compartir` y `Cotizaciones` (archivar y archivadas). **Rama:** `brief/cpq-v4-ganar-puestos`.

## 1. Objetivo
Cerrar el flujo del cotizador: al ganar el negocio, RRHH confirma y crea los puestos que se vendieron (R2), la cotización se comparte con el cliente por un enlace con vencimiento que se puede revocar (con WhatsApp y correo), y una cotización que ya no sirve se archiva en lugar de borrarse.

## 2. Estado actual (verificado en `main` `ade5265`)
- `cpq.ganar.aceptar` ya deja aceptada la versión enviada de la vigente y emite `cpq.cotizacion.aceptada` con `puestosPorOfrecer`; nadie lo consume y no existe «Crear puestos» (BRIEF-comercial-ganar-sii, «No entra»).
- `core.puestos.create` crea un puesto de 1 posición en PPC; no hay vínculo entre una línea cotizada y los puestos creados.
- No hay enlaces públicos de cotización. El PDF y el correo salen por `cpq.cotizaciones.enviar`.
- `cpq.cotizaciones.list` excluye versiones en estado `archivada`, pero ninguna capacidad lo fija y la lista no tiene filtro.
- R2 (`modulos/cpq.md`): una posición por puesto, **RRHH confirma cada puesto; nada se crea sin esa confirmación**; el sueldo de referencia cuenta como «sueldo cotizado» (decisión de Carlos, 29-oct) y se marca como tal.

## 3. Alcance
**Entra:** (1) oferta y confirmación de puestos al ganar; (2) compartir por enlace público firmado con vencimiento, vistas y revocación, con botones WhatsApp (`wa.me`) y Correo (`mailto:`); (3) archivar y restaurar, con filtro «Archivadas» en la lista.
**No entra:** copiar el sueldo cotizado al puesto (la estructura de sueldo es de Remuneraciones, 07b; el sueldo se muestra en la oferta y no viaja al puesto); el PDF en el enlace público; envío de mensajes por API (WhatsApp y correo solo se abren); eliminar definitivamente un borrador; «Restaurar» en la fila de la lista; margen, finanzas, catálogo, drawer de envío, actividades y seguimiento (otros PR).

## 4. Arquitectura
- **Confirmación de RRHH = permiso y aprobación.** `cpq.puestos.confirmar` exige `cpq:puestos.confirmar` (nuevo; owner y admin) más `core:instalaciones.manage`, y es `irreversible`: un agente queda en la cola de aprobación humana (`APPROVAL_REQUIRED`). El consumidor de `cpq.cotizacion.aceptada` **no crea nada**: la oferta se calcula al abrir la hoja, así que ningún evento crea puestos en silencio.
- **Sin imports cruzados.** CPQ escribe `core.puestos` por su cliente de tenant (el núcleo es siempre dependencia) y emite `core.puesto.creado` por puesto y `cpq.puestos.confirmados` por confirmación.
- **Idempotencia.** `cpq.puestos_creados` es único por (línea, posición): repetir no duplica y dos confirmaciones simultáneas dan CONFLICT. Los nombres se numeran por posición (`<nombre base> n`) y se validan contra los puestos de la instalación.
- **Enlace público** `/p/<slug>/<token>` (el tenant sale del slug, como la firma por enlace). Token de 128 bits (32 hex); la base guarda solo su hash sha256 y la URL se ve únicamente al crearlo (ver «Decisión de Carlos, 4-nov»). `cpq.compartir.ver` es interna, corre con el sistema, cuenta la vista y devuelve solo alcance y venta mensual (nunca costos, sueldos ni margen, R59). Revocado, vencido, archivado o inexistente dan el mismo NOT_FOUND. Tope por IP y token con `permitir(..., { fallarCerrado: true })`.
- **Archivar** es una columna de la cotización (`archivada_en`), no un estado de versión: sirve en cualquier estado salvo `aceptada` (base del contrato) y `en_aprobacion`.

## 5. Archivos
`modules/cpq/capabilities/{puestos-ofrecer,puestos-confirmar,compartir,compartir-ver,archivar,estado-comercial}.ts`, `modules/cpq/persistencia/{puestos-oferta,puestos-resolver}.ts`, `lectura.ts` (filtro `soloArchivadas`), `permisos.ts`, `index.ts`, `manifest.ts`; `packages/db/prisma/schema/cpq.prisma` y la migración; `packages/domain/src/permisos-patrones.ts`; UI en `apps/web/app/(erp)/cotizaciones/` (`acciones-comerciales`, `hoja-compartir`, `hoja-crear-puestos`, `fila-oferta-puesto`, lista), página pública `apps/web/app/p/[slug]/[token]/`, `proxy.ts` (ruta pública), `paridad-permitidos.json`, paridad (instantánea, inventario, excepciones).

## 6. Modelo de datos y migraciones (aditivas)
`20261105171500_cpq_ganar_puestos_compartir` (el prefijo `20261105120000` ya lo usa `finanzas_cobranza` en `main`): `cpq.cotizaciones.archivada_en` y `archivada_por_id` (nulas); `cpq.enlaces_compartidos` (token único, `vence_en`, `revocado_en`, vistas, índice parcial: un enlace activo por cotización); `cpq.puestos_creados` (único por línea y posición). Ambas tablas con `tenant_id`, RLS ENABLE + FORCE, política `tenant_isolation`, trigger `mismo_tenant`, `GRANT` y `SET LOCAL lock_timeout`. Sin migración de datos. Reversión al pie del SQL.

## 7. Capacidades
| Id | Efecto | Notas |
|---|---|---|
| `cpq.puestos.ofrecer` | lectura | Una fila por línea de guardias de la versión aceptada; sueldo solo con `cpq:costos.ver` |
| `cpq.puestos.confirmar` | irreversible, dryRun | Crea los puestos; ajustes por línea: cantidad, nombre base, instalación, cargo, patrón y horario |
| `cpq.compartir.crear` / `revocar` | escritura, dryRun | Un enlace activo por cotización; vence en 1 a 90 días (15 por defecto) |
| `cpq.compartir.ver` | interna | Solo la página pública; por eso está en `paridad-excepciones.ts` y `paridad-permitidos.json` |
| `cpq.cotizaciones.archivar` / `restaurar` | escritura, dryRun | |
| `cpq.cotizaciones.estado_comercial` | lectura | Archivada, aceptada, si el enlace está permitido, estado del enlace activo (vencimiento y vistas, nunca la URL; solo con `cpq:cotizaciones.manage`) y puestos pendientes |
| `cpq.cotizaciones.list` | lectura | Nuevo `soloArchivadas`; por defecto oculta las archivadas |

## 8. Interfaz y responsive
Tarjeta «Compartir y cierre» en la ficha (Compartir, Crear puestos (n), Archivar o Restaurar). **Compartir** (`Sheet`): enlace con vencimiento, Copiar, WhatsApp, Correo, mensaje de ejemplo, vistas y «Revocar enlace»; sin enlace o vencido, «Crear enlace». **Crear puestos** (`Dialog` grande): una fila por línea con cargo, instalación, patrón, horario, sueldo cotizado y su origen (solo con costos), casilla, nombre base y cantidad; pie «Confirmar y crear n puestos»; éxito con enlaces a los puestos de cada instalación. Lista: chip «Mostrar › Archivadas». Página pública con `AuthCard`. Todo con `@opai/ds`, sin hex ni estilos inline, a 375, 1024 y 1280 px.

## 9. Seguridad y tenant
RLS en las dos tablas; el tenant sale de la sesión o del slug del enlace, nunca del body. El token es una credencial: se muestra una sola vez, al crearlo, a quien puede gestionar cotizaciones. Los costos no salen en la oferta sin `cpq:costos.ver` ni en la página pública. Un lector no confirma ni comparte.

## 10. Casos límite
Sin versión aceptada: la oferta lo dice. Línea sin instalación, cargo, patrón u horario: el servidor lo pide por nombre. Patrón «4×4» o «4x4» se casa con el catálogo; si no existe, se interpreta `NxM`. Nombre repetido en la instalación: CONFLICT con el nombre. Reconfirmar lo ya creado: regla de negocio, sin duplicar. Cotización archivada: no se comparte y su enlace deja de abrir. Crear un enlace revoca el anterior.

## 11. Plan por bloques
B1 `db:` migración y modelos · B2 `cpq:` archivar y filtro · B3 `cpq:` compartir y vista pública · B4 `cpq:` oferta y confirmación de puestos · B5 `comercial:` UI (tarjeta, hojas, lista, página pública) · B6 `docs:` brief y `ESTADO.md`.

## 12. Tests
`packages/capabilities/test/cpq-puestos-compartir-db.test.ts` (Postgres real, rol sin BYPASSRLS, dos empresas): sin aceptada no hay oferta; oferta con patrón casado y sueldo; gerente no confirma; vista previa sin escribir; confirmar crea 2 puestos PPC y repetir no duplica; otra empresa no crea; enlace abre sin costos y cuenta la vista; revocar, vencer y reemplazar; archivar y restaurar con filtros; la aceptada no se archiva. Paridad, `permisos.test.ts` y `cpq-ui.test.ts` actualizados.

## 13. Validación
`pnpm typecheck && pnpm lint && pnpm test && pnpm test:db`, regeneración de la instantánea MCP y del inventario de paridad.

## 14. Criterios de aceptación
1. Con la cotización aceptada, la hoja lista los puestos y solo owner o admin los confirma; nada se crea antes.
2. Cada posición confirmada es un puesto en PPC; repetir no duplica.
3. El enlace abre sin sesión, sin costos ni margen, cuenta vistas y deja de abrir al revocarse, vencer o archivar.
4. WhatsApp abre `wa.me` con el texto y el enlace; no se envía nada por API.
5. Archivar oculta de la lista; «Archivadas» las muestra; restaurar las devuelve.

## 15. Riesgos y rollback
El sueldo cotizado no pasa al puesto (queda para el brief de Remuneraciones 07b). Cada apertura pública escribe una auditoría y una vista (volumen bajo; el tope por IP lo acota). Rollback: quitar las capacidades del índice y revertir la migración (SQL al pie; solo borra objetos nuevos).

## 16. Reporte de ejecución
Ver la descripción del PR y `ESTADO.md`.

## Decisión de Carlos, 4-nov-2026 17:34 CLT (Opción A) y su aplicación
Para Gard todo pasa por el Portal Cliente; el enlace suelto es un respaldo para empresas sin portal.
1. **Correo al cliente con enlace al Portal Cliente.** El correo de `cpq.cotizaciones.enviar` (y el de envío conjunto) usa ahora el evento comunicable `cpq.cotizacion.enviada_cliente` (nuevo, transaccional, plantilla de correo editable en Comunicaciones) con `url` = `<urlBase>/cliente`. Hallazgo: `cpq.cotizacion.enviada` no estaba en el catálogo comunicable, así que el correo se descartaba en silencio (envío «best-effort»). **El Portal Cliente aún no tiene vista de cotización** (solo existe `/cliente`, el resumen del mes): el correo apunta a esa ruta y queda pendiente la vista de cotización en el portal (cambiar solo la ruta en `persistencia/correo-cliente.ts`).
2. **Enlace apagado por defecto.** Ajuste `cpq.enlace_publico` (`.default(false)`, Configuración › CPQ › Ajustes). Solo aplica si el tenant NO tiene `portal_cliente` activo: con portal, `cpq.compartir.crear` falla aunque el ajuste esté en verdadero. Se valida en el servidor (`enlacePublicoPermitido`): en `crear`, en `ver` y en la página `/p/` (que lee los módulos reales de la empresa); apagado o con portal, `/p/` responde el mismo NOT_FOUND. La tarjeta oculta Compartir (enlace, WhatsApp, correo) cuando no aplica (`enlacePermitido` en `estado_comercial`). `revocar` siempre funciona.
3. **Token con hash.** `cpq.enlaces_compartidos.token_hash` (CHECK 64 hex, único); la búsqueda en `/p/` es por hash. La URL completa solo se devuelve al crear; `estado_comercial` y cualquier lectura devuelven solo «hay enlace activo», vencimiento, vistas y estado. La hoja Compartir ofrece «Crear enlace nuevo» (revoca el actual) si hace falta volver a verla. La migración `20261105171500` se editó (no estaba aplicada en Neon).
4. **Tope por IP sin el token** en `/p/` (además del tope por IP y token).
Fuera de este PR: el enlace para la propuesta técnica (otro PR). Tests: ajuste apagado, ajuste encendido sin portal y ajuste encendido con portal (`cpq-puestos-compartir-db.test.ts`).
