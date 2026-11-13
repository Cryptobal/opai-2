# CAR-335 · D4b · Ver la ficha a pantalla completa (diseño nuevo)

- **Sesión:** Sesión Hilo
- **PR:** pendiente · rama `brief/car-335-d4b-pantalla-completa`
- **Estado:** En PR
- **Migración:** No
- **Apilado sobre / espera:** apilado sobre #621 (CAR-336)

## Qué entra

En las listas con ficha a la derecha, con el diseño nuevo y desde 1024 px, la ficha trae arriba a la derecha el botón «Ver a pantalla completa» del prototipo (`Escritorio.dc.html`, `expandir`): esconde la lista y la ficha toma todo el ancho; el mismo botón («Volver a ver la lista») la trae de vuelta.

Sin JS (ADR-037): una casilla oculta con su etiqueta dentro de `SplitScreen` y reglas CSS con `:checked` y `:has()`. No aparece sin ficha, en Configuración ni en las muestras de `/ds`. El clásico y Hilo no cambian.

## Qué queda pendiente

- La jerarquía interna de cada ficha (título, estado, datos clave y acciones), módulo por módulo, con D4.

## Qué se decidió

- Decisión nocturna (revisar): el botón va en una franja propia arriba de la ficha y no junto a «Guardar», porque cada ficha arma su propio encabezado; así sirve igual en todas sin tocarlas una por una.
- Decisión nocturna (revisar): el estado no se guarda; al recargar vuelve el 42/58.

## Riesgo

Bajo: solo CSS y una casilla. `:has()` lo soportan Safari 15.4+, Chrome 105+ y Firefox 121+.
