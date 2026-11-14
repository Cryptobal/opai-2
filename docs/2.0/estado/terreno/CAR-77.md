# CAR-77 · Libro de novedades en el núcleo

- **Sesión:** Sesión Terreno
- **PR:** #817 · rama `brief/car-77-libro-novedades` (parte 1 de 5); parte 2 en rama `brief/car-77-libro-novedades-estados` (apilada sobre #817) · [brief](../../briefs/BRIEF-CAR-77-libro-novedades.md)
- **Estado:** En PR
- **Migración:** `20270102100000_core_libro_novedades` (parte 1) y `20270103100000_core_libro_novedades_hechos` (parte 2), por aplicar en dev y main, con snapshot previo

## Qué entra (parte 1)

- Tabla `core.libro_novedades`: un solo libro por instalación para todos los módulos, con número NOV correlativo por empresa, equipo, persona declarada, usuario, hora del hecho y módulo de origen.
- La migración copia `rondas.novedades` con el mismo id y completa equipo, persona y hora desde la cola de terreno; falla si queda una fila sin copiar.
- Las novedades que llegan por la cola se guardan en el libro del núcleo; `rondas.novedades` ya no recibe escrituras.
- Una novedad grave emite `rondas.novedad.grave` una sola vez.
- Capacidad `core.libro_novedades.listar` (API y MCP), con alcance por instalación en la consulta y lectura auditada.

## Qué entra (parte 2)

- Tabla `core.libro_novedades_hechos`: cada cambio de estado es un hecho inmutable (acción, estado anterior y nuevo, nota, autor, hora); `opai_app` solo lee e inserta.
- Ciclo en `@opai/domain` (`libro-novedades.ts`): abierta → tomar (en atención) · resolver · derivar; resuelta → cerrar · reabrir; derivada → reabrir; cerrada es final.
- Capacidades `core.libro_novedades.registrar` (en línea, con vista previa; punto y tipo de Rondas solo con el módulo activo y de la misma instalación), `core.libro_novedades.cambiar_estado` (vista previa; dos cambios a la vez: gana uno, el otro recibe conflicto) y `core.libro_novedades.obtener` (detalle con historia y acciones disponibles), con API y MCP.
- Permiso nuevo `core:novedades.manage` (registrar y cambiar estado): owner, admin, gerente y supervisor; el lector no. Eventos `core.libro_novedades.registrada` y `core.libro_novedades.estado_cambiado`.

## Verificación de la copia

- La copia desde `rondas.novedades` no tiene prueba automática (la base de pruebas parte vacía). La verificó a mano la revisión independiente en una base temporal (dos empresas, con y sin hecho de terreno, clave nula): 3 de 3 copiadas, numeración por empresa desde 1, equipo y hora completados. Al aplicarla en Neon se deja en el PR el aviso «N novedades en rondas, N copiadas» y, antes, se revisan los valores de gravedad y estado (los CHECK son nuevos y la copia falla cerrada).

## Qué queda pendiente

- Parte 3: pantalla «Libro» en Terreno y en la ficha de instalación.
- Parte 4: Control de acceso escribe en el libro.
- Parte 5: retirar `rondas.novedades` (espera a Carlos, es un borrado).
- Evidencia (fotos) por `core.documentos`: etapa T2 de CAR-226.

## Qué se decidió

- La tabla va al schema `core`, sin FK a Rondas, para que el núcleo no dependa de un módulo (reversible).
- El número NOV lo asigna la base (trigger), no la aplicación, para que ningún escritor lo duplique.
- `rondas.novedades` no se borra en esta parte: el borrado se pide a Carlos en Linear (CAR-498).
- Parte 2: el supervisor recibe `core:novedades.manage` porque es quien atiende las novedades de sus instalaciones; el lector no escribe. La sesión lo decidió (reversible: cada empresa lo cambia en sus roles).
- Parte 2: una novedad registrada en línea emite `core.libro_novedades.registrada` (con la gravedad); `rondas.novedad.grave` queda solo para lo que llega desde una ronda, como dice el manifest de Rondas.

## Parte 3 · Libro en Terreno (rama `brief/car-77-libro-terreno`, apilada sobre #826)

- Hecho de cola nuevo `terreno.novedad` (resumen, detalle, gravedad): va al libro del núcleo con equipo, persona y hora, **sin depender de Rondas**, y emite `core.libro_novedades.registrada` una sola vez. Encolable sin conexión (`TIPOS_ENCOLABLES_OFFLINE`).
- Capacidad interna `core.libro_novedades_equipo.listar` (el equipo emparejado lee el libro de su instalación; revocado no lee) y ruta `GET /api/terreno/libro` con límite por equipo.
- Pantalla `/terreno/libro` sobre `export-terreno/Libro Novedades.dc.html`: «Nueva novedad» (reusa el formulario de la ronda, con su estado «guardada en el teléfono») y la lista con número NOV, fecha y hora, gravedad y estado; entrada «Libro de novedades» en el Inicio del equipo. Prueba `@preview` y entrada de novedades.
- **Decisión nocturna/de sesión (revisar):** `/terreno/novedades` ya es el changelog del producto, así que el libro va en `/terreno/libro`.
- **Fuera de esta parte:** la entrega de turno y las pestañas «Mi turno / Instalación» del diseño; tomar o resolver una novedad desde el teléfono (hoy se hace por API o MCP); fotos por `core.documentos` (T2 de CAR-226).
