# Brief CAR-349 · Importar filas y gastos recurrentes del flujo de caja (bloque 3 de 3)

**Sesión Caja · 13-nov-2026 · Fixes CAR-349 (parcial) · Relacionado: CAR-279 (motor de importación), BRIEF-CAR-349 y 349b**

## 1. Objetivo

Que una empresa traiga de una vez sus categorías de egreso y sus gastos fijos al flujo de caja (Gard, las de OPAI 1), con simulación previa y la opción de revertir. Así no hay que crearlos uno por uno.

## 2. Estado actual (verificado en main `178ec44`)

- El motor común de importación (CAR-279) ya tiene importadores para cuentas, contactos, instalaciones, negocios, personas, contratos y documentos de venta. Todos simulan, cargan por lotes y se revierten (`core.importar.*`, en pantalla y por MCP).
- Gard tiene solo 3 filas de egreso en OPAI 2; OPAI 1 tiene muchas más (remuneraciones, impuestos, GAV, otros, financiamiento).
- El export de OPAI 1 hacia OPAI 2 (`/api/export/opai2/v1/[recurso]`) **no trae** las filas del flujo ni los recurrentes. Sumarlos exige un PR en OPAI 1, que necesita el OK de Carlos.

## 3. Alcance

1. Importador **`flujo_filas`**: categorías de egreso.
   - Se reconocen por su nombre.
   - Las secciones de egreso de OPAI 1 entran como egreso.
   - Los ingresos se rechazan con su motivo (ADR-073).
   - En un registro existente solo se actualiza el orden.
2. Importador **`flujo_recurrentes`**: gastos fijos.
   - Cada uno va a una fila de egresos activa que ya existe.
   - Se reconocen por fila + concepto, o por el id de origen.
   - El monto se pasa a la escala entera de su unidad: CLP; UF × 10.000; % × 10.000 (5 = 5 %).
   - Se validan las mismas reglas que en `finanzas.recurrentes.crear`.
   - Los sinónimos aceptan los nombres de columna y los valores de OPAI 1 (`MONTHLY`, `LAST_DAY_PREV_MONTH`, `% ventas`…).
3. **Revertir:**
   - Una fila no se borra si tiene celdas, recurrentes, movimientos clasificados, una regla del banco o una cuenta vinculada.
   - Un recurrente siempre se puede revertir, porque sus cuotas se derivan al leer.
4. La pantalla **Configuración › Importar datos** muestra las dos opciones nuevas, sin código de UI nuevo. Lleva una entrada de novedades y una prueba `@preview`.

**Fuera de alcance:** cargar los datos reales de Gard, que requiere el OK de Carlos y una planilla o un export de OPAI 1. La pantalla Hilo del flujo.

## 6. Modelo de datos

No hay migración.

## 9. Seguridad y tenant

- Todo pasa por el motor: tenant de la sesión, módulo Finanzas activo, permiso `finanzas:flujo.configurar` y auditoría del lote.
- Las filas se buscan con `ctx.db` (RLS).
- La prueba confirma que otra empresa no encuentra las filas.

## 12. Tests

`core-importar-flujo-db.test.ts`:
- simulación sin escribir;
- rechazo de ingresos;
- conversión a la escala entera de UF y %;
- política de UF;
- errores por fila;
- reimportación sin duplicados;
- aislamiento por empresa;
- reversión en orden (las filas quedan bloqueadas mientras tengan recurrentes).

`e2e/importar-flujo-preview.spec.ts` (`@preview`).

## 15. Riesgos y rollback

Sin migración: revertir el código quita las dos opciones. Los lotes ya importados se revierten desde la misma pantalla.
