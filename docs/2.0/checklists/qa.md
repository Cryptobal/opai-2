# Checklist de QA — «Diseño y QA OPAI 2.0»

Se corre en `test.opai.cl`, o en la preview del PR, después de cada PR con pantallas. Referencias: el diseño aprobado en `docs/2.0/design/`, `docs/2.0/DISENO.md` y `docs/2.0/NAVEGACION.md`. Los hallazgos van en un issue con capturas (viewport y tema) o se reportan al bot «OPAI 2.0»; cada BLOQUEANTE se registra en el PR integrado donde se encontró, con la etiqueta `qa-bloqueante` y un comentario que empieza con «QA: BLOQUEANTE». Este bot no escribe código.

## 1. Viewports y temas
- [ ] **375 px (celular):** no hay scroll horizontal de página. La barra inferior no tapa contenido ni acciones y la safe-area de iOS se respeta.
- [ ] **1024 px (iPad):** vista dividida donde corresponde. El título está en la barra superior.
- [ ] **1280 px (escritorio):** mismo diseño con más espacio, sin elementos estirados sin sentido.
- [ ] Claro y oscuro: contraste correcto en ambos, sin colores fuera del DS.
- [ ] La pantalla coincide con el diseño aprobado: jerarquía, textos, orden de pestañas, acciones y chips.

## 2. Estados
- [ ] Cargando: el skeleton tiene la forma del contenido, aparece de inmediato y el shell no parpadea al cambiar de módulo.
- [ ] Vacío: dice qué falta y ofrece la acción para crearlo.
- [ ] Error: el mensaje está en lenguaje de usuario y hay «Reintentar».
- [ ] Sin permisos: se ve el estado «Sin acceso» con un rol limitado (viewer o supervisor) y nunca datos parciales.
- [ ] **404:** una URL con id inexistente, con id de otro tenant o con texto que no es un id muestra «No encontrado» dentro del shell, con «Ir al inicio».
- [ ] Formularios: los errores aparecen junto al campo, «Guardar» se deshabilita sin cambios y hay aviso al salir con cambios sin guardar.

## 3. Flujos
- [ ] Cada flujo del brief funciona de punta a punta en celular y en escritorio: crear, editar, archivar, filtrar, buscar y abrir con ⌘K.
- [ ] Las acciones irreversibles piden confirmación y explican el efecto.
- [ ] Los avisos (toast) confirman lo hecho y no tapan la acción siguiente.
- [ ] La navegación coincide con `NAVEGACION.md`: área, entrada o pestaña, nombre y barra inferior del rol.
- [ ] Velocidad (ADR-045): al cambiar de módulo, el contenido aparece en menos de 1 s con datos y la respuesta visible en menos de 100 ms.

## 4. Accesibilidad
- [ ] Todo interactivo tiene un área táctil de al menos 44 × 44 px en celular.
- [ ] El foco es visible y el orden de tabulación es lógico. Los diálogos y drawers atrapan el foco y cierran con Esc.
- [ ] Cada campo tiene su etiqueta, y los iconos sin texto tienen nombre accesible.
- [ ] Con `prefers-reduced-motion` no hay animaciones innecesarias.
- [ ] El texto se puede leer al 200 % de zoom sin cortes.

## Reporte
Por cada hallazgo: pantalla, viewport, tema, pasos, resultado esperado y obtenido, captura y gravedad (alta: bloquea un flujo; media: se ve mal o confunde; baja: pulido). Un hallazgo que debe corregirse antes de seguir integrando es **BLOQUEANTE**: etiqueta `qa-bloqueante` y comentario «QA: BLOQUEANTE» en el PR integrado (lo que consulta el bot «OPAI 2.0» antes de cada merge). Mientras la etiqueta esté puesta, no se integran PRs que toquen pantallas. Se quita cuando la corrección está integrada y verificada (ADR-043 v3).
