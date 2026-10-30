<!-- Contrato: AGENTS.md. Un PR por encargo, desde `main` actualizado. Integra solo el bot «OPAI 2.0», con squash, cuando el «Revisor OPAI 2.0» hizo su pasada única sobre el head actual (o sobre el delta, tras un push) sin bloqueos de seguridad, migraciones o datos, los checks obligatorios están en verde sobre ese SHA, la rama no está «behind», no hay veto vigente y, si trae migración, el bot ya la aplicó con respaldo en `dev` y `main` (ADR-043 v3, ajustado por ADR-054). Sin force-push ni rebase: `main` se trae con merge.

**Veto y migración pendiente (ADR-043 v3, ajustado por ADR-054; la autoría humana rige para el veto).**
1. Carlos veta un PR con un comentario cuya primera línea es exactamente `VETO`, o con la etiqueta `veto`. Cada forma se levanta por su lado: la etiqueta, quitándola; el comentario, con un comentario posterior cuya primera línea es exactamente `VETO LEVANTADO`. Si hay ambos, hay que levantar los dos.
2. Un PR con migraciones nuevas en `packages/db/prisma/migrations/` lleva la etiqueta `migracion-pendiente`, que pone quien abre el PR. La quita el bot «OPAI 2.0» después de aplicar la migración con respaldo en Neon `dev` y `main` (ADR-054).
3. Lo que bloquea (la etiqueta `veto`, un comentario `VETO` o la etiqueta `migracion-pendiente`) cuenta siempre, venga de donde venga, incluida la app «claude». Para levantar (quitar `veto`, comentar `VETO LEVANTADO` o quitar `migracion-pendiente`) solo cuentan los eventos sin `performed_via_github_app` (excluye lo hecho por apps como «claude»; lo hecho con `gh` o un PAT de `Cryptobal` no se distingue, por eso lo prohíbe la regla 4). La cuenta `Cryptobal` la usan Carlos y los bots, así que la cuenta sola no basta. Un evento que no cumple la regla no levanta un veto ni retira una migración pendiente. Desde ADR-054, para `migracion-pendiente` este criterio de autoría no se aplica: su retirada es válida si la hizo el bot «OPAI 2.0» y antes dejó en el PR su aviso de migración aplicada con respaldo en `dev` y `main`; el criterio de `performed_via_github_app` queda para `veto` y `VETO LEVANTADO`.
4. Ningún bot ni agente escribe comentarios `VETO` o `VETO LEVANTADO` ni pone o quita las etiquetas `veto` y `migracion-pendiente`, y ningún agente usa `gh`, un PAT ni la API con la cuenta `Cryptobal` para esos comentarios o etiquetas. Excepciones: quien abre un PR con migración pone `migracion-pendiente`, y el bot «OPAI 2.0» la quita, por el medio que use para operar el PR, después de aplicar la migración con respaldo y dejar el aviso en el PR (ADR-054).
5. Antes de integrar, el bot «OPAI 2.0» revisa con esta regla los comentarios del PR y el historial de sus etiquetas. No integra si hay un veto vigente, si `migracion-pendiente` está puesta, si el PR trae migraciones nuevas y la etiqueta no está sin que su última retirada sea un evento válido (incluido el caso en que nunca se puso), o si no puede verificarlo.
-->

**Tarea:** Fixes CAR-\_\_\_

## Qué cambia

<!-- Brief o encargo (enlace), qué se hizo y por qué. Diferencias con el brief y su motivo. -->

## Resumen ejecutivo para Carlos

<!-- Máximo 5 líneas: qué se hizo, qué cambia para Gard, qué decide Carlos, qué sigue. -->

## Evidencia

<!-- Capturas a 375 y 1280 px (viewport y tema), link de la preview. Comandos ejecutados y resultados reales. Rendimiento: medición antes y después (ADR-045). -->

**Loom y minuto, si aplica:**

## Checks

- [ ] `typecheck`
- [ ] `lint`
- [ ] `test`
- [ ] `test:db`
- [ ] `build · presupuesto de JS`

## Definición de terminado

- [ ] Cumple el brief o el encargo; las diferencias están reportadas arriba.
- [ ] `secretos` en verde y todos los checks de arriba en verde en el último commit; si sube un tope de JS, la justificación está en este PR (manda el check de presupuesto; ADR-043 v3).
- [ ] Gate local corrido antes de cada commit (`pnpm typecheck && pnpm lint && pnpm test`) y `pnpm test:db` si toca base o RLS.
- [ ] Multi-tenant: toda tabla nueva con `tenant_id` tiene RLS y la política `tenant_isolation`; todo acceso pasa por `forTenant` o `enTransaccion`; no hay `$queryRaw` fuera de `enTransaccion`; `dbAdmin` solo en migraciones y seeds.
- [ ] Paridad: lo que hace la pantalla existe como capacidad en `/api/v1` y en MCP; las escrituras tienen `dryRun`.
- [ ] Sin secretos en el código, los tests ni la descripción, y sin datos personales copiados (se enlaza la pantalla).
- [ ] Autorrevisión con subagente hecha con `docs/2.0/checklists/revision.md`.
- [ ] Con pantallas: probadas a 375, 1024 y 1280 px, en claro y oscuro, con `docs/2.0/checklists/qa.md`.
- [ ] Si porta algo de 1.0: revisado con `docs/2.0/checklists/paridad.md`. OPAI 1.0 no se tocó.
- [ ] PR vinculado a su tarea de Linear (campo «Tarea» arriba); `docs/2.0/ROADMAP.md` actualizado si cambia el plan.
- [ ] Migraciones: ninguna / aditivas, desde `packages/db/prisma/plantilla-migracion.sql` (`BEGIN`, `SET LOCAL lock_timeout`, `COMMIT` y sección `-- Reversión:`; ver `docs/2.0/migraciones.md`), con la etiqueta `migracion-pendiente` puesta por quien abre el PR; el bot «OPAI 2.0» las aplica con respaldo en Neon `dev` y `main` y quita la etiqueta (ADR-054). El check `migración pendiente` queda rojo mientras la etiqueta esté puesta.
