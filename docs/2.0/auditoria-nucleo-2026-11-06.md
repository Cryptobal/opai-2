# Auditoría de salud del Núcleo — 6-nov-2026

**Estado:** plan (borrador). Los resultados se agregan en este mismo archivo, dentro de este PR.
**Encargo:** Carlos, sesión «Núcleo · Code» · **Issue:** CAR-225 · **Base:** `main` en `d4fc6ac` (#364).
**Alcance:** solo auditoría. Este PR no corrige código bloqueante; propone un PR por tema, en orden de riesgo.

## Plan

Método: el código de `main` manda sobre los documentos. Cada hallazgo lleva archivo, gravedad (**bloqueante**: seguridad, RLS, permisos, datos; o **no bloqueante**), propuesta y el issue de Linear existente, o uno nuevo propuesto con su módulo.

| # | Eje | Qué se comprueba | Cómo |
|---|---|---|---|
| 1 | Seguridad y datos | Toda tabla con `tenant_id` tiene FORCE RLS y la política `tenant_isolation`; `opai_app` sin BYPASSRLS; cada capacidad con permiso y alcance; lecturas sensibles auditadas (NÚCLEO-H); secretos fuera del código | Migraciones y `packages/db/test/rls-nucleo*.test.ts`; catálogo de capacidades; `docs/2.0/briefs/NUCLEO-H-lecturas.md`; búsqueda de secretos y de `dbAdmin`, `$queryRaw` y `process.env` fuera de lo permitido |
| 2 | Paridad agent-first | Cada pantalla del Núcleo tiene su capacidad y su herramienta MCP; lo que se hace en pantalla y no por MCP, y al revés (escrituras sin UI) | `paridad-excepciones.ts`, `paridad-entradas.ts`, `paridad-inventario.test.ts`, `docs/2.0/paridad/mcp-inventario.md`, instantánea de `tools/list` |
| 3 | Núcleo vs módulo | Imports cruzados fuera de las dependencias declaradas; lo de un solo módulo metido en el Núcleo; lo compartido que vive en un módulo | Manifests de `modules/*`, imports de `modules/*` y `packages/*`, ubicación de las capacidades |
| 4 | Pendientes y salud | Pendientes del Núcleo en `ESTADO.md` que siguen abiertos; código muerto ya listado; tests rojos o flakes que tocan el Núcleo | `ESTADO.md`, `auditoria-2026-11.md` §5, ejecución de `pnpm test` y revisión de los últimos runs de CI de `main` |
| 5 | Rendimiento | Rutas del Núcleo sobre su tope de consultas (ADR-045, ≤ 8 por navegación) o de JS (ADR-037) | `apps/web/presupuesto-js.json` contra la medición, y consultas por navegación en las rutas del Núcleo |

**Fuera de alcance (se anotan para su sesión, no se tocan):** Personas (ficha), Operaciones · Puestos, Comercial, Finanzas, Rendiciones, Asistencia y Plataforma.

**Entrega:** este archivo con resultados por eje, tabla de hallazgos, lista de PR propuestos por tema (orden de riesgo) y los issues de Linear existentes o propuestos. Lo trivial y sin riesgo (docs, código muerto) puede ir en un PR de pendientes aparte. Cierra con la revisión final sobre el head (SHA completo) y `ESTADO.md` actualizado.

**Reglas que se respetan:** migraciones solo aditivas con `migracion-pendiente` (las aplica el bot «OPAI 2.0»); `main` se trae con merge, nunca rebase ni force-push; dudas al bot con comentario `@opai-2.0:` en el PR. La revisión visual no aplica: el PR no trae cambios visuales.
