# Seguimiento del #60: permisos efectivos, Empresa y lectura sensible DT

## Encargo y decisión

Continuación de los cambios sin commitear de la sesión anterior en `fix/roles-seguimiento`.
Referencia QA: `/workspace/qa/pr60/informe-c4bae9e.md`, I4/P4, P3 e I2; I1 ya integrado en #60.
Se actualiza esta misma rama con `git merge origin/main` (sin rebase); no se crea PR.
El encargo no trae ID CAR: queda por vincular antes de abrir un PR; no se inventa.

Carlos delegó «Velo tú, según eso y avanza» (26-oct-2026 22:06 CLT, t479u).
La adenda del encargo confirma la resolución vigente: Inspector DT ve sueldos sensibles completos,
solo lectura y con cada lectura auditada. Fundamento: art. 31 del DFL 2 de 1967 (Ley Orgánica
de la DT), documentación necesaria para fiscalizar, incluidas remuneraciones. Enmascarar impediría
la fiscalización. Sustituye las respuestas contradictorias t78s373 y t468s2146 del encargo.

## Criterios de aceptación del seguimiento

| CA | Implementación y evidencia |
|---|---|
| 1. Actualizar desde main | Avance rápido a `origin/main`, conservando los cambios heredados mediante stash. |
| 2. I1 ya integrado, preservar roles ajustados | Se conserva la lógica del #60 y se agrega el baseline anterior a t479u; prueba de actualización e idempotencia. Comparación y escritura atómicas para preservar ediciones concurrentes. |
| 3. I4 acotado | `datosShell` entrega el autorizador efectivo a `navegacionErp`; test con supervisor + rol personalizado y denegación por excepción. No queda diferido a d2. |
| 4. P3 | `disabled` atraviesa FormularioEmpresa → DireccionOpai → CampoDireccion/Combobox/Input; sin búsqueda manual en lectura. E2e a 375/1024/1280. |
| 5. read_sensible | Inspector DT es solo lectura; get/list/resumen, efectiva, historial y la respuesta de `core.estructuras.create` sobre un cargo sensible auditan la revelación (con id real, tras persistir). |
| 6. Aislamiento | `referencia()` (creación) y `estructurasAnular` acotan puesto y persona por `dondePuesto`/`dondePersona` igual que las lecturas (`findFirst`, nunca `findUnique`); cargo sigue sin alcance (catálogo del tenant). Prueba Postgres con dos tenants, fuera de alcance, y en memoria con paralelismo (`Promise.all`). |

## Límites y riesgos

- Los roles plantilla son personalizados normales (`sistema=false`), según #60: no se convierten
  en roles de sistema ni se pisan conjuntos desconocidos. Un rol editado por el tenant requiere
  concesión explícita por su administrador. El seed solo corre en dev/test, no en producción.
- La auditoría de revelación se aplica a cualquier actor con lectura sensible, no solo a una etiqueta
  de rol, para no depender del nombre editable. Registra referencias, nunca una copia de los montos.
  Un listado puede generar varios eventos: uno por estructura sensible revelada.
- Sin relación persona ↔ instalación hasta 07b, las personas acotadas siguen denegadas por defecto.
  La auditoría global no se entrega a un actor con alcance limitado; puede consultar fichas a cargo.
- El e2e detectó «Nuevo» sin comprobar permiso en Cargos: se oculta junto a su hoja para lectura.
  El aviso de sensibilidad ya no afirma que solo owner/admin vean montos (ahora también Inspector).
- La autorrevisión independiente detectó la vía alternativa `core.audit.list`: ahora aplica la
  misma redacción, registro de revelación y denegación del alcance limitado que `core.actividad.list`.
  La ficha de Cargos también oculta edición/crear versión/hojas y deshabilita el switch en lectura.
  El CAS del seed compara nombre, descripción, permisos y `updatedAt`; los tests cubren los tres
  tipos de edición concurrente y la actualización de un baseline intacto.
- No se crean capacidades ni herramientas nuevas ni cambia el plan; no se toca ROADMAP.
- Fuera del encargo: P1/P2/P5 de la QA original y los pendientes anteriores de 07b/portales.
- Sin migraciones nuevas. Los gates locales no sustituyen CI ni la revisión oficial del Revisor.
- **Bloqueantes de la autorrevisión anterior, corregidos en esta sesión:**
  1. `core.estructuras.create` (vía `referencia()`, `packages/capabilities/src/core/maestros/estructuras-ref.ts`)
     y `core.estructuras.anular` (`estructuras-escritura.ts`) ya acotan puesto y persona al alcance del
     actor (`dondePuesto`/`dondePersona`, igual que `dondeEstructura` en lectura): `findFirst` con el
     filtro, nunca `findUnique`; fuera de alcance responde `NOT_FOUND`, igual que "no existe" (sin
     enumeración; cargo sigue sin acotar, es catálogo del tenant). Pruebas negativas: alcance parcial
     (puesto y persona), dos tenants (Postgres real) y 5 llamadas en paralelo (`Promise.all`) que
     confirman que el filtro no se escapa por carrera — el alcance viene de la sesión del actor, no de
     una fila mutable, así que no hay TOCTOU que resolver con lock. Tests nuevos:
     `packages/capabilities/test/estructuras-alcance-escritura.test.ts` (en memoria) y
     `estructuras-alcance-escritura-db.test.ts` (Postgres real, dos tenants).
  2. La respuesta de `core.estructuras.create` sobre un cargo sensible ahora audita la revelación
     igual que un `get`: el cálculo de `ocultarMontos` se movió a **después** de persistir la fila (con
     `e.id` real), en vez de antes (cuando `data` no tenía id y la auditoría se saltaba en silencio). La
     vista previa (`dryRun`) sigue sin auditar: no hay fila que haya revelado nada. Test en
     `maestros-estructuras.test.ts` ("la creación de una estructura sensible audita la revelación").

## Verificación

Gate requerido: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, `pnpm build`,
`pnpm presupuesto` y `pnpm --filter @opai/web e2e roles-seguimiento.spec.ts`.
El e2e requiere la fixture local `packages/db/scripts/seed-inspector-e2e.ts`, solo `opai_e2e` local,
y `BASE_URL` al servidor de este worktree (3106 en esta sesión; nunca reutilizar 3000 a ciegas).
La fixture usa la contraseña de prueba existente sin imprimirla ni tocar el owner.

Resultados locales tras traer `origin/main` (merge normal, commit `efe3322`, trae entre otros el
PR #66 de endurecimiento de Plataforma; conflicto solo en `ESTADO.md`, resuelto conservando ambas
entradas): typecheck y lint sin errores (solo warnings de longitud en archivos de test anteriores al
encargo o ya sobre el límite antes de esta sesión); 806 tests en verde; `test:db`: 68 DB + 56
capacidades (+4 de los bloqueantes corregidos) + 6 auth; build y presupuesto en verde (Cargos
161,5/165 KB, ficha 163,1/167 KB, Empresa 167,5/175 KB; ningún tope subido). Playwright:
`roles-seguimiento.spec.ts` 3/3 (telefono/ipad/desktop) contra `next dev -p 3106` gestionado por una
config temporal de Playwright de este worktree (borrada al terminar, igual que `test-results/`); la
fixture `inspector-seguimiento@opai.cl` de `seed-inspector-e2e.ts` ya estaba sembrada en `opai_e2e`
local de una sesión previa, así que no se reseeda. El limitador de frecuencia usó respaldo en memoria
durante el e2e (la base local no tiene la función de rate limit incorporada en main). No se aplicaron
migraciones remotas.
