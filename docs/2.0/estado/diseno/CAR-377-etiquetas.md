# CAR-377 · Barra angosta del iPad sin palabras cortadas

- **Sesión:** Sesión Hilo
- **PR:** pendiente · rama `fix/car-377-riel-etiquetas`
- **Estado:** En PR
- **Migración:** No
- **Apilado sobre / espera:** apilado sobre #632

## Qué entra

En las capturas de `preview-e2e` del #632, la barra angosta del iPad (diseño nuevo) cortaba con guion «Operacio-nes», «Documen-tos» y «Configura-ción». La barra pasa de 80 a 96 px y las etiquetas a 10 px, sin cortar palabras.

## Qué se decidió

- Decisión nocturna (revisar): ensanchar la barra 16 px en vez de acortar los nombres de las áreas, para no cambiar el vocabulario del menú.
