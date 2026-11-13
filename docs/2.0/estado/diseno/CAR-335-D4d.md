# CAR-335 D4d · Sin conexión en el diseño nuevo

- **Sesión:** Sesión Hilo
- **PR:** por abrir · rama `brief/car-335-d4d-conexion` (apilado sobre #632, que también edita `shell-nuevo.tsx`)
- **Estado:** En PR
- **Migración:** No

## Qué entra

- Banda «Sin conexión» común del diseño nuevo (`BandaConexion`, dentro de `ShellNuevo`). Aparece al perder la red y se va sola al volver. En el servidor se asume que hay conexión, así que no se pinta nada de más.

## Qué queda pendiente

- D4b: la proporción 42/58 de la vista dividida entró con CAR-336 (#621). Falta «Ver a pantalla completa».
- D4c: secciones y vistas guardadas.

## Qué se decidió

- **Decisión nocturna (revisar):** la banda solo avisa y no bloquea la pantalla. Las acciones que necesitan red siguen mostrando su propio error. Es lo que hacen Linear y Notion.
