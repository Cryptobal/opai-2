# CAR-335 D4c · Vistas guardadas en las listas

- **Sesión:** Sesión Hilo
- **PR:** #652 · rama `brief/car-335-d4c-vistas`
- **Estado:** En PR
- **Migración:** No (ajuste de usuario, ADR-038)

## Qué entra

- Botón «Vistas» en las listas que lo activan (primero Cuentas). Hace tres cosas:
  - guarda la búsqueda y los filtros actuales con un nombre;
  - aplica una vista guardada;
  - quita una vista.
- Las vistas son de cada persona y de cada empresa. Hay hasta 10 por lista.
- Se guardan en el ajuste de usuario `navegacion_vistas_guardadas` con `core.config.get` y `core.config.set`, que ya están en el MCP. Como empieza por `navegacion_`, no aparece en la Actividad.
- El botón se descarga aparte y lee las vistas al primer uso, no en cada navegación (ADR-037 y ADR-045).

## Qué queda pendiente

- Activar «Vistas» en el resto de las listas (Contactos, Instalaciones, Personas, Cotizaciones, Solicitudes…): es una línea por lista.
- Las secciones como pestañas dentro de `ListScreen` (resto de D4c) y «Ver a pantalla completa» (D4b).

## Qué se decidió

- **Decisión nocturna (revisar):** las vistas son personales, no compartidas con el equipo, como pide el brief. Linear y Attio también parten con vistas personales.
