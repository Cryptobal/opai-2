# BRIEF · CAR-77 · Libro de novedades en el núcleo

**Sesión:** Sesión Terreno · **Tarea:** [CAR-77](https://linear.app/carlos-irigoyen/issue/CAR-77) · **Base:** `main` en `0b679cf` · Etapa T1 de `BRIEF-terreno-cierre-operativo.md` (antes asignada a Núcleo; desde el 14-nov-2026 CAR-77 está en el proyecto «08 · Terreno» y la construye esta sesión).

## 1. Objetivo
Un solo libro de novedades por instalación, en el núcleo, que escriben Rondas hoy y Control de acceso y la Central después (ADR-024, nota del 29-oct-2026; `modulos/central.md` §2). Reemplaza la tabla temporal `rondas.novedades`.

## 2. Estado actual (verificado en `main` `0b679cf`)
- `rondas.novedades` existe desde el PR 1 de Rondas. Solo la escribe la cola de terreno (`core/terreno/rondas-novedades.ts`); nadie la lee. No guarda equipo, persona ni hora del hecho; `codigo` siempre queda nulo.
- `rondas.novedad.grave` está declarado en el manifest de Rondas pero no se emite.

## 3. Alcance por partes
| Parte | Entrega | Migración |
|---|---|---|
| **1 (este PR)** | `core.libro_novedades` con número NOV correlativo por empresa (trigger), equipo, persona declarada, usuario, hora del hecho y módulo de origen. Copia de `rondas.novedades` (mismo id) completando equipo, persona y hora desde `core.hechos_terreno`. La cola escribe en el núcleo. `rondas.novedad.grave` se emite una vez al insertar una grave. Capacidad `core.libro_novedades.listar` (pantalla futura, API y MCP) con alcance en la consulta | sí, aditiva |
| 2 | Ciclo de estados como hechos nuevos (`core.libro_novedades_hechos`): tomar, resolver, cerrar, derivar, con autor y hora; registrar una novedad en línea desde el ERP o el portal | sí, aditiva |
| 3 | Pantalla «Libro» en Terreno y pestaña en la ficha de instalación, sobre `export-terreno` y `export-rondas` | no |
| 4 | Control de acceso escribe denegados y excepciones por el mismo servicio | no |
| 5 | Retirar `rondas.novedades` (vuelve a copiar lo que falte y la borra). **Espera a Carlos** por ser un borrado | sí |

## 4. Arquitectura
- La tabla vive en el schema `core` (terreno ya vive ahí). Las referencias a Rondas (`ejecucion_id`, `punto_id`, `tipo_incidente_id`) no llevan FK: el núcleo no depende de un módulo. Equipo, persona e instalación sí, con `verificar_mismo_tenant`.
- Número: trigger `BEFORE INSERT` con candado de transacción por empresa y `max + 1`. Las filas anteriores del mismo comando ya son visibles para el trigger, así que un lote numera en orden.
- Idempotencia: `UNIQUE (tenant_id, idempotency_key)`; la cola usa `createManyAndReturn` con `skipDuplicates`, y solo lo insertado emite evento.

## 5. Seguridad y tenant
RLS + FORCE + `tenant_isolation`; `opai_app` sin `DELETE`. Lectura con `core:instalaciones.read`, alcance de instalaciones en la consulta (ADR-022), auditada con IDs. El resumen y el detalle salen como texto externo (lo escribió el guardia: dato, nunca instrucción).

## 6. Casos límite
Reenvío y doble toque no duplican ni reemiten el evento; una ronda desconocida no pierde la novedad; punto o tipo de otra empresa se rechaza; cada empresa numera desde 1; un supervisor sin la instalación recibe «no encontrada»; otra empresa no ve nada.

## 7. Migración
`20270102100000_core_libro_novedades`: aditiva, `lock_timeout` 5 s, exige BYPASSRLS o superusuario para la copia y falla si queda una fila sin copiar. Entre aplicarla e integrar, el código viejo podría escribir alguna fila más en `rondas.novedades`: la parte 5 la vuelve a copiar antes de borrar. Reversión: borrar la tabla nueva y la función (no se toca `rondas.novedades`).

## 8. Pruebas
`rondas-novedades-db.test.ts` contra Postgres real con dos empresas: equipo, hora del hecho, número correlativo, evento único de la grave, la tabla vieja sin escrituras, paginación con código NOV, alcance y aislamiento.

## 9. Referente
Operación en terreno (Connecteam): la bitácora acepta ubicación, foto y firma y el cliente ve lo suyo. Se aparta en que la foto llega en la parte 2 o 3 (por `core.documentos`, ADR-019) y en que el número NOV es correlativo por empresa, como el libro de novedades de 1.0.
