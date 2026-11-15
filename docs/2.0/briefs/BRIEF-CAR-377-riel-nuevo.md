# BRIEF · CAR-377 · Menú plegado del diseño nuevo: solo módulos, no submódulos

Ticket: CAR-377, del proyecto Núcleo. Lo toma la Sesión Hilo porque el menú plegable es del diseño nuevo (CAR-335, D2). Diseño: `export-diseno-nuevo`. El README §2 dice: «cerrado, se asoma al pasar el mouse (o al tocar un ícono)».

## 1. Objetivo
Con el menú lateral cerrado, el riel muestra solo el primer nivel (Inicio, Bandeja…) y un ícono por módulo (Comercial, Operaciones, Personas, Finanzas, Documentos). No muestra cada submódulo. Al pasar el mouse, o al tocar un módulo, se abre el menú completo con ese módulo desplegado.

## 2. Estado actual
`ShellNuevo` reutilizaba el riel clásico de iPad (`Rail`), que lista cada entrada del menú. Al cerrar el menú aparecían todos los submódulos, que es el problema que reporta Carlos.

## 3. Alcance
- `RielNuevo`, solo dentro de `ShellNuevo`.
- Prop `riel` en `AppShell` para reemplazar el riel clásico.
- Tocar un módulo abre el menú con esa área.
- En pantalla táctil, tocar fuera cierra el menú asomado.
- El riel clásico (iPad, diseño clásico) no cambia.

## 4. Arquitectura
`RielNuevo` vive en `@opai/ds/shell-nuevo`, en su propio trozo de JS (ADR-037). Agrupa las entradas por `area` y toma el ícono de `iconoDeArea`. Mantiene `data-shell="riel"`, así las reglas de `styles.css` (plegado y asomado) siguen valiendo.

## 5. Archivos
`packages/ds/src/shell/nuevo/{riel-nuevo,shell-nuevo}.tsx`, `packages/ds/src/shell/app-shell.tsx`, pruebas y estado.

## 6–7. Datos y capacidades
Ninguno.

## 8. Interfaz
- **Escritorio con el menú cerrado:** riel con primer nivel, módulos y Configuración al pie.
- **iPad:** el mismo riel; tocar un módulo abre el menú sobre la página.

## 9. Seguridad
Sin cambios: el riel muestra las mismas entradas que el menú, que ya vienen filtradas por permiso.

## 10. Casos límite
- Un portal sin áreas (Supervisor, Cliente) muestra solo sus entradas de primer nivel.
- El módulo que contiene la página activa se marca con el acento.

## 12. Tests
- Unitaria: el riel muestra «Comercial» y no «Negocios» ni «Cuentas».
- `@preview`: con el menú cerrado, el riel tiene el botón «Comercial» y no el enlace «Negocios».

## 14. Criterios de aceptación
Los del ticket: con el menú cerrado se ven solo los módulos; al pasar el mouse se abre el menú completo, como antes.

## 16. Reporte
- **Decisión nocturna (revisar):** tocar un módulo del riel abre el menú completo con ese módulo desplegado, en vez de ir a su primera pantalla. Así lo indica el prototipo («se asoma al tocar un ícono»).
