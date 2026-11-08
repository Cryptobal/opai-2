# CAR-221 · UF y redondeo: qué hay escrito y qué falta (Finanzas · Code, 8-nov-2026)

Objetivo: no inventar una regla de UF ni de redondeo para la emisión manual. Aquí está la fuente de lo que ya existe y la brecha exacta.

## Lo que existe y se respeta (programaciones, CAR-159 / BRIEF-26)

- **Qué día de UF se usa** (`fechaUfDe`, `packages/domain/src/finanzas/programacion.ts`): política por programación. Por defecto `RUN_DAY` (el día en que corre la emisión); también `LAST_DAY_PREV_MONTH`, `FIRST_DAY_MONTH`, `LAST_DAY_MONTH` y `CUSTOM_DAY` (con `diaUf`).
- **Valor de UF:** `ufCentavosDelDia` (`ventas-programacion-uf.ts`), exacto del día; sin valor, el período se omite con `motivoSinUf` (no se estima en la emisión real; solo en proyecciones).
- **Redondeo** (`montoLineaProgramacion`, `programacion-montos.ts`): cantidad (4 decimales), precio UF escalado, UF en centavos y descuento se combinan en enteros y se redondea **una sola vez por línea**, mitad hacia arriba (`redondearRazonCLP`). Nunca float.
- Las reglas del cobro por módulo de Plataforma son otras: UF del último día del mes cobrado (`docs/2.0/01-decisiones.md`, cobro por módulo). No aplican a ventas.

## La brecha (emisión manual)

- `finanzas.ventas.crear_borrador` y `emitir` reciben líneas **solo en CLP** (`monto`); no tienen precio en UF, ni fecha de UF, ni conversión.
- Por eso **no hay una decisión escrita** de qué UF ni qué redondeo usar al emitir a mano en UF. La única regla escrita es la de programaciones; extenderla a la emisión manual sería una decisión de producto, no un detalle de implementación.

## Propuesta (pendiente de decisión, sin implementar)

1. Emisión manual en UF usa **la UF del día de emisión** (como `RUN_DAY`), con el mismo redondeo de una vez por línea.
2. La vista previa muestra **valor de la UF, fecha y conversión** (UF × valor = CLP) antes de emitir.
3. Si no hay UF para el día, no se emite (mismo criterio que programaciones).

Hasta que se confirme (1), la emisión manual sigue en CLP. Lo de programaciones ya cumple «UF del día de emisión» con la política por defecto.
