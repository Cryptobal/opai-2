# BRIEF CAR-326 — Importar las cotizaciones de OPAI 1

## 1. Objetivo
La importación de Comercial dejó fuera las cotizaciones (221 en Gard) con el motivo «exportación CPQ incompleta». Era un error: el exportador de OPAI 1 (solo lectura) ya entrega la cotización completa. Este bloque las trae a OPAI 2 sin tocar OPAI 1.

## 2. Estado actual (verificado)
- OPAI 1 exporta cotizaciones ganadas y vigentes con puestos, parámetros y fechas (decimales como texto, fechas ISO).
- OPAI 2 modela `cpq.cotizaciones` → versiones → secciones → líneas; el negocio es obligatorio.
- El importador creaba cuentas, contactos, instalaciones, programaciones y negocios; las cotizaciones se omitían por diseño.

## 3. Alcance
Entra: código, título, estado, moneda, vigencia, venta mensual, meses, modo de margen y los puestos (nombre, posiciones, horario, días, sueldo base, AFP, salud). Una versión (la número 1) por cotización.
No entra: costos de uniformes, exámenes, comidas, vehículos, infraestructura y líneas adicionales (2.0 no los modela igual); se cuentan y quedan como aviso `cotizacion_con_costos_sin_modelo`. No se recalcula ningún precio.

## 4. Reglas
- Solo entra si su negocio entra (crear, sin cambios o actualizar). Si no: omitida con `sin_negocio` o `negocio_no_importado`.
- Estados: aprobada/aceptada/ganada/activa → aceptada; enviada/vista → enviada; rechazada → rechazada; el resto → borrador.
- Una sola vigente por negocio: la ganada y, si no hay, la más reciente que no esté rechazada.
- Sin responsable (`creado_por_id` es obligatorio) no se crea: se omite con `sin_responsable`. Con el código ya usado en 2.0: `codigo_ya_existe`.
- Se reconoce por su id de OPAI 1 (`core.ids_externos`): repetir la importación no duplica.

## 5. Reversión
`cotizacion` se borra antes que el negocio. Se niega si alguien creó una versión nueva, una propuesta técnica o un enlace compartido sobre ella. Un negocio con cotizaciones propias de 2.0 sigue sin poder borrarse.

## 6. Modelo de datos
Sin migración.

## 7. Capacidades
`comercial.importar_1_0` suma `aplicadas.cotizaciones` a su resultado; la lista de herramientas MCP no cambia.

## 8. Archivos
`packages/db/scripts/importar-opai1/`: `origen-cotizaciones.ts`, `cotizaciones-tipos.ts`, `cotizaciones-plan.ts`, `aplicar-cotizaciones.ts` (nuevos); `plan.ts`, `aplicar.ts`, `corridas.ts`, `revertir*.ts`, `etiquetas-propuestas.ts` (extraído de `plan.ts` por el tope de 150 líneas).

## 9. Seguridad y tenant
Todo corre con `enTransaccion(tenantId)` y RLS; prueba con dos empresas.

## 10. Tests
`cotizaciones-plan.test.ts` (puro) y `cotizaciones-db.test.ts` (Postgres real: guarda, no duplica, una vigente, sin responsable, revierte, se niega si hay versión nueva).

## 11. Riesgos y rollback
La importación real en Gard **no se corre en este PR**: requiere el OK de Carlos tras ver la simulación. Rollback: revertir la corrida desde el registro de corridas.
