# Revisión de CAR-100 contra el alcance aprobado

**Fecha:** 8-nov-2026 · **Solo lectura:** se revisó la descripción de Linear de CAR-100 («Ola 3 · Turnos pedidos y puestos temporales cobrables») contra el alcance aprobado. No hay código ni pantallas.

## Alcance aprobado (referencia)
1. **Un estado por persona** (la misma ficha en el tiempo, con historial; ver BRIEF-CAR-96 §16).
2. **Extras con aprobación** (Operaciones, RR. HH., gerente y admin; el supervisor solo registra).
3. **Solo se cobra al cliente lo pedido por él fuera de su pauta, y es cobrable.**
4. **El reemplazo de una ausencia lo asume Gard: nunca se cobra.**

## Veredicto
La descripción de CAR-100 es **coherente** con 3 y 4 («solo se cobra lo que pide fuera de su pauta; los reemplazos por faltas los asume la empresa», A11 y C17) y con 2 (depende del registro y aprobación de turnos extra). **No toca el modelo de personas (1).** Quedan cuatro puntos por decidir antes de un brief; ninguno se asume.

## Puntos abiertos
1. **Pagable ≠ cobrable.** CAR-96 paga al guardia todo reemplazo (A5); CAR-100 cobra solo lo pedido por el cliente. Propuesta: un turno extra lleva un **origen** (`ausencia` o `solicitud_cliente`); **solo `solicitud_cliente` es cobrable**, y `ausencia` nunca, aunque se pague al guardia.
2. **«Puesto temporal» (A12).** La descripción dice que un guardia adicional por un día «crea un puesto temporal con cobro». El alcance aprobado no nombra ese objeto. Con el modelo actual un puesto ya tiene vigencia, así que sería un puesto de un día; confirmar si es eso o solo un registro cobrable sin puesto.
3. **Tarifa (C16).** Debe salir de la línea «guardia adicional» de la cotización vigente en CPQ. Hoy CPQ tiene líneas de tipo `puesto`, `item` y `adicional` (`modules/cpq/capabilities/esquemas.ts`), sin una línea específica de «guardia adicional» por día. Confirmar si es la de tipo `adicional` o una nueva.
4. **«Finanzas factura desde ese registro sin digitar».** Fuera de lo pedido hoy: sin pagos ni facturación en esta etapa. Queda como etapa posterior de Finanzas > Ventas.

## Dependencias y estado
Depende de CAR-96 (registro y aprobación de turnos extra, **espera diseño aprobado en Claude Design**) y de CPQ. **Sin diseño aprobado no se crean pantallas ni código.** Siguiente paso concreto: que Carlos (u OPAI 2.0 con su delegación) decida los puntos 1 a 3; con eso se escribe el brief de CAR-100 como adenda del de CAR-96.
