# BRIEF CAR-305 · Catálogo de indicadores de gestión en el Núcleo

Sesión Desempeño · 11-nov-2026 · rama `brief/car-305-catalogo-indicadores` · ADR-094 · alcance aprobado en `docs/2.0/diseño/alcance-desempeno.md`.

## 1. Objetivo

Que cada módulo de OPAI pueda **publicar indicadores de gestión** (qué se mide, en qué unidad, a quién se le atribuye y cómo se calcula) y que el Núcleo los ofrezca como un catálogo único, medible por período. Es la base del módulo Desempeño: el scorecard por cargo (CAR-306) elige indicadores de este catálogo; no calcula nada por su cuenta.

## 2. Estado actual (verificado en `main` `aafbd36`)

- No existe un catálogo de indicadores. `core.inicio.indicadores` (CAR-182) entrega las tarjetas del Inicio: son totales de la empresa, no mediciones por persona ni por período, y no se reutiliza.
- Los manifiestos (`defineModule`) declaran permisos, capacidades, navegación, eventos, ajustes y `tarjetas`; no tienen dónde declarar indicadores.
- **Usuario y Persona no están unidos.** El responsable de un negocio o de una tarea es un usuario (membership); el cargo vive en el vínculo laboral de una Persona. Por eso cada indicador declara a quién atribuye (`sujeto`), y la unión entra en CAR-314.
- PR #508 (Sesión Comercial, reportes) está abierto: este bloque **no toca archivos de Comercial**.

## 3. Alcance

Entra: contrato del indicador, validación en el manifiesto, cálculo puro de logro, semáforo y período, dos capacidades de lectura del Núcleo y un primer indicador real del Núcleo («Tareas cumplidas a tiempo»).

No entra: scorecard por cargo, metas y pesos guardados (CAR-306); jefatura y unión usuario–Persona (CAR-314); indicadores de Comercial, Personas, Operaciones y Finanzas (CAR-308 a 311); indicadores propios por empresa (CAR-313); pantallas (CAR-307). Sin tablas nuevas y sin cambio visual.

## 4. Arquitectura

- `packages/domain/src/indicadores-gestion/`: definición declarativa y reglas puras (logro con tope 1,2; semáforo en 1 y 0,85; período mensual en la zona de la empresa; cuándo una tarea cuenta y cuándo se cumplió a tiempo).
- `packages/capabilities/src/indicadores-gestion.ts`: `defineIndicador` y el tipo `IndicadorGestion` (definición + `permiso` + `medir(ctx, consulta)`).
- `ModuleManifest.indicadores`: cada módulo declara los suyos; `defineModule` valida al cargar (id `<modulo>.<nombre>`, sin repetidos, permiso del propio módulo y declarado, meta sugerida válida).
- `core/indicadores-gestion/`: el catálogo junta los del Núcleo con los de los módulos registrados y filtra por módulo activo y por scope del agente.

## 5. Archivos

Nuevos: `packages/domain/src/indicadores-gestion/{definicion,logro,periodo,tareas,index}.ts` y su test; `packages/capabilities/src/indicadores-gestion.ts`; `packages/capabilities/src/core/indicadores-gestion/{comun,esquemas,catalogo,medir,tareas-a-tiempo,index}.ts`; `packages/capabilities/test/indicadores-gestion.test.ts`, `indicadores-gestion-tareas.test.ts` e `indicadores-gestion-db.test.ts`.

Tocados: `packages/capabilities/src/{module,index}.ts` y `core/index.ts`; `packages/domain/src/{index,permisos-catalogo,permisos-patrones}.ts`; instantáneas `herramientas-mcp.txt`, `mcp-inventario.md` y `lecturas-registro.test.ts.snap`; etiquetas de auditoría (`etiquetas-recursos.ts`, `etiquetas-verbos.ts`) y de la matriz de permisos (`usuarios/_permisos/etiquetas.ts`); `core/crm/actividades-alcance.ts` (se extrae `veNegocios`, sin cambio de conducta).

## 6. Modelo de datos y migraciones

Ninguna. El catálogo vive en el código (manifiestos) y la medición lee tablas existentes.

## 7. Capacidades

| Capacidad | Qué hace | Permiso |
| --- | --- | --- |
| `core.indicadores_gestion.catalogo` | Lista los indicadores disponibles para la empresa (módulos activos), con tipo, unidad, sentido, a quién se atribuye, meta sugerida y si el actor puede medirlo. Sin base de datos. | `core:indicadores_gestion.read` |
| `core.indicadores_gestion.medir` | Mide un indicador en un período mensual (`AAAA-MM`, por defecto el mes en curso en la zona de la empresa) y devuelve, por cada sujeto con hechos en el mes, su valor y el logro contra la meta (la pedida o la sugerida). Entrega de a 200 sujetos por respuesta (`siguiente` → `despuesDe`). | `core:indicadores_gestion.read` **y** el permiso del módulo dueño del indicador |

Permiso nuevo `core:indicadores_gestion.read`: lo tienen owner, admin y gerente; se le niega a viewer; supervisor no lo recibe (su lista es cerrada). Ambas quedan como herramientas MCP y en `/api/v1`.

Indicador del Núcleo: `core.tareas_a_tiempo` (porcentaje, mayor es mejor, sujeto usuario, meta sugerida 90, permiso `core:actividades.read`). Cuenta las tareas con vencimiento dentro del período por cada responsable, sin las canceladas ni las pendientes que todavía tienen plazo. A tiempo = terminada antes de la hora de vencimiento; si la tarea es de todo el día, hasta el final de ese día en la zona de la empresa. Quien no puede ver negocios (Comercial apagado, fuera del scope de la key o sin su permiso) no mide las tareas ligadas a un negocio, igual que en las listas de actividades.

## 8. Interfaz y responsive

Sin pantallas. El diseño aprobado (`docs/2.0/design/export-desempeno/`) se construye en CAR-307.

## 9. Seguridad y tenant

- Todo por `ctx.db` (`forTenant`), sin SQL crudo. La medición nunca recibe el tenant por input.
- Un indicador de un módulo apagado, o fuera del scope de la key, responde `NOT_FOUND` (no se revela que existe).
- Sin el permiso del módulo dueño: `FORBIDDEN`. El permiso del catálogo no abre datos de otros módulos.
- Un actor con alcance de filas (supervisor, cliente, trabajador) solo se mide a sí mismo y en indicadores atribuidos al usuario; pedir a otro responde `FORBIDDEN`.
- La medición devuelve gestión por persona: es **lectura auditada** (`auditarLectura`), registra solo los ids medidos, nunca los valores.
- Las mediciones de sujetos no pedidos se descartan aunque el indicador las devuelva.
- La salida y el registro de la lectura están acotados a 200 sujetos por respuesta; se audita solo la página entregada.
- **«Cada persona ve lo suyo» todavía no está abierto:** supervisor y viewer no tienen el permiso del catálogo, así que hoy solo miden owner, admin y gerente (y quien reciba el permiso por rol personalizado o excepción). La vista propia y la del equipo a cargo llegan con la jefatura por cargo (CAR-314) y las pantallas (CAR-307).
- El catálogo y la medición quedan en el Núcleo, disponibles para toda empresa (ADR-094 §1); lo que se vende aparte es el módulo Desempeño (scorecard, metas, cierre y pantallas).

## 10. Casos límite

- Sujeto sin hechos en el período: no hay fila (o valor `null` y logro `null`); nunca un 0 % injusto.
- Indicador «menor es mejor» con valor 0: logro en el tope.
- Meta 0 o negativa: se rechaza en el borde. Meta sobre 100 en un indicador de porcentaje: se rechaza.
- Pendiente que vence más adelante en el mes en curso: no cuenta hasta que vence.
- Valor negativo en un indicador «menor es mejor»: hoy el logro da 0; ningún indicador lo produce y se define antes de los indicadores de montos (CAR-308).
- Período inválido (`2026-13`): error de validación. Cambio de hora: el rango se calcula con la zona de la empresa.
- Tarea con varios responsables: cuenta para cada uno.

## 11. Plan por bloques

1. `core:` dominio de indicadores de gestión (definición, logro, período, tareas) con tests.
2. `core:` `defineIndicador`, manifiesto, catálogo, medición e indicador de tareas a tiempo, con tests, paridad y etiquetas de auditoría.
3. `docs:` este brief y `ESTADO.md`.

## 12. Tests

- Dominio (19): validación de definiciones, logro en ambos sentidos y tope, semáforo, rango mensual en Santiago con cambio de hora, tareas a tiempo, porcentaje sin base.
- Capacidades con contexto falso (17): validación del manifiesto, catálogo por módulo activo y scope, `puedeMedir`, permisos, alcance, auditoría, filtro de sujetos, paginación de 200, meta de porcentaje, pendiente con plazo, tareas ligadas a negocio sin acceso a Comercial.
- Base real (3, `pnpm test:db`): dos empresas con la misma usuaria; cada una ve solo sus tareas; pedir un usuario de otra empresa no revela nada; la auditoría queda en la cadena de la empresa correcta con ids y sin valores.

## 13. Validación

`pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm build`. Sin cambio visual: `preview-e2e` no es condición. Tras integrar: `tools/list` de `test.opai.cl` muestra las dos herramientas nuevas.

## 14. Criterios de aceptación

- Un módulo declara un indicador en su manifiesto y aparece en el catálogo sin tocar el Núcleo.
- Un manifiesto con un indicador mal declarado falla al cargar, con el motivo.
- El catálogo solo muestra indicadores de módulos activos para esa empresa.
- La medición respeta empresa, permiso del módulo dueño y alcance, y queda auditada.
- Las dos capacidades existen como herramientas MCP; el gate de paridad pasa.

## 15. Riesgos y rollback

- Riesgo bajo: sin migración y sin pantallas; revertir el PR deja todo como estaba.
- Rendimiento: el indicador de tareas hace 2 consultas por medición (tareas del período y sus responsables, por lotes de 5.000), 3 si el actor no puede ver negocios, más la zona horaria de la empresa. Con muchas tareas por mes conviene agregar en base de datos; queda anotado para CAR-322 (cierre de período).
- Deuda conocida: el sujeto `usuario` no tiene cargo hasta CAR-314.

## 16. Reporte de ejecución

Se completa en el PR.
