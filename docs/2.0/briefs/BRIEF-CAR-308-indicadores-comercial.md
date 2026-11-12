# BRIEF CAR-308 · Comercial publica sus indicadores de gestión

Sesión Desempeño · 11-nov-2026 · rama `brief/car-308-indicadores-comercial` (desde `main`; solo depende de CAR-305) · ADR-094.

## 1. Objetivo

Que el scorecard de un cargo comercial tenga con qué medirse: Comercial declara en su manifiesto los indicadores de gestión que salen de sus propios hechos (negocios y solicitudes).

## 2. Estado actual (verificado en `main`)

- El catálogo de indicadores existe (CAR-305) con un solo indicador del Núcleo.
- Comercial ya tiene informes (`comercial.informes.cierre`, que agrupa por responsable, y `comercial.informes.tablero`); lo que falta es publicarlos con forma de indicador (por persona, por mes, con meta) en el catálogo.
- Un negocio tiene **un** responsable (`responsable_id`, un usuario); una solicitud también. El PR #508 de reportes se cerró sin integrar, así que no hay trabajo paralelo sobre estos archivos.
- Una solicitud registra su primera respuesta (`primera_respuesta_en`, CAR-299) y la empresa configura su tiempo objetivo en horas hábiles; el tablero de Comercial ya mide el cumplimiento con esa regla.

## 3. Alcance

Entra: cuatro indicadores, declarados en el manifiesto de Comercial, con prueba contra base real.

No entra: **margen de lo vendido**. Es un dato de CPQ (versiones de cotización, visible solo con permiso de costos); se publica desde el manifiesto de CPQ en un bloque propio, con su regla de qué versión cuenta.

## 4. Indicadores

| Id | Qué mide | Unidad | Mejor | Meta sugerida |
| --- | --- | --- | --- | --- |
| `comercial.ventas_cerradas` | Monto mensual de los negocios que ganó en el período | pesos | más | 5.000.000 |
| `comercial.negocios_ganados` | Cantidad de negocios que ganó | cantidad | más | 3 |
| `comercial.cotizaciones_ganadas` | De los negocios con cotización enviada que se cerraron, % ganado | porcentaje | más | 30 |
| `comercial.solicitudes_a_tiempo` | De las solicitudes atendidas en el período, % con primera respuesta dentro del tiempo objetivo de la empresa | porcentaje | más | 90 |

Reglas tomadas (las dos que la tarea dejaba «por definir»):

- **A quién se atribuye:** al responsable del negocio o de la solicitud al momento de medir. Sin responsable, no cuenta para nadie.
- **Qué fecha manda:** la del hecho que la persona controla: la fecha en que se ganó o se perdió el negocio (no el inicio del servicio) y la fecha de la primera respuesta a la solicitud.
- **Monto:** el mismo de los informes de cierre: valor de la cotización vigente y, si no hay, el estimado.
- **Solicitudes a tiempo:** misma regla que el tablero de Comercial (primera respuesta contra el tiempo objetivo de la empresa, en horas hábiles; sin duplicadas). Si la empresa no configuró tiempo objetivo, no hay medición. Las solicitudes anteriores a CAR-299 no tienen el dato y quedan fuera.
- **Embudos:** los indicadores de negocios suman todos los embudos, igual que el informe de cierre; el tablero mira solo el embudo por defecto, así que en una empresa con más de un embudo los números pueden diferir de esa pantalla.
- **No quedan congelados:** reasignar el responsable o reabrir un negocio cambia el valor de un mes ya medido, hasta que exista el cierre de período (CAR-322).

Todos se atribuyen al **usuario**; el scorecard los cruza con la Persona por la ficha vinculada.

## 5. Archivos

Nuevos: `packages/capabilities/src/comercial/indicadores-gestion.ts`, `packages/capabilities/test/comercial-indicadores-db.test.ts`. Tocados: `modules/comercial/manifest.ts`, `packages/capabilities/src/index.ts`.

## 6. Modelo de datos y migraciones

Ninguna.

## 7. Capacidades

Ninguna nueva: los indicadores se leen con `core.indicadores_gestion.catalogo` y `.medir` (ya son herramientas MCP).

## 8. Interfaz

Sin pantallas.

## 9. Seguridad y tenant

Lecturas por `ctx.db`. Medir exige el permiso del módulo dueño: `comercial:negocios.read` (tres primeros) o `comercial:solicitudes.read` (el cuarto). Con Comercial apagado no aparecen ni se pueden medir.

## 10. Casos límite

- Negocio ganado sin cotización enviada: cuenta en ventas y en ganados, no en «cotizaciones ganadas».
- Persona sin negocios cerrados con cotización: sin fila (no un 0 %).
- Negocio reabierto: deja de estar ganado y sale del indicador.
- Negocio ganado el 1 del mes a las 00:30 de Chile: cae en ese mes (rango en la zona de la empresa).

## 11. Plan por bloques

1. `comercial:` indicadores de gestión y manifiesto, con test de base.
2. `docs:` brief y `ESTADO.md`.

## 12. Tests

Base real (5): catálogo y módulo apagado; ventas y negocios ganados por responsable; cotizaciones ganadas; solicitudes a tiempo con duplicada y empresa sin objetivo; otra empresa. Pendiente: negocio reabierto y borde del mes (cubierto por el rango del núcleo).

## 13. Validación

Gate local y CI. Sin migración ni cambio visual.

## 14. Criterios de aceptación

Cada indicador con prueba de cálculo y visible por MCP (catálogo).

## 15. Riesgos y rollback

Sin migración: revertir el PR lo deshace. Las consultas leen los negocios cerrados del mes (pocos por empresa).

## 16. Reporte de ejecución

Se completa en el PR.
