# BRIEF DE IMPLEMENTACIÓN — 07 COMERCIAL · PR 1 (Negocios y Contactos)

**Repositorio:** `Cryptobal/opai-2` · **Rama de ejecución:** `brief/07-comercial-pr1` (desde `main` actualizado) · **Fecha:** 26-oct-2026 · **Tarea Linear:** CAR-20 (`Fixes CAR-20` en el PR). · **Estado:** **aprobado para ejecución**.

> **Aprobación (textual).** «Sí, aprueba las dos hojas con las recomendaciones y lanza» — Carlos, 26-oct-2026 15:12 CLT, transmitido por el Chief of Staff. Las dos hojas son `docs/2.0/diseño/alcance-crm.md` (alcance del PR 1) y el export de diseño del CRM v3. «Con las recomendaciones» = las 4 respuestas del recuadro «Decide Carlos» del alcance se resuelven con la **opción recomendada**.

> **Reglas:** `AGENTS.md`, `docs/2.0/REGLAS-codigo.md`, ADR-040 (modelo comercial), ADR-041 (fichas), ADR-046 y `NAVEGACION.md` (navegación por áreas), ADR-004/ADR-034 (paridad UI↔MCP), ADR-022 (alcance en la consulta), ADR-045 (rendimiento), ADR-014/ADR-017 (DS 2.0), ADR-037 (presupuesto de JS). **Especificación:** `docs/2.0/modulos/comercial.md` §5–14 (si choca con la Page «Comercial OPAI 2.0: decisiones» del 25-oct, manda la Page; este brief corrige la §14). **Alcance aprobado:** `docs/2.0/diseño/alcance-crm.md`. **Diseño aprobado (referencia visual y funcional):** export v3 de Claude Design hecho con el Design System de OPAI 2.0 V2 (proyecto `09192972-8bd5-4ed8-a86a-3308e220a07b`), en `docs/2.0/diseño/export-crm/`.

---

## 1. Objetivo

Traer de 1.0 a 2.0 la gestión de **negocios** (oportunidades de venta) y de **contactos**, construida sobre las cuentas e instalaciones que ya existen en 2.0. Un negocio pertenece a una cuenta, se vincula a 1..N instalaciones reales de esa cuenta, avanza por un **embudo configurable** y deja **historial de etapas** con los días en cada una. Todo lo que se hace en pantalla también se hace por MCP con vista previa; ganar, si lo pide un agente, se detiene y pide aprobación humana. Es el **PR 1 del Brief 07** del `ROADMAP.md`; el N–N contacto↔cuenta, las etiquetas y la actividad unificada (Brief 06) van en el **PR 2**.

## 2. Alcance (de `alcance-crm.md`)

### Incluido
- **Negocios — embudo** (`/negocios`): tablero por etapas con arrastre, cada columna con su scroll y cabecera fija, scroll horizontal; en el teléfono, lista agrupada por etapa con selector de etapa (una columna a la vez). Filtros por etapa y responsable.
- **Negocios — lista** (`/negocios?vista=lista`): lista con filtros (etapa, responsable, origen, cierre).
- **Ficha del negocio** (`/negocios/[id]`): Resumen, Instalaciones, Contactos e Historial de etapas.
- **Nuevo negocio** (hoja sobre lista/embudo) y edición.
- **Mover de etapa** con requisitos de entrada (monto, fecha de cierre, cotización enviada, inicio de servicio, motivo de pérdida); retroceder entre abiertas siempre se permite; a la primera salida exige ≥1 instalación.
- **Perder** con motivo de un catálogo editable; **reabrir** con motivo; **archivar**.
- **Contactos** (`/contactos` lista y `/contactos/[id]` ficha) sobre el `Contacto` que ya existe en el núcleo (en el PR 1 el contacto sigue perteneciendo a **una** cuenta, `Contacto.cuentaId`).
- **Pestaña Negocios** en la ficha de cuenta (`/cuentas/[id]`) y en la ficha de instalación.
- **Configuración → Módulos → Comercial**: embudo (etapas con tipo, orden, probabilidad, requisitos), catálogos de tipos de negocio, orígenes y motivos de pérdida.
- Cada acción tiene su herramienta MCP con vista previa (`comercial_negocios_*`). Ganar por agente ⇒ aprobación humana.

### Excluido (va en otros PR; `alcance-crm.md` §2)
Solicitudes y su bandeja (PR 2), CPQ y cotizaciones, el N–N contacto↔cuenta (PR 2, cambia el núcleo), actividad unificada y etiquetas (PR 2), reportes y exportación (PR 3), campos personalizados, fusión y transferencia (PR 3), importación y sincronización con 1.0 (PR propio). «Ganar exige cotización enviada» queda **configurado pero apagado** hasta que exista CPQ.

### Ganar sin cotización (decisión de Carlos, 26-oct-2026 15:12 CLT)
Mientras CPQ no exista en 2.0, **se puede ganar un negocio sin una cotización enviada**, pero **solo en el ambiente de prueba (`test.opai.cl`)** y **con un aviso «sin cotización»** en la vista previa y al confirmar. Es la opción recomendada del recuadro «Decide Carlos» punto 1 de `alcance-crm.md`, aprobada por Carlos el 26-oct-2026 15:12 CLT. Esta decisión se mantiene **aunque choque con la Q7 de `comercial.md` §14** (que recomienda exigir cotización en la etapa ganada de Gard): el requisito `cotizacion_enviada` de la etapa ganada queda **configurado pero apagado** hasta que llegue CPQ, de modo que ganar queda habilitado con el aviso. Cuando CPQ exista, el tenant activa el requisito y la exigencia vuelve.

## 3. Modelo de datos y migración

**Una sola migración:** `packages/db/prisma/migrations/20261028210000_comercial_negocios`, schema de Postgres **`comercial`**, toda tabla con `tenant_id`, `created_at`, `updated_at`, IDs `uuid(7)`, columnas `snake_case` por `@map`, RLS `tenant_isolation` para `opai_app` y los `GRANT`/`ALTER DEFAULT PRIVILEGES` del schema nuevo (REGLAS-codigo.md). El `tenant_id` de los modelos nuevos va **sin** `@relation` a `Tenant` (no se toca `core.prisma`): la FK a `core.tenants` se declara en el SQL.

Tablas (según `extraccion/comercial-y-cpq.md` §«comercial»): **Embudo** (`embudos`: nombre, por_defecto; un por_defecto por tenant), **Etapa** (`etapas`: embudo, nombre, orden, `tipo` `abierta`|`ganada`|`perdida`, probabilidad, tono, `exige[]` de `monto`|`fecha_cierre`|`cotizacion_enviada`|`inicio_servicio`|`motivo_perdida`, activa; exactamente una ganada y una perdida por embudo), **Negocio** (`negocios`: cuenta, embudo, etapa, `estado` `abierto`|`ganado`|`perdido` derivado por trigger del tipo de la etapa, título, tipo, origen, responsable, probabilidad, monto_estimado_mensual, valor_mensual + cotizacion_enviada_en de solo lectura, cierre_estimado, inicio_servicio_estimado, motivo_perdida cerrado + detalle + competidor, ganado_en, perdido_en, archivado_en; cuenta inmutable con instalaciones o cotizaciones), **NegocioInstalacion** (`negocio_instalaciones`: negocio, instalación, `tipo` `nueva`|`ampliacion`|`renovacion`|`reemplazo`; único por par; la instalación es de la cuenta del negocio), **NegocioContacto** (`negocio_contactos`: negocio, contacto, `rol` `decisor`|`tecnico`|`compras`|`usuario`, es_principal; único por par; un principal por negocio; el contacto es de la cuenta del negocio), **HistorialEtapa** (`negocio_etapas`: de_etapa, a_etapa, cuando, actor, segundos_en_anterior; append-only) y los **catálogos** por tenant: tipos de negocio, orígenes y motivos de pérdida.

**Siembra por tenant:** un embudo por defecto con **8 etapas** (6 abiertas, 1 ganada, 1 perdida) y los catálogos base. No se copia ningún negocio. Los 8 nombres de etapa salen del embudo de 1.0 de Gard; como el repositorio no los enumera y el MCP de 1.0 no estuvo disponible en esta sesión, se siembran desde la referencia funcional del export (orden y tipos), con la **etapa ganada llamada «Adjudicado»** según la Page de decisiones («ganado = adjudicado»). Carlos ajusta los nombres en Configuración → Comercial sin migración (ver «Riesgos»).

**`maestros.prisma`:** solo se agregan al final de `Cuenta`, `Contacto` e `Instalacion` los campos de **relación inversa** hacia los modelos nuevos (`negocios`, `negocioContactos`, `negocioInstalaciones`). No cambia `Contacto.cuentaId` (el N–N es del PR 2). No se toca `Puesto`.

## 4. Permisos y paridad

- Módulo **`comercial`** (ADR-003/ADR-046). Permisos `comercial:negocios.read`/`.manage`, `comercial:config.manage` (embudo y catálogos: owner y admin), según `comercial.md` §7. Alcance de filas v1: quien tiene Comercial ve **todos** los negocios del tenant (`alcance-crm.md`/§7).
- `packages/domain/src/permisos.ts`: la denegación del **supervisor** pasa de `crm:*` a `comercial:*` (se mantiene `cpq:*`); se alinea `permisos.test.ts` (hoy usa `crm:read`).
- Toda consulta/mutación es una **capacidad** (`defineCapability`): `comercial.negocios.list`/`get`/`embudo`, `create`/`update`, `mover` (aprobación humana solo hacia la ganada), `perder`/`reabrir`/`archivar`, `vincular_instalacion`/`desvincular_instalacion`, `set_contactos`; lectura/edición del embudo y catálogos por `core.config.*`. Cada escritura acepta `dryRun` e `idempotencyKey`; las reales quedan en `core.audit_events`. El gate de paridad (`paridad.test.ts`, snapshot `herramientas-mcp.txt`) queda en verde: cada capacidad produce su herramienta MCP y su `preview_`.

## 5. Interfaz (DS 2.0 en `main`)

Se reproduce fiel el export v3 (pantallas, flujos, estados, textos y jerarquía) **construido con el DS de `main`**: tokens de `packages/ds/src/tokens.css`, componentes de `packages/ds` y el shell 2.0, con la misma estructura que `/cuentas` e `/instalaciones` (`PaginaPortal`, `SplitScreen`, `ListScreen`, `DetailScreen` con pestañas por ruta, `FormScreen`). No se copia el CSS ni el JS del export. Si el export usa un token o componente que no existe en `packages/ds`, se usa el equivalente más cercano y se anota en el PR. El **tablero** (arrastre entre columnas, columnas con scroll propio y cabecera fija; teléfono con una columna por vez) no tiene hoy componente en el DS: se resuelve con primitivas del DS y arrastre nativo, sin dependencias nuevas, respetando ADR-045 y el presupuesto de JS por ruta. Pulido obligatorio de REGLAS-codigo.md (foco, skeleton, vacío con acción, transiciones, contraste AA). Se prueba a 375, 1024 y 1280 px comparando con las capturas del export.

## 6. Orden de entrega (obligatorio)
1. **Commit del brief** (este archivo) + corrección de la §14 de `comercial.md`. Push.
2. **La migración** `20261028210000_comercial_negocios` (schema `comercial.prisma`, SQL con RLS y siembra de las 8 etapas, relaciones inversas en `maestros.prisma`, `permisos.ts`), en **su propio commit**, sin capacidades ni pantallas, con `pnpm test:db` en verde. Push inmediato para la revisión temprana. El PR lleva la etiqueta `migracion-pendiente` (la quita solo Carlos tras aplicar en Neon `dev` y `main`).
3. **Capacidades, MCP y pantallas** del §4 y §5, con el gate completo.

## 7. Tests y gate
- **Dominio:** cálculo de días en etapa, derivación de `estado` por tipo de etapa, validación de requisitos de entrada por etapa, regla «exactamente una ganada y una perdida».
- **Capacidades:** validación, autorización por rol (owner/admin/gerente sí; supervisor/viewer no), auditoría, `dryRun`, idempotencia, y aprobación humana al ganar por agente (contexto falso).
- **Base (`pnpm test:db`):** RLS por tenant en todas las tablas nuevas; triggers (estado por tipo de etapa, un principal por negocio, instalación/contacto de la misma cuenta); siembra idempotente.
- **Paridad** (`paridad.test.ts` + snapshot) y **presupuesto de JS** (ADR-037) en verde; `pnpm mcp:verificar` tras desplegar.
- **e2e** (`pnpm --filter @opai/web e2e`) a 375, 1024 y 1280 px con capturas comparadas con el export.
- Gate local antes de cada push: `pnpm typecheck && pnpm lint && pnpm test` (+ `test:db` por tocar base, + `build`/`presupuesto` por tocar la web). Autorrevisión con un subagente antes del PR.

## 8. Riesgos
- **Nombres de las 8 etapas:** se siembran desde la referencia funcional del export con la ganada = «Adjudicado» (Page de decisiones). Si Carlos quiere los nombres literales de 1.0, los ajusta en Configuración → Comercial sin migración. Se anota en el PR.
- **Tablero sin componente de DS:** arrastre nativo con primitivas del DS; si se necesita un componente nuevo, va al DS con diseño en Claude Design (ADR-017), no al módulo; se reporta.
- **Migración pendiente:** la pantalla no funciona hasta que Carlos aplique la migración en Neon `dev` y `main` y quite `migracion-pendiente`.

## 9. Reporte de ejecución
Al cerrar: commits, capturas 375/1024/1280 comparadas con el export, resultado de `test:db`, `e2e`, presupuesto de JS y `tools/list`, migración por aplicar, y resumen ejecutivo para Carlos (qué se hizo, qué cambia para Gard, qué decide él, qué sigue).

### Estado de los criterios del alcance del §2

- Embudo visual, filtros completos, creación y edición por pantalla, transiciones por pantalla y editor visual de configuración: **parciales**, pendientes del PR 1b; las capacidades existentes no sustituyen esas pantallas.
- Lista y ficha de negocios y contactos, pestañas de negocios en cuenta e instalación: implementadas; quedan pendientes los 404 reales de las fichas y la evidencia visual señalada en `ESTADO.md`.
- Capacidades y MCP, vista previa y aprobación al ganar: implementados; la verificación de `tools/list` en el servidor queda para después del despliegue.
- Alcance de negocios y nombres de contactos en la ficha: pendientes de revisión según los riesgos documentados en `ESTADO.md`; la lista de contactos sí aplica `dondeContacto`.
