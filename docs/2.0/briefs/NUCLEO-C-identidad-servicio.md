# NÚCLEO-C · Identidad de servicio para agentes

## Fuente y alcance

Encargo de Carlos del 26-oct-2026, t457u (20:47 CLT): «ponlo entonces en el plan de desarrollo para que todo se haga y lo que debamos hacer en el nucleo lo hagamos altiro. Me preocupa que, quede como, cien por ciento agéntico».

Base: ADR-032 §3, ADR-033 y ADR-034 §1. Dependencia #60 integrada, incluida su protección de `roleId`. El agregado del encargo exige bloquear también cambios de rol base y promociones a owner por API keys (review 5661003883, mandatos t365u y t366u).

Decisión de Carlos del 26-oct-2026 21:07, t461s2118: gard-staging, una key por bot y permisos mínimos; OPAI 2.0 revoca la key owner `*` de gard cuando funcionen las nuevas y aplica el seed en Neon tras la aprobación. La URL MCP se corta cuando los bots usen Authorization. Este encargo no ejecuta esas acciones (ni el seed ni la revocación).

ADR definitivo: ADR-051 (`docs/2.0/01-decisiones.md`).

## Estado: listo para revisión

Continuación de un checkpoint de OpenCode (sesión cortada sin commitear). Se conservó el trabajo correcto heredado, se completó lo parcial y se corrigieron los bloqueantes de la autorrevisión previa.

## Criterios de aceptación, uno por uno

0. **Main integrado:** continuación del 27-oct con merge normal de `origin/main` (`f2fcb23a05de984d61a431c6955b1423fa8c0ac0`, incluye #67 y #68), sin rebase ni descartar cambios heredados. **OK.**
1. **Permisos finos:** dominio puro (`packages/domain/src/permisos-key.ts`) con intersección; `core.apikeys.create`/`update` validan el catálogo y rechazan delegación superior (`normalizarPermisosRol` sobre el acceso efectivo del creador). Pruebas negativas en `identidad-servicio.test.ts` y `permisos-key.test.ts`. **OK.**
2. **Servicio:** permisos explícitos, sin rol heredado, presupuesto positivo obligatorio (también a nivel de base: `CHECK api_keys_servicio_configurado`), `soloPersonas` preservado, alcance completo del tenant (nunca el del creador) y rechazo si el creador tiene alcance restringido (no amplía su propio alcance), etiqueta «agente `<nombre>` (servicio)» en actividad. Probado en capacidades (`identidad-servicio.test.ts`) y en el borde (`api-key-servicio.test.ts`, con `contextoDeApiKey`). **OK.**
3. **Presupuesto atómico:** ledger mensual (`core.gasto_agente_mes`) con `pg_advisory_xact_lock` por tenant/key; chequeo y consumo en la misma transacción. `test:db` con 20 cargos paralelos y tope 10: solo 10 aceptados, un aviso por umbral. El costo ya incurrido con un proveedor (IA, mapas, correo, almacenamiento) se registra siempre, aunque supere el tope de esa llamada (`yaIncurrido` en `consumirPresupuesto`/`registrarConsumo`): antes se perdía sin trazabilidad al silenciar el `BUDGET_EXCEEDED` de la medición post-hoc, y la key seguía gastando sin que el ledger lo reflejara nunca. Ahora la llamada en curso se completa y se mide completa; la SIGUIENTE llamada corta en el prepago de `capacidad.ejecucion` (BRIEF-02 §4.9). Si el tope cambia a mitad de período, los avisos del 80 %/100 % de ese período se reinician (si no, un tope nuevo nunca volvería a avisar bajo la marca del tope anterior). Pruebas en `presupuesto-db.test.ts`. **OK.**
4. **Staging:** script `seed:staging` idempotente (crea `gard-staging`, su catálogo, el responsable de gobierno y la key «Grokbot dev»); no se ejecuta en este PR. La guarda del destino se precisa en la continuación de seguridad de abajo. La fila se crea antes de escribir el archivo del secreto; su ruta se valida con `realpath` fuera del repositorio. **Parcial: ejecución remota pendiente de un endpoint verificado.**
5. **UI (DS 2.0):** Configuración → Agentes con tipo (vía usuario o servicio), permisos como subconjunto (lista con los permisos propios del creador), presupuesto obligatorio para servicio y aviso de `*`; sin componentes ni estilos nuevos del DS. e2e `identidad-servicio.spec.ts` en verde a 375/1024/1280 contra el servidor del propio worktree (puerto dedicado) y la base `opai_e2e` local, con la migración de este PR aplicada. **OK.**
6. **Roles:** bloqueo del rol base y de la promoción a owner por API key o agente (`core.users.update`), con prueba de regresión (`identidad-servicio.test.ts`). **OK.**
7. **Documentación:** ADR-051, `ESTADO.md`, `CONTEXTO-agentes.md` (la IA de desarrollo opera en `gard-staging` con su key de servicio; la key `*` owner de Gard queda pendiente de revocación) y una nota en `docs/2.0/agentes/operar-el-nucleo.md` sobre lo que ve una key de tipo servicio en `core_me`. **OK.**

## Decisiones del constructor (no atribuidas a Carlos; marcadas para revisión)

- Prisma no modela listas escalares anulables: el `null` lógico de "la key hereda los permisos del responsable" se representa con `permisos: []` + `heredaPermisos: true` en la base; las capacidades devuelven `permisos: null` hacia afuera cuando hereda. Adaptación de implementación.
- Un `servicio` siempre tiene alcance completo del tenant (nunca el del responsable, que solo gobierna); crear un servicio desde una cuenta con alcance restringido se rechaza, para que nadie amplíe su propio alcance a través de la key. Restricción conservadora, consistente con ADR-033; no está citada textualmente en el encargo.
- El costo ya incurrido con un proveedor (`yaIncurrido`) se registra siempre en el ledger, incluso cuando empuja a la key sobre el tope: es la única forma de no perder trazabilidad de un gasto que ya ocurrió con el proveedor (no se puede "des-gastar"). El corte real para la key queda en la SIGUIENTE llamada, en el prepago de `capacidad.ejecucion`. Interpretación de BRIEF-02 §4.9 («la ejecución en curso termina; la siguiente recibe `BUDGET_EXCEEDED`»), no una cita nueva de Carlos.
- No se fija presupuesto para "Grokbot dev": lo decide Carlos cuando se corra `seed:staging` (`STAGING_PRESUPUESTO_USD`).

## Verificaciones realizadas

- `pnpm typecheck`, `pnpm lint`: en verde (0 errores; solo los warnings `max-lines` ya existentes en tests ajenos a este PR).
- `pnpm test`: 782/782 en verde.
- `pnpm test:db`: 71 (db) + 49 (capabilities) + 6 (auth) = 126 pruebas en verde contra Postgres local, incluida la concurrencia del ledger.
- `pnpm --filter @opai/web build` y `pnpm presupuesto`: build en verde; ninguna ruta supera su tope (Configuración → Agentes: 170,9 KB / 175 KB).
- `pnpm --filter @opai/web exec playwright test e2e/identidad-servicio.spec.ts`: 3/3 en verde (telefono, ipad, desktop), contra un servidor propio en el puerto 3029 y la base `opai_e2e` local con la migración de este PR ya aplicada (`prisma migrate deploy` contra `opai_e2e`, no contra Neon).

## Qué falta (fuera de este PR)

- Reserva previa del costo exacto de una llamada de IA antes de incurrir en el gasto (hoy es técnicamente imposible sin conocer el uso de tokens por adelantado); la mitigación de este PR es que el ledger nunca pierde el gasto real y la siguiente llamada corta.
- Ejecutar `seed:staging` en Neon, fijar el presupuesto de "Grokbot dev" y revocar la key owner `*` de Gard: decisiones y acciones de Carlos / del bot OPAI 2.0 en operación, no de este PR.
# Seguimiento QA del PR #70 (OpenCode)

Checkpoint histórico: correcciones H0, H1, H2, H3, H6, H8 y H10 parcialmente implementadas y gate bloqueado entonces por la base local. Los resultados de la continuación siguiente sustituyen ese checkpoint. El parseo admite hasta seis decimales y el máximo del contrato existente (US$ 100.000). No hay decisiones de negocio nuevas ni cambios a la migración.

## Continuación de seguridad (encargo 27-oct-2026, OpenCode)

Esta sección sustituye las afirmaciones anteriores de permisos independientes del responsable y actualiza el seguimiento QA; los resultados previos son históricos.

1. **H15:** ambas clases de key intersectan su lista con el acceso vigente del responsable (rol base o personalizado y excepciones). Dominio, borde y BD cubren la baja a viewer y la denegación. Si el responsable de un servicio pierde alcance completo, su autenticación falla cerrada; no se amplía su alcance.
2. **Roles:** `core.users.invite` es `soloPersonas`, incluida su vista previa. Ningún agente asigna rol al invitar, tampoco admin/owner. Excepción de paridad y snapshot MCP actualizados; se conserva el bloqueo de `core.users.update`.
3. **Plataforma:** `ctx.plataforma` es null para todo actor agente, sea servicio o usuario, aunque el responsable tenga rol global.
4. **Ledger:** registra gasto con tope null/0 y conserva el acumulado al fijar un tope. Advisory lock, prepago y finalización sin cambios. Se rechazan fracciones inferiores a micro-USD en creación/edición antes de dryRun, evitando convertir un presupuesto positivo en ilimitado.
5. **Seed:** guarda fail-closed de host **y** base antes de escribir, para `DATABASE_URL` y `DATABASE_URL_MIGRATE`; ambas deben coincidir en host, puerto efectivo y base. Solo localhost/loopback con `opai_dev` u `opai_staging`, sin parámetros de conexión. Ningún endpoint Neon está autorizado todavía: el encargo identifica una rama prohibida (`br-dawn-morning-b6037bp9`), no su endpoint ni uno dev/staging permitido. Un nombre de base no demuestra la rama Neon. **Parcial:** habilitar la ejecución remota requiere registrar un endpoint dev/staging verificado; no se inventa ni se usa un secreto. `gard-staging` es un tenant; el script no crea ramas ni bases y no hay evidencia de su ubicación remota actual.
6. **QA H0/H1:** el test del borde usa URL ficticia e importación diferida (patrón `actor.test.ts`), sin conexión real. Monto es-CL: coma decimal, puntos de miles, inválido con error visible; resumen y avisos con formato es-CL. El e2e comprueba que `10,5` persiste como 10.5 en `core.me`.

Adaptaciones técnicas de OpenCode, no decisiones nuevas atribuidas a Carlos: guarda conservadora del seed remoto y fallo cerrado del servicio cuando se restringe al responsable. No cambia el plan de ROADMAP. Autorrevisión con subagente: hallazgos de alcance, precisión y formato corregidos; el Revisor externo sigue pendiente.

Las capturas heredadas ajenas al alcance se conservan en un stash independiente, sin publicarlas como evidencia nueva. No se editó la migración `20261028030000_identidad_servicio`, no se agregaron migraciones ni se tocó Neon, workflows, keys reales o producción.

### Gate de la continuación del 27-oct (OpenCode)

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (899/899): verdes.
- `pnpm test:db`: 90 DB + 64 capacidades + 6 auth, verdes contra las bases locales aisladas de esta rama.
- `pnpm build` y `pnpm presupuesto`: verdes (build recuperado de caché de Turbo); Agentes 170,9/176 KB, sin subir topes.
- H0: test del borde con `DATABASE_URL` y `DATABASE_URL_MIGRATE` eliminadas del entorno, 6/6.
- E2E: identidad de servicio 6/6 (claro/oscuro, 375/1024/1280) y portal-sesión 3/3. Servidor dev iniciado explícitamente desde este worktree en 3070, sin reutilizar otro servidor; base local aislada `opai_e2e_core_identidad_servicio_agentes`.
- Autorrevisión de subagente repetida: sin bloqueantes, apto para revisión externa. Logs en `/tmp/opencode/pr70-continuacion/`. CI y APROBAR externo no se sustituyen por este gate local.
