<!-- Contrato: AGENTS.md. Un PR por encargo, desde `main` actualizado. Integra solo el bot «OPAI 2.0», con squash, cuando el Revisor escribió APROBAR sin condiciones citando el SHA del head actual, los checks obligatorios están en verde sobre ese SHA, la rama no está «behind» y, si toca pantallas, no hay nada con la etiqueta `qa-bloqueante` (ADR-043 v3). Cualquier push, incluido traer `main`, invalida la aprobación y exige re-revisión. Sin `migracion-pendiente` ni veto vigente: el veto («VETO» o etiqueta `veto`) y el retiro de esas etiquetas solo cuentan si los hace Carlos en persona (cuenta `Cryptobal` sin app de por medio). Sin force-push ni rebase. -->

**Tarea:** Fixes OPAI-\_\_\_

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
- [ ] Migraciones: ninguna / aditivas y listas para que Carlos las aplique en Neon `dev` y `main`. Con migración nueva, quien abre el PR le pone la etiqueta `migracion-pendiente`; solo Carlos en persona la quita tras aplicarla, y el bot no integra mientras esté puesta o si su retiro no es verificable.
