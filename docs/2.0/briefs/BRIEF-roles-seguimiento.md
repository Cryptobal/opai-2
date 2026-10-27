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
| 5. read_sensible | Parcial: Inspector DT es solo lectura; get/list/resumen, efectiva e historial auditan revelaciones. La respuesta de creación sensible carece del evento específico de lectura. |
| 6. Aislamiento | Parcial: prueba Postgres con dos tenants y lecturas fuera de alcance. Las escrituras de estructuras no aplican todavía el alcance por instalación. |

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
- Bloqueantes de autorrevisión: `estructurasCreate` y `estructurasAnular` no filtran las escrituras
  por alcance; además, la respuesta de creación de una estructura sensible no registra el evento
  específico de revelación porque aún no dispone de ID al comprobar la sensibilidad. No hacer push
  como trabajo terminado hasta corregir y probar ambos casos, incluyendo concurrencia.

## Verificación

Gate requerido: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:db`, `pnpm build`,
`pnpm presupuesto` y `pnpm --filter @opai/web e2e roles-seguimiento.spec.ts`.
El e2e requiere la fixture local `packages/db/scripts/seed-inspector-e2e.ts`, solo `opai_e2e` local,
y `BASE_URL` al servidor de este worktree (3106 en esta sesión; nunca reutilizar 3000 a ciegas).
La fixture usa la contraseña de prueba existente sin imprimirla ni tocar el owner.

Resultados locales tras actualizar main: typecheck y lint sin errores (warnings de longitud anteriores al encargo),
785 tests en verde; `test:db`: 68 DB + 52 capacidades + 6 auth; build y presupuesto en verde
(Cargos 161,5/165 KB, ficha 163,1/167 KB, Empresa 167,5/175 KB; ningún tope subido).
Playwright: 3/3 a 375, 1024 y 1280 px, contra `next start --port 3106` de este worktree.
Capturas locales en `apps/web/test-results/roles-seguimiento-*/` (no se commitean).
El limitador de frecuencia usó respaldo en memoria durante el e2e: la base local no tenía disponible
la funcionalidad de rate limit incorporada en main. No se aplicaron migraciones remotas.
