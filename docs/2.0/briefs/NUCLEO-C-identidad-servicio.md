# NÚCLEO-C · Identidad de servicio para agentes

## Fuente y alcance

Encargo de Carlos del 26-oct-2026, t457u (20:47 CLT): «ponlo entonces en el plan de desarrollo para que todo se haga y lo que debamos hacer en el nucleo lo hagamos altiro. Me preocupa que, quede como, cien por ciento agéntico».

Base: ADR-032 §3, ADR-033 y ADR-034 §1. Dependencia #60 integrada, incluida su protección de `roleId`. El agregado del encargo exige bloquear también cambios de rol base y promociones a owner por API keys (review 5661003883, mandatos t365u y t366u).

Decisión de Carlos del 26-oct-2026 21:07, t461s2118: gard-staging, una key por bot y permisos mínimos; OPAI 2.0 revoca la key owner `*` de gard cuando funcionen las nuevas y aplica el seed en Neon tras la aprobación. La URL MCP se corta cuando los bots usen Authorization. Este encargo no ejecuta esas acciones (ni el seed ni la revocación).

ADR definitivo: ADR-051 (`docs/2.0/01-decisiones.md`).

## Estado: listo para revisión

Continuación de un checkpoint de OpenCode (sesión cortada sin commitear). Se conservó el trabajo correcto heredado, se completó lo parcial y se corrigieron los bloqueantes de la autorrevisión previa.

## Criterios de aceptación, uno por uno

0. **Main integrado:** rama al día con `origin/main` (15c9317, incluye #56, #62 y #64); 0 commits detrás al momento de abrir el PR. **OK.**
1. **Permisos finos:** dominio puro (`packages/domain/src/permisos-key.ts`) con intersección; `core.apikeys.create`/`update` validan el catálogo y rechazan delegación superior (`normalizarPermisosRol` sobre el acceso efectivo del creador). Pruebas negativas en `identidad-servicio.test.ts` y `permisos-key.test.ts`. **OK.**
2. **Servicio:** permisos explícitos, sin rol heredado, presupuesto positivo obligatorio (también a nivel de base: `CHECK api_keys_servicio_configurado`), `soloPersonas` preservado, alcance completo del tenant (nunca el del creador) y rechazo si el creador tiene alcance restringido (no amplía su propio alcance), etiqueta «agente `<nombre>` (servicio)» en actividad. Probado en capacidades (`identidad-servicio.test.ts`) y en el borde (`api-key-servicio.test.ts`, con `contextoDeApiKey`). **OK.**
3. **Presupuesto atómico:** ledger mensual (`core.gasto_agente_mes`) con `pg_advisory_xact_lock` por tenant/key; chequeo y consumo en la misma transacción. `test:db` con 20 cargos paralelos y tope 10: solo 10 aceptados, un aviso por umbral. El costo ya incurrido con un proveedor (IA, mapas, correo, almacenamiento) se registra siempre, aunque supere el tope de esa llamada (`yaIncurrido` en `consumirPresupuesto`/`registrarConsumo`): antes se perdía sin trazabilidad al silenciar el `BUDGET_EXCEEDED` de la medición post-hoc, y la key seguía gastando sin que el ledger lo reflejara nunca. Ahora la llamada en curso se completa y se mide completa; la SIGUIENTE llamada corta en el prepago de `capacidad.ejecucion` (BRIEF-02 §4.9). Si el tope cambia a mitad de período, los avisos del 80 %/100 % de ese período se reinician (si no, un tope nuevo nunca volvería a avisar bajo la marca del tope anterior). Pruebas en `presupuesto-db.test.ts`. **OK.**
4. **Staging:** script `seed:staging` idempotente (crea `gard-staging`, su catálogo, el responsable de gobierno y la key «Grokbot dev»); no se ejecuta en este PR (el operador lo corre en Neon tras la aprobación). Dos correcciones sobre el borrador heredado: (a) la fila de la key se crea ANTES de escribir el archivo del secreto, así que un fallo de la base nunca deja un archivo huérfano que bloquee el reintento con `wx`; (b) la validación de que `STAGING_KEY_FILE` queda fuera del repositorio compara por segmentos de ruta (nunca `.startsWith("..")` sobre el string: un directorio real llamado `..secret` también «empieza con `..`» y pasaría el chequeo naíf) y resuelve enlaces simbólicos de ambos lados con `realpath`. Pruebas en `seed-staging.test.ts` (unitarias, sin tocar la base). **OK.**
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

Correcciones H0, H1, H2, H3, H6, H8 y H10 implementadas parcialmente: falta verificar el flujo completo y la persistencia del monto en e2e. El parseo admite hasta seis decimales y el máximo del contrato existente (US$ 100.000). No hay decisiones de negocio nuevas. La validación del gate está bloqueada: la base local de test rechaza inserciones de `audit_events` por una restricción NOT NULL. No se modificó la migración ni se aplicaron migraciones. Deben repetirse todas las pruebas y la autorrevisión antes de publicar.
