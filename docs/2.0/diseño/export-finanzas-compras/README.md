# Export de Finanzas · Compras — DS 2.0 (referencia visual aprobada, mockup v1)

**Qué es:** mockup v1 del módulo Finanzas · Compras (conciliación y contabilidad: libro de compras, proveedores, conciliación bancaria, reglas de clasificación, plan de cuentas, asientos y EERR/balance), construido en Claude Design con el Design System de OPAI 2.0.

**Versión:** v1. **Revisado:** por el operador el 30-oct-2026 ~14:40 CLT — revisión estática (sin render) contra el prompt de origen y su ajuste v2 en `alcance/`, ambos en el computador del operador, no en este repositorio.

## Qué es REFERENCIA VISUAL, no código

La app **no importa** CSS, JS ni fuentes de este export: todo estilo, token y componente sale de `@opai/ds` (en `main`). El `_ds/` y los `.dc.html` existen solo para comparar la implementación con el diseño aprobado en 375, 1024 y 1280 px, en claro y oscuro.

## Archivos

- `00 Indice.dc.html` — índice de las pantallas del export.
- `00 Componentes.dc.html` — hoja de componentes del DS usados en este mockup.
- `01 Libro de compras.dc.html` — libro de compras.
- `02 Ficha de proveedor.dc.html` — ficha de proveedor.
- `03 Conciliacion mensual.dc.html` — conciliación mensual.
- `04 Editor de reglas.dc.html` — editor de reglas de clasificación.
- `05 Reglas sugeridas.dc.html` — reglas sugeridas (variante B: umbral de 3 casos iguales para sugerir una regla).
- `06 Plan de cuentas.dc.html` — plan de cuentas.
- `07 Asientos y periodos.dc.html` — asientos y períodos.
- `07B Asiento de apertura.dc.html` — asiento de apertura asistido (variante B).
- `08 EERR y balance.dc.html` — EERR y balance.
- `LibroCompras.dc.html`, `FichaProveedor.dc.html`, `Conciliacion.dc.html`, `Reglas.dc.html`, `ReglasSugeridas.dc.html`, `PlanCuentas.dc.html`, `Asientos.dc.html`, `AsientoApertura.dc.html`, `EerrBalance.dc.html` — componentes fuente de cada pantalla, importados por los `.dc.html` numerados anteriores.
- `fin-shell.js` — shell/datos de ejemplo compartidos por las pantallas del módulo.
- `support.js` — runtime genérico de Claude Design (`dc-runtime`) que interpreta los `.dc.html`.
- `_ds/` — el Design System 2.0 que cargan los `.dc.html` (tokens, componentes, fuentes).

Cada pantalla trae sus variantes a 375, 1024 y 1280 px, en claro y oscuro, con sus estados (vacío, error, sin permisos, etc.).

## Decisiones abiertas (de Carlos)

- Umbral de 3 casos iguales para sugerir una regla de clasificación (`05 Reglas sugeridas`, variante B).
- Asiento de apertura asistido (`07B`, variante B).

## Pendientes menores

- El centro de costo general se llama «Administración» y debe llamarse «Administración / Oficina central».
- Falta dibujar los ajustes del módulo en Configuración › Módulos › Finanzas (por ejemplo, el umbral de reglas sugeridas).
- (resuelto 30-oct-2026) Se reemplazó el nombre real de los datos de ejemplo (`Asientos.dc.html`, `Conciliacion.dc.html`, `fin-shell.js`) y del bundle `_ds` por uno ficticio.
- El Índice dice «Finanzas v1 · CAR-98».
