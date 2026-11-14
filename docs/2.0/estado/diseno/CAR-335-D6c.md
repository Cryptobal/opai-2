# CAR-335 D6c · Un solo diseño en el ERP

- **Sesión:** Sesión Diseño
- **Estado:** En PR (apilado sobre #727 y #723)
- **Migración:** No

## Qué entra

- En el ERP el diseño nuevo es el único (`marcoResuelto`): la cookie de marco ya no se lee. Los demás portales (supervisor, trabajador, terreno, cliente) siguen con el clásico hasta su bloque.
- Preferencias pierde la sección «Diseño» y el menú de la cuenta pierde el atajo «Volver al diseño clásico».
- Se borran las pruebas e2e que entraban al Hilo por cookie (`hilo.spec.ts`, `hilo-avisos-vacios-preview`, `hilo-fila-seleccionada-preview`).

## Qué queda pendiente

- D6c parte 3: borrar el código del Hilo y del clásico del ERP que quedó sin uso (`_components/hilo/*`, Inicio Hilo, `reglas-diseno` del Hilo) y el ajuste `core.preferencias_marco`.
- Portales con el diseño nuevo (bloque «Módulos»: un PR por portal).
