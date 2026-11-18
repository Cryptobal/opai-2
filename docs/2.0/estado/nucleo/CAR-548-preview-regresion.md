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

## Primera ejecución remota y revisión

- PR #1087, SHA `ec2944ba47d2ebb9e7bec52da661bb0897c51d32`, run [44391996113](https://github.com/opai-cl/opai-2/actions/runs/44391996113): 367 passed, 55 skipped, 13 failed. Los seis casos de scroll fallaron, no se declara resuelto.
- El selector global encuentra dos listas tras navegar (la ficha y el índice retenido). La medición se acota ahora al único split visible con detalle y a sus hijos directos, sin `first()` ni omisiones.
- Algunos intentos midieron documento de 1291 px para ventana de 860. Se espera hasta 15 segundos la misma condición original de altura/overflow para permitir el layout; si persiste el exceso, sigue fallando. No está probado que la altura excesiva sea solo transitoria.
- El artefacto contiene capturas finales, no los `test-failed-1.png` ni `error-context.md` referenciados en logs. Pendiente evidencia visual de estos fallos.
- Todos los runs del SHA terminaron. Antes de suspender se verificaron 0 consultas activas y 0 transacciones abiertas (solo contadores de pg_stat_activity). Compute del preview suspendido e idle confirmado.
- Gate agregado CI aprobó, pero el job real test:db se omitió. No se solicitó cola. Nueva ejecución y revisión independiente pendientes.

## Capturas de la segunda ejecución

- Head `fee9fd412660e85560684bb593fc64a6e2a850ab`, run [44403981294](https://github.com/opai-cl/opai-2/actions/runs/44403981294): seis casos de scroll pasaron, pero la suite terminó cancelada alrededor de 60 minutos y tuvo otros fallos. No se acredita suite verde.
- Revisión de las seis capturas del artefacto `14477713486`: todas muestran el esqueleto del detalle. Ese resultado no valida scroll con la ficha cargada.
- Se elige ahora la cuenta ficticia de cesión de la fixture QA, se comprueba su URL fija y se espera el encabezado Identificación visible y Representante legal adjunto dentro del detalle antes de medir. Un detalle que no cargue falla, no se omite.
- CI aprobado; test:db real omitido. Preview suspendido tras 0 consultas activas y 0 transacciones; idle confirmado. No reintento ciego ni petición de cola.
- Revisión independiente: estos encabezados acreditan la ficha principal, no todos sus Suspense internos (EtiquetasFicha/CamposFicha). No afirmar carga visual total hasta revisar nuevas capturas.
