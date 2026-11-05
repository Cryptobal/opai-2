<!-- Contrato: AGENTS.md y OPERACION-agentes.md A2 (ADR-077). Integra la sesión de Claude Code con squash cuando los cuatro checks obligatorios están en verde sobre el head, no hay veto, migración aplicada por el bot si corresponde, revisión final de la sesión (SHA + sin bloqueos o bloqueos concretos) y OK visual de Carlos si hay cambio visual (A2.10). El bot «OPAI 2.0» no integra. Revisor Grok Bot solo bajo demanda de Carlos o riesgo grave.

**Veto y migración pendiente (ADR-043 v3, ajustado por ADR-054 y ADR-060; la autoría humana rige para el veto).**
1. Carlos veta un PR con un comentario cuya primera línea es exactamente `VETO`, o con la etiqueta `veto`. Cada forma se levanta por su lado: la etiqueta, quitándola; el comentario, con un comentario posterior cuya primera línea es exactamente `VETO LEVANTADO`. Si hay ambos, hay que levantar los dos.
2. Un PR con migraciones nuevas en `packages/db/prisma/migrations/` lleva la etiqueta `migracion-pendiente`, que pone quien abre el PR. La quita el bot «OPAI 2.0» después de aplicar la migración con respaldo en Neon `dev` y `main` (ADR-054).
3. Lo que bloquea (la etiqueta `veto`, un comentario `VETO` o la etiqueta `migracion-pendiente`) cuenta siempre, venga de donde venga, incluida la app «claude». Para levantar (quitar `veto`, comentar `VETO LEVANTADO` o quitar `migracion-pendiente`) solo cuentan los eventos sin `performed_via_github_app` (excluye lo hecho por apps como «claude»; lo hecho con `gh` o un PAT de `Cryptobal` no se distingue, por eso lo prohíbe la regla 4). La cuenta `Cryptobal` la usan Carlos y los bots, así que la cuenta sola no basta. Un evento que no cumple la regla no levanta un veto ni retira una migración pendiente. Desde ADR-054, para `migracion-pendiente` este criterio de autoría no se aplica: su retirada es válida si la hizo el bot «OPAI 2.0» y antes dejó en el PR su aviso de migración aplicada con respaldo en `dev` y `main`; el criterio de `performed_via_github_app` queda para `veto` y `VETO LEVANTADO`.
4. Ningún bot ni agente escribe comentarios `VETO` o `VETO LEVANTADO` ni pone o quita las etiquetas `veto` y `migracion-pendiente`, y ningún agente usa `gh`, un PAT ni la API con la cuenta `Cryptobal` para esos comentarios o etiquetas. Excepciones: quien abre un PR con migración pone `migracion-pendiente`, y el bot «OPAI 2.0» la quita, por el medio que use para operar el PR, después de aplicar la migración con respaldo y dejar el aviso en el PR (ADR-054).
5. Antes de integrar, la sesión de Claude revisa con esta regla los comentarios del PR y el historial de sus etiquetas. No se integra si hay un veto vigente, si `migracion-pendiente` está puesta, si el PR trae migraciones nuevas y la etiqueta no está sin que su última retirada sea un evento válido (incluido el caso en que nunca se puso), o si no puede verificarlo. Si hay cambio visual, sin OK o delegación explícita de Carlos (A2.10).
-->

**Tarea:** Fixes CAR-\_\_\_

## Qué cambia

<!-- Brief o encargo (enlace), qué se hizo y por qué. Diferencias con el brief y su motivo. -->

## Resumen ejecutivo para Carlos

<!-- Máximo 5 líneas: qué se hizo, qué cambia para Gard, qué decide Carlos, qué sigue. -->

## Evidencia

<!-- Capturas a 375 y 1280 px (viewport y tema), link de la preview. Comandos ejecutados y resultados reales. Rendimiento: medición antes y después (ADR-045). Si hay cambio visual en PR no desplegado: comentario `REVISIÓN VISUAL CARLOS:` con preview verificado, rutas y puntos de usabilidad (OPERACION-agentes.md A2.10). -->

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
- [ ] Autorrevisión con subagente y **revisión final** en comentario del PR (SHA del head + `sin bloqueos` o bloqueos concretos en seguridad, RLS, permisos, migraciones y datos; A2.2).
- [ ] Con **cambio visual:** Carlos recibió enlace usable, qué cambió y qué revisar; comentario `REVISIÓN VISUAL CARLOS:` si el preview del PR aún no está en `test.opai.cl`; OK visual o delegación explícita antes de integrar (A2.10).
- [ ] Con pantallas: pruebas de ingeniería a 375, 1024 y 1280 px si la sesión las corre; no sustituyen el vistazo de Carlos.
- [ ] Si porta algo de 1.0: revisado con `docs/2.0/checklists/paridad.md`. OPAI 1.0 no se tocó.
- [ ] PR vinculado a su tarea de Linear (campo «Tarea» arriba); `docs/2.0/ROADMAP.md` actualizado si cambia el plan.
- [ ] Migraciones: ninguna / aditivas, desde `packages/db/prisma/plantilla-migracion.sql` (`BEGIN`, `SET LOCAL lock_timeout`, `COMMIT` y sección `-- Reversión:`; ver `docs/2.0/migraciones.md`), con la etiqueta `migracion-pendiente` puesta por quien abre el PR; el bot «OPAI 2.0» las aplica con respaldo en Neon `dev` y `main` y quita la etiqueta (ADR-054). El check `migración pendiente` queda rojo mientras la etiqueta esté puesta.
