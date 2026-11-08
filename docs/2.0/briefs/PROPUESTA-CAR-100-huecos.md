# PROPUESTA — CAR-100 · cierre de los cuatro huecos (para decidir)

**Estado:** propuesta para decidir, solo documentación. No hay pantallas ni código: CAR-100 depende de CAR-96 (turnos extra), que espera su diseño aprobado en Claude Design. **Sin Gard real, sin migraciones, sin pagos ni facturación en esta etapa.** Parte de la revisión de CAR-100 contra el alcance aprobado (`referencias/revision-car-100-alcance.md`, PR #402) y no la repite.

**Alcance aprobado (referencia):** un estado por persona; extras con aprobación; solo se cobra lo pedido por el cliente fuera de su pauta; el reemplazo de una ausencia lo asume Gard.

## 1. Pagable ≠ cobrable
- **Problema.** CAR-96 paga al guardia todo reemplazo o refuerzo (A5); CAR-100 cobra solo lo pedido por el cliente fuera de pauta.
- **Propuesta (recomendada).** Cada turno extra lleva `origen` (`ausencia` | `solicitud_cliente`). **Cobrable solo si `origen = solicitud_cliente`**; `ausencia` nunca, aunque se pague al guardia. `cobrable` se **deriva** del origen, no se digita (evita el cobro por error).
- **Alternativa descartada.** Un check libre «cobrable»: permite cobrar una ausencia por descuido.
- **Efecto.** Un campo y una regla de dominio en `pauta.turnos_extra` (brief de CAR-96); nada nuevo para CAR-206/207.

## 2. «Puesto temporal» (A12)
- **Problema.** Un guardia adicional por un día «crea un puesto temporal con cobro»; el alcance aprobado no nombra ese objeto.
- **Propuesta (recomendada).** **No crear un objeto nuevo:** la solicitud del cliente es un registro cobrable que **referencia un puesto existente con vigencia de un día** (el puesto ya tiene `vigente_desde/hasta`, un puesto = una posición). Se crea con la misma acción de Puestos y queda `inactivo` al vencer. Así Pauta y Asistencia lo tratan como cualquier puesto.
- **Alternativa.** Registro cobrable sin puesto: más simple, pero la Pauta no lo vería como cobertura. Se descarta salvo que Carlos prefiera no tocar Puestos.
- **Pendiente de Carlos.** Confirmar que «puesto temporal» = puesto de un día.

## 3. Tarifa desde CPQ (C16)
- **Hecho verificado.** CPQ tiene líneas `puesto`, `item` y `adicional` (`modules/cpq/capabilities/esquemas.ts`) con `recurrencia` `mensual` o `unico`; cada línea guarda la copia del ítem usado (R15) y el precio de una cotización no cambia después.
- **Propuesta (recomendada).** Un **ítem de catálogo «Guardia adicional»** con unidad «día», usado como línea `adicional` de la cotización vigente. **La tarifa de CAR-100 es el precio de venta unitario de esa línea.** Sin línea en la cotización vigente, la solicitud **no se puede registrar como cobrable** (error claro), nunca se inventa una tarifa.
- **Pendiente de Carlos.** Confirmar que sirve la línea `adicional` (con ítem en unidad día) y no un tipo nuevo.

## 4. Facturación posterior
- **Propuesta.** Fuera de esta etapa. CAR-100 deja el registro **listo para facturar** (cliente, instalación, fecha, cantidad y tarifa congelada) y **nada más**: ni borrador de factura ni cobro. Finanzas > Ventas lo toma después, sin digitar. Se define en su propio brief con Finanzas.

## Casos de aceptación sintéticos (para cuando existan CAR-96 y CAR-100)
Datos inventados, dos empresas, sin pagos. No duplican `puestos-aceptacion-db.test.ts` (CAR-206/207).

| Id | Caso | Resultado esperado |
|---|---|---|
| H1 | Reemplazo de una **ausencia** aprobado. | Se paga al guardia; **no es cobrable** y no aparece en lo facturable. |
| H2 | **Solicitud del cliente** fuera de pauta, aprobada. | Cobrable, con la tarifa de la línea «guardia adicional» de la cotización vigente. |
| H3 | Solicitud sin línea «guardia adicional» en la cotización vigente. | Se rechaza con mensaje claro; no se cobra nada. |
| H4 | Cambia la cotización después. | La tarifa del turno ya registrado no cambia (queda congelada). |
| H5 | El supervisor registra; Operaciones aprueba; nadie aprueba lo propio. | Solo aprobado es cobrable. |
| H6 | Otra empresa pide o lista esos registros. | «No encontrado»; ninguna ve datos de la otra. |
| H7 | Viewer. | Lee, no escribe. |
| H8 | Puesto de un día vencido. | Queda inactivo; no genera cobertura ni cobro después. |

## Dependencias y siguiente paso
CAR-96 (diseño aprobado) → CAR-100 (esta propuesta decidida) → brief de CAR-100 como adenda del de CAR-96 → Finanzas > Ventas (facturación). **Siguiente paso concreto:** que Carlos u OPAI 2.0 confirmen por comentario los puntos 1 a 3 (recomendados arriba); con eso se escribe el brief.
