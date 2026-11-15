# Brief CAR-349 · Gastos recurrentes en UF y en % de ventas (bloque 2 de 3)

**Sesión Caja · 12-nov-2026 · Fixes CAR-349 (parcial) · Relacionado: CAR-269, BRIEF-CAR-349 (bloque 1), ADR-026, ADR-073**

## 1. Objetivo

Que un gasto recurrente pueda ir en UF (arriendos, contratos indexados) o como porcentaje de las ventas netas del mes anterior (retiro de socios), y que el flujo calcule solo el monto en pesos de cada cuota.

## 2. Estado actual (verificado en main `9a65306`)

- Los recurrentes (bloque 1, #601) solo aceptan pesos.
- Las categorías de egreso ya son configurables por empresa: son las filas del flujo (`finanzas.filas.crear/actualizar/archivar`, con interruptor `activa`).
- La UF diaria vive en `core.valores_publicados` (SII). Las ventas, en el libro de ventas (`finanzas.documentos_emitidos`).

## 3. Alcance

1. Columna `unidad` en `finanzas.flujo_recurrentes`: `clp` (defecto), `uf` o `pct_ventas`. El monto sigue siendo entero:
   - UF × 10.000 (12,5 UF = 125.000);
   - % × 10.000 (5 % = 50.000; tope 100 % = 1.000.000).
2. Dominio puro `recurrentes-monto.ts`, con cálculo entero y redondeo al peso:
   - **UF:** se usa la UF publicada del día que indique la política de la regla. Si esa UF aún no se publica (cuota futura), se usa la última publicada y la cuota queda marcada como estimada.
     - Políticas, con paridad con OPAI 1 (`uf-occurrence.ts`): día de la cuota (defecto), fin de mes, fin del mes anterior, inicio de mes o día fijo.
     - Diferencia con OPAI 1: OPAI 1 proyecta la UF futura con un crecimiento mensual. OPAI 2 usa la última UF publicada y lo dice en la celda. Es más conservador y no inventa valores.
   - **% de ventas:** se calcula sobre las ventas netas del mes anterior a la cuota (neto + exento; la nota de crédito resta, igual que la base del PPM).
     - Si ese mes es el mes en curso, se usa lo emitido hasta hoy y la cuota queda estimada.
     - Si es un mes futuro, se usa el último mes **cerrado** con ventas (el mes en curso está incompleto) y la cuota queda estimada.
     - Un mes pasado sin documentos da 0 estimado: pueden faltar por cargar.
     - Ventas negativas dan 0.
3. Al cruzar con los cargos del banco, cada cuota usa su propio monto exacto.
4. La nota de la celda dice qué base se usó, por ejemplo «estimado con la UF del …».
5. Las capacidades `finanzas.recurrentes.crear/actualizar/listar` aceptan y devuelven `unidad`, con vista previa y MCP. Para cambiar la unidad hay que indicar también el monto nuevo; si no, el monto se reinterpretaría.
6. **Retiro por socio:** una fila de egresos por socio («Retiro <socio>») con su recurrente en % de ventas. El interruptor es el `activa` de la fila o del recurrente. No hace falta una tabla nueva.

**Fuera de este bloque:**
- Importador de los 12 recurrentes de OPAI 1, con vista previa (bloque 3). La carga real en Gard requiere el OK de Carlos.
- Pantalla con el diseño Hilo.

## 6. Modelo de datos y migraciones

`20261214100000_finanzas_flujo_recurrentes_unidad` es aditiva:
- columnas `unidad` (defecto `'clp'`), `politica_uf` (defecto `'dia_cuota'`) y `uf_dia_fijo`;
- CHECK de la unidad, del tope de 100 %, de la política y del día fijo (solo con su política);
- `lock_timeout` de 5 s.

Las filas existentes no cambian. La aplica la sesión (ADR-104), con respaldo, primero en `dev` y después en `main`.

## 9. Seguridad y tenant

- Sin tablas nuevas. La RLS de `flujo_recurrentes` no cambia.
- Las ventas se leen por `ctx.db` (RLS del tenant).
- La UF es un indicador global y público.

## 10. Casos límite

- No hay ninguna UF publicada: 0 y estimada; nunca se inventa.
- Ninguna venta: 0 y estimada.
- Montos grandes: aritmética BigInt.

## 12. Tests

- **Dominio:** `recurrentes-monto.test.ts` (11 casos) y monto por fecha en `estadosPorFila`.
- **Base de datos:** `finanzas-flujo-recurrentes-unidad-db.test.ts`.
  - Validación de unidad y del tope.
  - UF del día de cada cuota.
  - % de ventas con nota de crédito que resta.

## 13. Consultas por navegación

- Sin recurrentes en UF ni en %, cero consultas nuevas.
- Con UF: 3 consultas.
- Con %: 1 a 3 consultas, agrupadas por día y tipo de documento en la base.

## 15. Riesgos y rollback

La columna es aditiva. **Ojo antes de revertir el código:** el código anterior lee `monto` como pesos. Un recurrente en UF o en % quedaría proyectado con un monto absurdo (12,5 UF se leerían como $125.000). Por eso, antes de revertir hay que desactivar esos recurrentes (`activa = false`) o pasarlos a CLP.

**Diferencia con OPAI 1 en el % de ventas:** OPAI 1 estima un mes abierto o futuro sumando las facturas programadas que aún no se emiten. Hoy OPAI 2 usa el último mes cerrado. Sumar las programadas exige que la proyección de programaciones (Sesión Finanzas, CAR-342) devuelva el neto y la fecha de emisión; se propone como opción en la decisión.

**Supuestos de negocio por confirmar (Decisión de Carlos):**
- Si la base de «ventas netas» incluye lo exento.
- Cómo estimar un mes que aún no tiene ventas.
