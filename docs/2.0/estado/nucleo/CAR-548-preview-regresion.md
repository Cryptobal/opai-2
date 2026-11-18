# CAR-548 · Reparación de la prueba de scroll dividido

## Evidencia (18-nov-2026)

- Main observado: `bb2bbde23f0ef42598292ac66638a8822751a00d`.
- Run [44370254716](https://github.com/opai-cl/opai-2/actions/runs/44370254716), job `135034807842`: el caso desktop de 1280 falla esperando `[data-split][data-columna="lista"]`.
- `SplitScreen` coloca `data-split` en el contenedor y `data-columna` en sus hijos. El selector anterior no corresponde al DOM del componente.
- Los dos casos móvil del run consultado aparecen omitidos, no fallidos. `isVisible({ timeout })` no espera a que aparezca la fila; el skip podía ocultar la carga pendiente.

## Corrección

- Selector de hijo directo para esperar la columna de lista.
- Viewport explícito 1280 × 860 para el caso que lo promete; el de 1024 mantiene 1024 × 768.
- Espera con `expect(...).toBeVisible` para la primera cuenta; una fixture ausente falla con mensaje, no omite la prueba.
- Cuando una columna desborda, se comprueba que cambia su scrollTop sin mover la otra columna ni el documento, y se restaura la posición. Sin contenido suficiente, no se acredita desplazamiento efectivo.
- Sin nuevos `skip`/`fixme`, sin cambios de producto, permisos, base, datos o secretos. Las aserciones de altura y overflow permanecen.
- Son casos para 1024/1280, incluso cuando los ejecuta el proyecto llamado `telefono`; no representan evidencia del diseño a 375.

## Validación y límites

- Lint del archivo: aprobado.
- Playwright `--list`: seis instancias descubiertas (dos casos × tres proyectos), sin errores de importación.
- DOM real de `SplitScreen` renderizado con React y analizado localmente: una columna hija de lista, una de detalle y cero coincidencias del selector antiguo.
- Chromium local no pudo arrancar por restricción de sockets del entorno; no se acredita ejecución visual ni CSS con esta prueba de DOM.
- Pendientes: gate completo, ejecución `preview-e2e` con empresa ficticia `qa-e2e` y revisión de capturas. No se usaron credenciales, sesiones ni datos reales, no se sembró ni modificó ninguna base.
- CAR-548 ya existe y sigue abierto; esta reparación de su prueba no cierra el ticket de producto ni CAR-664.
