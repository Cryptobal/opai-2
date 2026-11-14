# CAR-77 · Libro de novedades en el núcleo

- **Sesión:** Sesión Terreno
- **PR:** rama `brief/car-77-libro-novedades` (parte 1 de 5) · [brief](../../briefs/BRIEF-CAR-77-libro-novedades.md)
- **Estado:** En PR
- **Migración:** `20270102100000_core_libro_novedades` (por aplicar en dev y main, con snapshot previo)

## Qué entra (parte 1)

- Tabla `core.libro_novedades`: un solo libro por instalación para todos los módulos, con número NOV correlativo por empresa, equipo, persona declarada, usuario, hora del hecho y módulo de origen.
- La migración copia `rondas.novedades` con el mismo id y completa equipo, persona y hora desde la cola de terreno; falla si queda una fila sin copiar.
- Las novedades que llegan por la cola se guardan en el libro del núcleo; `rondas.novedades` ya no recibe escrituras.
- Una novedad grave emite `rondas.novedad.grave` una sola vez.
- Capacidad `core.libro_novedades.listar` (API y MCP), con alcance por instalación en la consulta y lectura auditada.

## Verificación de la copia

- La copia desde `rondas.novedades` no tiene prueba automática (la base de pruebas parte vacía). La verificó a mano la revisión independiente en una base temporal (dos empresas, con y sin hecho de terreno, clave nula): 3 de 3 copiadas, numeración por empresa desde 1, equipo y hora completados. Al aplicarla en Neon se deja en el PR el aviso «N novedades en rondas, N copiadas» y, antes, se revisan los valores de gravedad y estado (los CHECK son nuevos y la copia falla cerrada).

## Qué queda pendiente

- Parte 2: ciclo de estados como hechos nuevos y registrar una novedad en línea.
- Parte 3: pantalla «Libro» en Terreno y en la ficha de instalación.
- Parte 4: Control de acceso escribe en el libro.
- Parte 5: retirar `rondas.novedades` (espera a Carlos, es un borrado).
- La parte 2 (registrar en línea) valida punto, tipo y ronda en la capacidad además del trigger `mismo_tenant_rondas`.
- Evidencia (fotos) por `core.documentos`: etapa T2 de CAR-226.

## Qué se decidió

- La tabla va al schema `core`, sin FK a Rondas, para que el núcleo no dependa de un módulo (reversible).
- El número NOV lo asigna la base (trigger), no la aplicación, para que ningún escritor lo duplique.
- `rondas.novedades` no se borra en esta parte: el borrado se pide a Carlos en Linear.
