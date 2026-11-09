# CAR-100 · cierre de los cuatro huecos (decidido por Carlos el 9-nov-2026)

**Estado:** decisión de Carlos registrada, solo documentación. No hay pantallas ni código: CAR-100 depende de CAR-96 (turnos extra), que espera su diseño aprobado en Claude Design. **Sin Gard real, sin migraciones, sin pagos ni facturación en esta etapa.** Parte de la revisión de CAR-100 contra el alcance aprobado (`referencias/revision-car-100-alcance.md`) y no la repite.

**Decisión de Carlos (9-nov-2026, confirmada a esta sesión):** reemplaza las recomendaciones de la versión anterior de este documento.

1. El turno extra **nunca se cobra**, salvo un **turno de refuerzo ingresado desde la pauta diaria cuando un guardia no va**.
2. El **puesto temporal es ese mismo turno de refuerzo**. No es un puesto de un día ni un objeto nuevo.
3. **No se integra este PR.** La frase «solo `solicitud_cliente` es cobrable; `ausencia` nunca» queda **rechazada**.

## 1. Pagable ≠ cobrable
- **Regla.** CAR-96 paga al guardia todo reemplazo o refuerzo (A5). Lo que se cobra al cliente es **únicamente el turno de refuerzo** ingresado desde la pauta diaria cuando un guardia no va. Todo otro turno extra se paga y **no se cobra**.
- **Se descarta** el campo `origen` con `ausencia` | `solicitud_cliente` y la derivación de `cobrable` desde él. Qué marca exacta distingue al refuerzo en el registro (por ejemplo, un tipo de turno) se define en el brief de CAR-96/CAR-100, no aquí.
- **Efecto.** Nada nuevo para CAR-206/207.

## 2. «Puesto temporal» (A12)
- **Regla.** El puesto temporal **es** el turno de refuerzo. No se crea un puesto de un día con vigencia ni un objeto nuevo.
- **Se descarta** la propuesta anterior de «puesto de un día con `vigente_desde/hasta`» y su caso de aceptación de vencimiento (antes H8).

## 3. Tarifa desde CPQ (C16)
- **Hecho verificado.** CPQ tiene líneas `puesto`, `item` y `adicional` (`modules/cpq/capabilities/esquemas.ts`) con `recurrencia` `mensual` o `unico`; cada línea guarda la copia del ítem usado (R15) y el precio de una cotización no cambia después.
- **Sin decisión nueva.** Carlos no se pronunció sobre la tarifa. La idea anterior (precio unitario de una línea `adicional` «guardia adicional» de la cotización vigente) queda como **antecedente no decidido**, a resolver en el brief de CAR-100 antes de cobrar nada. No se inventa una tarifa.

## 4. Facturación posterior
- Fuera de esta etapa, sin cambios. CAR-100 deja el registro del refuerzo **listo para facturar** y nada más: ni borrador de factura ni cobro. Finanzas > Ventas lo toma después, en su propio brief.

## Casos de aceptación sintéticos (para cuando existan CAR-96 y CAR-100)
Datos inventados, dos empresas, sin pagos. No duplican `puestos-aceptacion-db.test.ts` (CAR-206/207).

| Id | Caso | Resultado esperado |
|---|---|---|
| H1 | Turno extra que **no** es un refuerzo de pauta diaria (por ejemplo, un reemplazo planificado). | Se paga al guardia; **no es cobrable** ni aparece en lo facturable. |
| H2 | **Turno de refuerzo** ingresado desde la pauta diaria porque un guardia no va, aprobado. | Se paga al guardia y queda **cobrable**; se define su tarifa en el brief. |
| H3 | Intento de marcar como cobrable un turno extra que no es refuerzo de pauta diaria. | Se rechaza; no se cobra nada. |
| H4 | Cambia la cotización después de registrar el refuerzo. | La tarifa ya registrada no cambia (queda congelada), una vez definida su fuente. |
| H5 | El supervisor registra; Operaciones aprueba; nadie aprueba lo propio. | Solo lo aprobado es cobrable. |
| H6 | Otra empresa pide o lista esos registros. | «No encontrado»; ninguna ve datos de la otra. |
| H7 | Viewer. | Lee, no escribe. |

El antiguo H8 (puesto de un día vencido) se retira: el puesto temporal ya no es un puesto de un día.

## Dependencias y siguiente paso
CAR-96 (diseño aprobado) → brief de CAR-100 como adenda del de CAR-96 (con la fuente de la tarifa y la marca del refuerzo) → Finanzas > Ventas (facturación). **Siguiente paso concreto:** el diseño de CAR-96 en Claude Design; este PR no se integra y no se escribe código.
