# CAR-27 · Reportes comerciales avisan cuando llegan al tope de datos

- **Sesión:** Sesión Comercial
- **PR:** #634 · rama `fix/car-27-reportes-truncado`
- **Estado:** Integrado (#634 `a3ce45f1`, 13-nov-2026)
- **Migración:** No

## Qué entra

Resuelve el pendiente de la autorrevisión de #520: el tablero lee hasta 20.000 filas por fuente y no avisaba si se cortaba. `comercial.informes.tablero` devuelve `parcial` (alguna fuente llegó al tope) y la pantalla muestra un aviso arriba del tablero. Prueba pura del cálculo. Sin migración. **Decisión nocturna (revisar):** sin prueba `@preview`, porque el aviso solo aparece con más de 20.000 filas y `qa-e2e` no las tiene; el resto de la pantalla no cambia.

(Archivo aparte de `CAR-27.md` porque #633 y #634 no van apilados y no deben editar el mismo archivo.)
