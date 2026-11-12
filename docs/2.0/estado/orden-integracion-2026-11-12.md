# Orden de integración propuesto para los PR abiertos (12-nov-2026, 18:30)

Foto de los **25 PR abiertos** (el encargo hablaba de 18; entraron más durante el día y #553 y #560 ya no están abiertos). Es una **propuesta**: este documento no modifica ningún PR. Cada sesión integra los suyos (ADR-060) con las condiciones de `AGENTS.md`.

Regla usada: primero lo que no depende de nadie y destraba a otros; las migraciones, de a una y en orden de fecha; dentro de una cadena, de abajo hacia arriba.

## 1. Migraciones (de a una, en este orden)

| Orden | PR | Migración | Nota |
|---|---|---|---|
| 1 | #561 Desempeño: cierre de período | `20261203100000_desempeno_cierre_periodo` | Base de toda la cadena de Desempeño. |
| 2 | #565 Slack F2 | `20261205100000_core_slack_usuarios` | Ya aplicada en `dev` y `main`. Tiene conflicto con `main` otra vez (archivos generados): traer `main` y regenerar. |
| 3 | #569 Slack F3 | `20261206100000_core_slack_avisos` | Apilado sobre #565. Mismo `slack.prisma`: nunca antes que #565. Ya aplicada. |
| 4 | #568 Personas: indicadores y «Reclutado por» | `20261210100000_core_vinculo_reclutado_por` | Parte de la cadena de Desempeño (ver 2). |
| 5 | #595 Reglas de aprobación | `20261212100000_core_reglas_aprobacion` | Sin choque de `.prisma` con otros. Debe renumerar su ADR (ver 4). |

`main` ya tiene `20261211100000_finanzas_reglas_banco_destino`, de fecha posterior a las de #561, #565, #569 y #568. Las de Slack ya están aplicadas en Neon, así que no se renombran. Las de #561 y #568, si no están aplicadas, deben renombrarse a una fecha posterior antes de aplicarse (A2.5.3).

## 2. Cadenas apiladas (integrar de abajo hacia arriba)

**Desempeño** (el encargo nombraba #561, #566, #553, #560 y #579; la cadena real hoy es más larga):

`#561` → `#566` → `#568` → `#573` → `#576` → `#579` → `#581`

- Cada uno tiene como base la rama del anterior. Están bien apilados.
- #566 tiene conflicto: esperar a #561, traer `main` y regenerar el inventario.
- #576 y #581 son los «indicadores de asistencia» del encargo: #581 está apilado sobre #579, que está sobre #576. No chocan entre sí; solo deben entrar en orden.
- #568, #573, #576 y #579 editan `01-decisiones.md`: revisar que no repitan número de ADR.

**Slack:** `#565` → `#569` → `#575`. Bien apilados. #575 comparte con #565 `etiquetas-verbos.ts`, el inventario y la instantánea MCP: se regeneran al traer `main`.

**CAR-323 (Plataforma):** #572, #577 y #585 tienen base `main` y no están apilados.

- #585 no comparte archivos con los otros dos (salvo `ESTADO.md`). Puede entrar primero: está en verde y con revisión final.
- #572 y #577 comparten `presupuesto-js.json`, la hoja de alcance, el inventario y `embed.ts`. Orden: **#572 primero** (A y B), después #577 (C) trayendo `main`. Los dos tienen conflicto hoy.
- #587 está apilado sobre #577 y comparte con #572 `etiquetas-verbos.ts`, la instantánea de Plataforma y la prueba de auditoría: entra después de #577.

Orden: `#585` → `#572` → `#577` → `#587`.

**Estándares:** #591, #593 y #594 tienen base `main`, pero comparten `REFERENTES-saas.md`, la carpeta de auditoría y `01-decisiones.md`, y los tres usan «ADR-106». Deberían ir apilados: `#591` → `#593` → `#594`. Si es un mismo ADR que crece, está bien; si son tres ADR distintos, hay que renumerar.

## 3. Sueltos (sin dependencias; entran cuando estén en verde)

| PR | Nota |
|---|---|
| #588 Caja: saldo del banco por Web4Leads | No comparte archivos con #589. |
| #589 Caja: saldo llevado a hoy | Toca inventario e instantánea MCP: regenerar al traer `main`. |
| #592 Agente: herramientas a demanda | No comparte archivos con #582. |
| #582 Hilo H3 | Toca `core/panel/**`, igual que #595 (`pendientes.ts` y `contadores.ts` no; solo la carpeta). Sin choque real. |
| #590 Cada portal abre su ingreso | Toca `embed.ts`: regenerar. |
| #586 Filtro «No leídas» en Novedades | Toca `embed.ts`: regenerar. |
| #584 Hilo: reglas y auditoría (borrador) | Reserva ADR-105. |

## 4. Choques de número de ADR

| ADR | Quién lo usa | Qué hacer |
|---|---|---|
| ADR-105 | #584 | Se queda. |
| ADR-106 | #591, #593, #594 (Estándares) y #595 (Núcleo) | Estándares se queda con 106. **#595 pasa a ADR-107.** |
| ADR-108 | Este PR | — |

## 5. Lo que choca en casi todos

- `docs/2.0/ESTADO.md`: lo editan los 25. Desde ADR-108 los PR nuevos no lo tocan; los abiertos, al tener conflicto, mueven su fila a `docs/2.0/estado/`.
- `mcp-inventario.md` (12 PR), instantáneas MCP (9) y `embed.ts` (9): archivos generados. Tomar la versión de `main` y regenerar.

## 6. Qué falta

- Confirmar con cada sesión dueña el orden de su cadena (esta propuesta sale de los archivos y las bases de los PR, no de hablar con las sesiones).
- Renombrar las migraciones de #561 y #568 si todavía no están aplicadas en Neon.
- Poner en Linear las relaciones «blocked by» que reflejen estas cadenas.
- Decidir si se agrega un check de CI que avise cuando dos PR abiertos editan el mismo `.prisma`.
