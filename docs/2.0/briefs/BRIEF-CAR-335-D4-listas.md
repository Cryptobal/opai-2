# BRIEF · CAR-335 D4 · Listas y fichas del diseño nuevo

Plan general: `BRIEF-CAR-335-diseno-nuevo.md`. Decisión: ADR-109. Diseño: `docs/2.0/design/export-diseno-nuevo/Escritorio.dc.html` (vistas de lista: `secs`, `vistas`, `marcas`, panel de ficha de 58 % con `expandir`) y README §4 y §5. Depende de D1. Va en varias entregas porque toca el patrón que usan unas 30 pantallas.

## 1. Objetivo
Que todas las listas y fichas se vean y funcionen igual, como en el prototipo:
- título, vista guardada y «+ Nuevo» arriba a la derecha;
- secciones como pestañas y filtros;
- tabla con casillas y una barra de acciones sobre lo seleccionado;
- la ficha se abre a la derecha (58 %), se amplía a pantalla completa y se edita ahí mismo;
- estados de carga, vacío, sin permiso, error y sin conexión con el mismo estilo.

## 2. Estado actual (verificado en `main` `a5f1638`)
- `ListScreen` (`packages/ds/src/patterns/list-screen.tsx`) ya trae cabecera con acción principal, buscador, filtros, filas-tarjeta en teléfono, tabla desde md y fila como enlace (server-first). No trae selección, vistas guardadas ni secciones.
- `SplitScreen` divide lista y detalle con 360/400 px de lista, no 42/58 %, y no se puede ampliar.
- Los estados (`Estado`) ya existen: carga, vacío, error y sin permisos. Falta «sin conexión».

## 3. Alcance por entregas
- **D4a · Selección y barra de acciones (DS):** casillas por fila y «seleccionar todo» en `ListScreen` (opcional, `seleccion`), barra fija «N filas seleccionadas» con las acciones que pase la pantalla y «Quitar selección». Muestra en `/ds/nuevo`. Las pantallas lo adoptan en sus PR, con su capacidad masiva y su herramienta MCP.
- **D4b · Ficha a la derecha:** `SplitScreen` acepta `proporcion="ficha"` (lista 42 %, ficha 58 %) y «Ver a pantalla completa». Lo adopta primero Cuentas.
- **D4c · Secciones y vistas guardadas:** secciones como pestañas por ruta (`Tabs` existente) dentro de `ListScreen`; vistas guardadas por persona y lista (ajuste de usuario `vistas_guardadas`, sin migración) con su capacidad.
- **D4d · Sin conexión:** estado y banda «Sin conexión» comunes (ADR-044).

## 4. Arquitectura
- `ListScreen` sigue siendo server-first. La selección vive en una isla de cliente (`SeleccionLista`, en el DS) que envuelve la tabla. Solo se descarga en las listas que la piden (ADR-037).
- Las acciones masivas son de cada pantalla: el DS solo pinta la barra y devuelve los ids elegidos.
- Todo cambio de aspecto respeta la piel: con el diseño clásico se ve como hoy, salvo lo que la pantalla adopte.

## 5. Archivos (D4a)
`packages/ds/src/patterns/{list-screen,seleccion-lista,barra-seleccion}.tsx`, `apps/web/app/ds/nuevo/*`; pruebas y estado.

## 6. Modelo de datos y migraciones
Ninguno en D4a ni D4b. D4c usa un ajuste de usuario (ADR-038).

## 7. Capacidades
- D4a y D4b, ninguna.
- D4c: lectura y escritura de vistas guardadas sobre `core.config.*`.
- Cada acción masiva que adopte una pantalla trae su capacidad y su herramienta MCP (paridad, ADR-055).

## 8. Interfaz y responsive
- **Teléfono:** la selección se activa con «Seleccionar» y la barra va abajo, sobre la barra inferior. La ficha ocupa la pantalla.
- **iPad:** la ficha se abre sobre la lista.
- **Escritorio:** lista y ficha lado a lado (42/58), con «Ver a pantalla completa».

## 9. Seguridad y tenant
- La selección no da permisos: cada acción masiva se autoriza en su capacidad, fila por fila y con el alcance del actor (ADR-022).
- Las vistas guardadas son de cada persona.

## 10. Casos límite
- La selección se limpia al cambiar de página o de filtro.
- «Seleccionar todo» marca solo las filas visibles.
- Una acción que falla en algunas filas informa cuáles.

## 11. Plan por bloques
Un PR por entrega (D4a → D4d), cada uno con su prueba `@preview` cuando cambie una pantalla real.

## 12. Tests
- Unitarias del DS: casillas, «seleccionar todo», barra y limpiar.
- e2e de `/ds/nuevo`: seleccionar, ver la barra y quitar.

## 13. Validación
Gate, presupuesto de JS (la isla no entra en las listas que no la usan) y capturas.

## 14. Criterios de aceptación
- D4a: una lista con `seleccion` muestra casillas y la barra con sus acciones.
- Sin `seleccion`, la lista queda igual que hoy.

## 15. Riesgos y rollback
- Riesgo: muchas pantallas usan `ListScreen`. Se mitiga con props opcionales y pruebas de la muestra.
- Rollback: revertir el PR.

## 16. Reporte de ejecución
- **D4a:** la selección no va en `ListScreen`, que no importa nada de cliente. La pantalla la arma con `seleccionDeLista`, de `@opai/ds/seleccion`, y se la pasa en el prop `seleccion` (cabecera, celda y envoltura).
  - **Por qué:** la primera versión importaba las casillas desde el patrón y sumaba hasta 6 KB a 27 rutas que no las usan.
  - **Resultado:** con el punto de entrada aparte, el presupuesto queda sin cambios.
- La selección en teléfono («Seleccionar» y barra abajo) queda para cuando la adopte la primera pantalla.
