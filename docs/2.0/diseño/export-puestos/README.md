# Export de Puestos — DS 2.0 (referencia visual aprobada)

**Fuente:** Claude Design, proyecto `3e9a6632` («Módulo Puestos seguridad»), construido con el Design System de OPAI 2.0 v2 (`44e4d7b9-7464-4771-bff8-07fcff4d573d`).

**Aprobación:** Carlos aprobó este export como diseño del PR #49 el 26-oct-2026 20:08 CLT (`t436u`, «si dal», chat de OPAI 2.0). Diseño y QA lo dejó sin bloqueantes a las 20:06 y lo exportó a las 20:10. Regla vigente de Carlos: «SIEMPRE todos los diseños de OPAI 2.0 deben ser con el Design System de OPAI 2.0» y «nunca copiar el diselo de 1.0, se debe usar el design system aprobado» (26-oct-2026 17:18 CLT).

> **Es REFERENCIA VISUAL, no código.** La app **no importa** CSS, JS ni fuentes de este export: todo estilo, token y componente sale de `@opai/ds` (en `main`). El `_ds/` y los `.html` existen solo para comparar la implementación con el diseño aprobado en 375, 1024 y 1280 px. Este export **reemplaza** al anterior, de estilo 1.0, que se sacó del repositorio en `9cdb388`; no se recupera nada de aquel ni de 1.0.

## Pantallas por grupo (42)

Cada HTML abre con un comentario `@dsCard` con su viewport y estado.

### Lista de Puestos (instalación) — 13
- `PuestosPhone`, `PuestosTablet`, `PuestosDesktop`, `PuestosDesktopDark`
- Vacío: `PuestosPhoneVacio`, `PuestosTabletVacio`, `PuestosDesktopVacio`
- Cargando: `PuestosPhoneCargando`, `PuestosTabletCargando`, `PuestosDesktopCargando`
- Error: `PuestosPhoneError`, `PuestosTabletError`, `PuestosDesktopError`

### Hoja de puesto — 7
- `PuestoSheetPhone`, `PuestoSheetTablet`, `PuestoSheetDesktop`, `PuestoSheetDesktopDark`
- Desactivar: `PuestoSheetPhoneDesactivar`, `PuestoSheetTabletDesactivar`, `PuestoSheetDesktopDesactivar`

### Configuración › Patrones de turno — 5
- `ConfigPatronesPhone`, `ConfigPatronesTablet`
- Vacío/Cargando/Error: `ConfigPatronesVacio`, `ConfigPatronesCargando`, `ConfigPatronesError`

### Configuración › Funciones — 2
- `ConfigFuncionesPhone`, `ConfigFuncionesDesktop`

### Edición de Patrón — 3
- `PatronEditPhone`, `PatronEditTablet`, `PatronEditDesktop` (incluye la regla EN_USO: un patrón en uso no cambia su estructura)

### Edición de Función — 3
- `FuncionEditPhone`, `FuncionEditTablet`, `FuncionEditDesktop`

### Estados genéricos de Configuración — 9 (solo referencia de estados)
- `ConfigPhoneVacio/Cargando/Error`, `ConfigTabletVacio/Cargando/Error`, `ConfigDesktopVacio/Cargando/Error`

> Las variantes `Config{Phone,Tablet,Desktop}` en Vacío/Cargando/Error son referencia de estados que Claude Design agregó sin que se pidieran; no son pantallas obligatorias del PR.
