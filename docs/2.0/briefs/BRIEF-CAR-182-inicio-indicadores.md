# BRIEF CAR-182 · Indicadores de Inicio (PR 3b de 4)

## 1. Objetivo
Mostrar en Inicio cuatro indicadores del negocio, con el diseño aprobado de Claude Design (sección «Indicadores»), y exponerlos al MCP con la misma capacidad.

## 2. Estado actual (verificado)
Ninguno existe tal cual. Existen piezas: `pauta.resumen.leer` (mensual), `comercial.negocios.list` (paginada, no suma), `finanzas.ventas.libro_resumen` (mes completo, sin corte), `tickets.tickets.listar` (paginada, no cuenta). `cpqAprobacion` se cuenta en `core.resumen.contadores`. `KpiTile` ya está en `@opai/ds`.

## 3. Alcance
1. Cobertura de hoy: programados, cubiertos, sin cubrir (PPC) y %.
2. Negocios abiertos: cantidad y valor mensual en CLP y en UF; cotizaciones por aprobar (aprobaciones de margen pendientes).
3. Facturado del mes: neto del 1 al día de hoy contra el mismo tramo del mes anterior.
4. Tickets: asignados al usuario y, con `ver_todos`, abiertos de la empresa.

Fuera de alcance: gráficos, series históricas, personalización de tarjetas.

## 4. Arquitectura
Una capacidad fina `core.inicio.indicadores` (`permiso: null`) que ensambla un bloque por indicador (`core/panel/indicadores/*.ts`, un archivo cada uno). Cada bloque devuelve `null` si falta el permiso, el módulo no está activo o la key no tiene el scope. `core` no importa módulos: lee con `ctx.db` (como `core.resumen.contadores`).

## 5. Archivos
`packages/capabilities/src/core/panel/indicadores.ts` y `indicadores/{fechas,pauta,comercial,facturacion,tickets}.ts`; registro en `panel/index.ts`. UI: `apps/web/app/(erp)/_componentes/{indicadores-inicio.tsx,indicadores-armar.ts}` y `inicio.tsx`.

## 6. Modelo de datos y migraciones
Ninguna.

## 7. Capacidades
`core.inicio.indicadores` (lectura, sin dryRun, sin IDs que auditar: `auditarLectura: () => []`). Herramienta MCP `core_inicio_indicadores`; instantánea e inventario de paridad actualizados.

## 8. Interfaz y responsive
Grilla de `KpiTile`: 2 columnas en teléfono, 4 desde lg. Si no hay ninguna tarjeta o la consulta falla, no se pinta nada y los pendientes siguen.

## 9. Seguridad y tenant
Tenant de la sesión; permisos: `pauta:read`, `comercial:negocios.read`, `cpq:aprobar`, `finanzas:read`, `tickets:tickets.ver` (+ `tickets:tickets.ver_todos` para el total). Pauta aplica el alcance por filas (instalaciones y puestos). **Negocios y facturas no tienen alcance por filas hoy** (igual que sus capacidades de lectura): quien tiene el permiso ve el total de la empresa. Tickets: sin `ver_todos` solo ve los suyos.

## 10. Casos límite y decisiones tomadas (reversibles)
- Negocios en UF: el negocio guarda CLP mensual; se convierte con la última UF publicada. Sin UF, se muestra en CLP. Valor = cotización vigente o, si no hay, el estimado. No ponderado por probabilidad.
- Facturado: neto, sin borradores ni rechazados; las notas de crédito restan. Mes anterior acotado a su largo (31-mar vs. 28-feb).
- «Abierto» en tickets = `abierto` y `en_curso` (no cuenta `resuelto`).
- Cotizaciones por aprobar = aprobaciones de margen pendientes (no incluye envíos de propuesta).
- «Hoy» = fecha civil de America/Santiago.

## 11. Plan por bloques
1) fechas y bloques de capacidad; 2) capacidad y paridad; 3) UI; 4) ESTADO y brief.

## 12. Tests
Cortes de fecha y conversión UF (`inicio-indicadores-fechas.test.ts`), armado de tarjetas (`indicadores-armar.test.ts`), paridad (instantánea e inventario).

## 13. Validación
`pnpm typecheck && pnpm lint && pnpm test`; revisión independiente.

## 14. Criterios de aceptación
Cada tarjeta aparece solo con su permiso y módulo; sin UF cae a CLP; el MCP lista `core_inicio_indicadores`; gate en verde.

## 15. Riesgos y rollback
`cargarMes` carga el mes entero para quedarse con hoy (4 consultas + feriados): aceptable para una vez por visita; si pesa, se cachea. Rollback: quitar `<IndicadoresInicio />`.

## 16. Reporte de ejecución
Ver el PR.
