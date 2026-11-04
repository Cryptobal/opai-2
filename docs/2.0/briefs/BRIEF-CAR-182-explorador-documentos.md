# BRIEF CAR-182 · PR 4 — Explorador de Documentos

Tarea: [CAR-182](https://linear.app/carlos-irigoyen/issue/CAR-182). Diseño aprobado por Carlos el 30-oct-2026: `docs/2.0/diseño/export-documentos-v4/` (pantalla `01 Explorador`; fuente `Explorador.dc.html`). Decisión de Carlos del 3-nov-2026: todo documento se centraliza en el área Documentos.

## 1. Objetivo

Una pantalla central, `/documentos`, donde el equipo encuentra cualquier documento del tenant sin saber a qué ficha pertenece: buscar, filtrar por estado, tipo y entidad, ver a quién está vinculado, si vence y si está firmado, y abrirlo. Con la misma lectura expuesta por el MCP.

## 2. Estado actual (verificado en `main` `1c443248`)

- Existen `core.documentos.list/get/vencimientos/matriz/url_descarga` y las escrituras (`packages/capabilities/src/core/documentos/*`).
- `list` no pagina, no busca, topa en 500 y **no devuelve la entidad propietaria** (solo `get` y `vencimientos`). Sirve a la pestaña Documentos de una ficha, no a un explorador.
- Alcance: el supervisor solo ve documentos cuyo propietario está a su cargo (`alcance-doc.ts`). Los sensibles (cumplimiento Ley 21.719 y anexos de contrato) se **excluyen en la consulta** (`sensibles.ts`).
- UI reutilizable: `ListScreen`, `Vigencia`, `TipoArchivo`, `Badge`, `ChipsFiltro`, `Buscador`, `Paginacion` de Personas, `HojaSubir` y `VistaPrevia` (`?ver=`) en `apps/web/app/_components/documentos/`.
- Menú: el área Documentos solo tenía `{href:"/documentos/firmas"}`. `ESTADO.md` decía que faltaba el diseño: es incorrecto, el export v4 está en el repositorio y aprobado (corregido en este PR).

## 3. Alcance

**Entra**

- Capacidad de lectura `core.documentos.explorar`: página por cursor, búsqueda por texto en metadatos, filtros (tipo de entidad propietaria, tipo de documento, vigencia), orden, total, entidad propietaria y estado de firma.
- Pantalla `/documentos` fiel al diseño 01: búsqueda, chips de Estado, Tipo y Entidad (más Orden), tabla en md+ y tarjetas en teléfono, estados cargando, vacío, error y sin permisos.
- Entrada de menú «Explorador» (orden 1) y «Firmas» (orden 2) en el área Documentos.
- Subir documento desde el explorador, a nivel **empresa** (reutiliza `HojaSubir`).

**No entra (y por qué)**

- **Fila «Documento restringido»** del diseño: mostrar que existe un documento que el actor no puede ver revelaría existencia (viola la regla de sensibles y la ausencia de enumeración). Queda fuera; la pantalla nunca muestra ni cuenta lo excluido. Decisión a confirmar con Carlos si quiere un contador.
- **Buscar por RUT o por el texto del archivo** (el placeholder del diseño dice «nombre, RUT o texto»): no hay contenido indexado ni el RUT vive en el documento. La búsqueda cubre nombre de archivo, título y etiquetas; el placeholder lo dice así.
- **Chip «Firma»** como filtro y columna «Subido por»: el filtro por firma y el nombre de quien subió exigen más cruces; la columna Firma sí se muestra. Quedan en pendientes.
- Pestañas Vencimientos, Plantillas y Firmas pendientes del diseño: PR siguientes (04, 05–08). La navegación entre ellas es hoy el menú del área.
- **Selector «Vincular a»** de la pantalla 02 (buscar persona, cuenta, instalación…): hoy subir desde el explorador es a la empresa; el resto se sube desde cada ficha.
- Carpetas manuales (B1, descartada por Carlos).

## 4. Arquitectura

`core.documentos.explorar` es una lectura nueva (no cambia `list`, que usan las fichas). Una sola consulta con `AND` de: filtro de sensibles, estado (`disponible`, más `archivado` si se pide), alcance (ids de `documentosEnAlcance`), tipo, entidad propietaria (`vinculos.some{rol:"propietario"}`), texto y vigencia.

- **Vigencia en la consulta.** Depende de los días de alerta de cada tipo, así que se agrupan los tipos por esos días y cada grupo lleva su ventana (`explorar-filtros.ts`); sin tipo, 30 días como `vistaDocumento`. Paginación y total cuentan solo lo que corresponde.
- **Orden estable** (`recientes`, `nombre`, `vence` con nulos al final) con `id` de desempate, para que el cursor no repita ni salte filas.
- **Cursor** = id del último documento. Antes de usarlo se comprueba que **esta misma consulta** lo devolvería: un cursor fuera de alcance, de otro tenant o sensible responde `NOT_FOUND` y no sirve de ancla.
- **Propietario** (`explorar-entidades.ts`): tipo e id siempre; **nombre solo si el actor puede leer ese tipo de entidad** (cuentas, instalaciones y puestos, personas). Sin el permiso, `nombre: null`.
- **Firma**: `pendiente` si hay una solicitud viva, `firmado` si alguna se completó; solo con `core:firmas.read`.
- Sin migración: la búsqueda usa `contains` insensible sobre `nombre` y `titulo` y `has` sobre `etiquetas`, acotada por tenant y alcance. Si el volumen lo pide, un índice trigram es una migración aditiva futura (ver riesgos).

## 5. Archivos

- `packages/capabilities/src/core/documentos/explorar.ts`, `explorar-filtros.ts`, `explorar-entidades.ts`; `index.ts` (registro).
- `packages/capabilities/src/testing/db-memoria-util.ts` (el doble de la base entiende `orderBy {sort, nulls}`).
- Tests: `packages/capabilities/test/documentos-explorar.test.ts`, `alcance-db.test.ts` (caso nuevo).
- Paridad: `packages/capabilities/test/__snapshots__/herramientas-mcp.txt`, `docs/2.0/paridad/mcp-inventario.md`.
- `apps/web/app/(erp)/documentos/page.tsx` y `_componentes/{datos,etiquetas,filas,lista-documentos}.ts(x)`.
- `apps/web/app/_components/documentos/hoja-subir.tsx` (prop `destino`).
- `apps/web/lib/navegacion{,-areas,-entradas}.ts`, `apps/web/test/navegacion-erp-car182.test.ts`, `docs/2.0/NAVEGACION.md`.

## 6. Modelo de datos y migraciones

Ninguna.

## 7. Capacidades

| Id | Efecto | Permiso | Auditoría |
|---|---|---|---|
| `core.documentos.explorar` | lectura | `core:documentos.read` | `auditarLectura`: ids de los documentos de la página y de las personas cuyo nombre se reveló (mismo criterio que `core.documentos.matriz`) |

Entrada: `q`, `entidadTipo`, `tipoId`, `vigencia`, `orden`, `incluirArchivados`, `cursor`, `limite` (1–100, 50 por defecto). Salida: `items` (documento + `entidad{tipo,id,nombre|null}` + `firma|null`), `siguiente`, `total`. Portales `erp` y `supervisor`. `dryRun` no aplica a lecturas. Herramienta MCP generada por el registro (paridad: snapshot e inventario regenerados).

## 8. Interfaz y responsive

- Desktop (1280): tabla Documento · Vinculado a · Tipo · Vigencia · Firma · Subido (fecha). iPad (1024) y vertical: Tipo y Subido se ocultan, como el diseño. Teléfono (375): tarjetas con archivo, nombre, «vinculado · tipo · firma» y vigencia.
- Búsqueda instantánea (`?q=`), chips Estado, Tipo, Entidad y Orden por URL, paginación Anterior/Siguiente con «1–50 de N».
- La fila abre la vista previa (`?ver=`) sin perder búsqueda, filtros ni página.
- Textos de entidad por el vocabulario de la vertical; sin hex ni elementos crudos; archivos de ≤150 líneas.
- Sin permiso: mensaje estándar del DS (sin nombrar a ninguna persona, nota del README del export).

## 9. Seguridad y tenant

- Alcance (ADR-022) y sensibles se aplican en la consulta, no en la pantalla. El tenant sale de la sesión; RLS por tenant sigue activa.
- No se revela existencia de lo excluido: ni filas «restringidas» ni contadores. El `total` cuenta solo lo visible.
- El cursor se valida con la misma consulta.
- Nombres de entidades solo con el permiso de leer ese tipo; los nombres de personas quedan en la auditoría de la lectura (ids, nunca el nombre ni el nombre de archivo).
- La entrada de URL de la pantalla es del usuario: filtros inválidos se ignoran, no llegan a la capacidad.
- Subir desde el explorador exige `documentos.manage` y se oculta al rol supervisor (la empresa no está en su alcance; la capacidad igual lo rechazaría).

## 10. Casos límite

Búsqueda sin resultados (estado «Sin resultados», distinto del vacío); tenant sin documentos (vacío con acción de subir); documentos sin tipo (alerta de 30 días); sin vencimiento (se ordena al final con «Vencen primero»); archivados fuera salvo petición; un propietario sin permiso de lectura (solo el tipo); cursor viejo o ajeno (error, no página vacía); filtro de URL inválido (ignorado).

## 11. Plan por bloques

1. `documentos: capacidad core.documentos.explorar` (+ tests, paridad).
2. `documentos: Explorador como primera entrada del área` (+ test del menú y `NAVEGACION.md`).
3. `documentos: pantalla /documentos`.
4. `docs: brief, ESTADO y corrección del diseño`.

## 12. Tests

- `documentos-explorar.test.ts` (en memoria): búsqueda, filtros y vigencia con días de alerta por tipo, paginación por cursor en los tres órdenes, cursor inválido, nombre oculto sin permiso, `documentos.read` requerido, auditoría de ids, firma.
- `alcance-db.test.ts` (base real): supervisor acotado, otro tenant, cursor fuera de alcance, owner y llave de agente.
- Menú: orden, `exacta`, permisos por entrada. Paridad: snapshot e inventario.

## 13. Validación

`pnpm typecheck && pnpm lint && pnpm test`; `pnpm test:db` en CI (en la sesión del constructor no hubo base); `pnpm --filter @opai/web build` y `pnpm presupuesto`. Capturas a 375, 1024 y 1280 px en `test.opai.cl` tras el despliegue (QA).

## 14. Criterios de aceptación

1. `/documentos` lista los documentos del tenant con búsqueda, filtros y paginación por cursor.
2. Cada fila muestra a qué entidad pertenece, su vigencia y su firma.
3. Un supervisor ve solo documentos de sus instalaciones; nadie ve sensibles ni nada de otro tenant.
4. El MCP expone `core.documentos.explorar` con la misma lógica; paridad en verde.
5. El menú del área Documentos trae Explorador y Firmas, cada uno activo solo en su ruta.
6. CI en verde; `ESTADO.md` actualizado.

## 15. Riesgos y rollback

- **Búsqueda sin índice:** `contains` insensible recorre los documentos del tenant. Aceptable para miles; con decenas de miles de filas conviene un índice trigram (migración aditiva futura). Rollback: revertir el PR; no hay datos migrados.
- **`vigencia` por grupos de tipos:** si el catálogo trajera muchos valores distintos de días de alerta, la consulta crece (hoy son pocos).
- **Total en cada página:** un `count` extra por consulta; sin problema a este volumen.
- **Subida a empresa desde el explorador** puede sorprender: la hoja lo dice en su descripción.

## 16. Reporte de ejecución

Ver el PR y «CAR-182 · PR 4» en `ESTADO.md`.
