# BRIEF · CAR-336 · Listas con ficha a la derecha (diseño nuevo)

Ticket: CAR-336, hijo de CAR-332. Diseño: `docs/2.0/design/export-diseno-nuevo/Escritorio.dc.html`, que abre la ficha en un panel del 58 % (`panelFlex: '0 0 58%'`). Plan: entrega D4b de `BRIEF-CAR-335-D4-listas.md`.

## 1. Objetivo
Que en las listas con ficha (Cuentas, Contactos, Cotizaciones, Negocios, Instalaciones, Personas, Cargos y otras) la lista no quede angosta junto a un panel casi vacío:
- sin ficha abierta, la lista ocupa todo el ancho;
- con ficha abierta, la ficha toma el 58 %, como en el prototipo.

## 2. Estado actual (verificado en `main` `1f08198`)
`SplitScreen` deja la lista en 360/400 px y, sin selección, muestra a la derecha «Elige una cuenta» con un ícono chico. Es el problema que reporta CAR-336.

## 3. Alcance
- **Entra:** marcas `data-split`, `data-sin-detalle`, `data-contenido` y `data-columna` en `SplitScreen`, y reglas de la piel nueva desde 1024 px. Con el diseño clásico y con Hilo no cambia nada.
- **Queda para después:**
  - «Ver a pantalla completa» en la ficha, que necesita estado en el cliente o una ruta;
  - la jerarquía interna de cada ficha (título, estado, datos clave y acciones), que va con D4, módulo por módulo.

## 4. Arquitectura
Solo CSS por las marcas `data-*`, sin JS nuevo (ADR-037). Configuración (`contenido`) queda fuera porque usa su propio menú a la izquierda.

## 5. Archivos
`packages/ds/src/patterns/split-screen.tsx`, `packages/ds/src/styles.css`, pruebas, novedad y `docs/2.0/estado/diseno/CAR-336.md`.

## 6. Datos y migraciones
Ninguno.

## 7. Capacidades
Ninguna.

## 8. Interfaz y responsive
- **Escritorio** (desde 1024 px): lista a todo el ancho, o 42/58 con ficha.
- **iPad vertical y teléfono:** como hoy.

## 9. Seguridad y tenant
Sin cambios.

## 10. Casos límite
- Pantallas que siempre pasan detalle: quedan en 42/58.
- Configuración: sin cambios.

## 11. Plan
Un bloque.

## 12. Tests
- Unitarias de las marcas.
- `@preview` (`listas-detalle-nuevo.spec.ts`): en Cuentas, la lista ocupa más del 95 % sin ficha y la ficha más de la mitad al abrir una cuenta.

## 13. Validación
Gate, presupuesto de JS y capturas de `preview-e2e` contra el prototipo.

## 14. Criterios de aceptación
- Sin ficha no queda un panel vacío al lado.
- Con ficha, la ficha toma el 58 %.
- El clásico no cambia.

## 15. Riesgos y rollback
Revertir el PR.

## 16. Reporte de ejecución
- Decisión nocturna (revisar): la lista ocupa todo el ancho sin ficha, en vez de mostrar un vacío grande a la derecha. Es lo que hace el prototipo, donde el panel solo aparece con una ficha abierta.
- «Ver a pantalla completa» queda para la siguiente entrega.
