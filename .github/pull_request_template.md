<!-- Contrato: AGENTS.md. Un PR por encargo, desde `main` actualizado. No se integra desde aquí: el merge lo hace Carlos. -->

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
- [ ] `secretos` en verde y todos los checks de arriba en verde en el último commit; los topes de JS no suben, salvo excepción aprobada por Carlos y registrada en `ESTADO.md` (regla en `AGENTS.md`).
- [ ] Gate local corrido antes de cada commit (`pnpm typecheck && pnpm lint && pnpm test`) y `pnpm test:db` si toca base o RLS.
- [ ] Multi-tenant: toda tabla nueva con `tenant_id` tiene RLS y la política `tenant_isolation`; todo acceso pasa por `forTenant` o `enTransaccion`; no hay `$queryRaw` fuera de `enTransaccion`; `dbAdmin` solo en migraciones y seeds.
- [ ] Paridad: lo que hace la pantalla existe como capacidad en `/api/v1` y en MCP; las escrituras tienen `dryRun`.
- [ ] Sin secretos en el código, los tests ni la descripción, y sin datos personales copiados (se enlaza la pantalla).
- [ ] Autorrevisión con subagente hecha con `docs/2.0/checklists/revision.md`.
- [ ] Con pantallas: probadas a 375, 1024 y 1280 px, en claro y oscuro, con `docs/2.0/checklists/qa.md`.
- [ ] Si porta algo de 1.0: revisado con `docs/2.0/checklists/paridad.md`. OPAI 1.0 no se tocó.
- [ ] PR vinculado a su tarea de Linear (campo «Tarea» arriba); `docs/2.0/ROADMAP.md` actualizado si cambia el plan.
- [ ] Migraciones: ninguna / aditivas y listas para que Carlos las aplique en Neon `dev` y `main` antes del merge.
