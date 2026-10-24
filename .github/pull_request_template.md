<!-- Contrato: AGENTS.md. Un PR por encargo, desde `main` actualizado. Integra solo el bot «OPAI 2.0», con squash, cuando el Revisor escribió APROBAR sin condiciones citando el SHA del head actual, los checks obligatorios están en verde sobre ese SHA, la rama no está «behind» y, si toca pantallas, no hay nada con la etiqueta `qa-bloqueante` (ADR-043 v3). Cualquier push, incluido traer `main`, invalida la aprobación y exige re-revisión. Carlos puede vetar con «VETO» o la etiqueta `veto`. Sin force-push ni rebase. -->

## Qué cambia

<!-- Brief o encargo (enlace), qué se hizo y por qué. Diferencias con el brief y su motivo. -->

## Resumen ejecutivo para Carlos

<!-- Máximo 5 líneas: qué se hizo, qué cambia para Gard, qué decide Carlos, qué sigue. -->

## Definición de terminado

- [ ] Cumple el brief o el encargo; las diferencias están reportadas arriba.
- [ ] CI en verde en el último commit: `typecheck · lint · test · test:db`, `build · presupuesto de JS` y `secretos`.
- [ ] Gate local corrido antes de cada commit (`pnpm typecheck && pnpm lint && pnpm test`) y `pnpm test:db` si toca base o RLS.
- [ ] Multi-tenant: toda tabla nueva con `tenant_id` tiene RLS y la política `tenant_isolation`; todo acceso pasa por `forTenant` o `enTransaccion`; no hay `$queryRaw` fuera de `enTransaccion`; `dbAdmin` solo en migraciones y seeds.
- [ ] Paridad: lo que hace la pantalla existe como capacidad en `/api/v1` y en MCP; las escrituras tienen `dryRun`.
- [ ] Sin secretos en el código, los tests ni la descripción.
- [ ] El presupuesto de JS no sube (o hay una excepción aprobada por Carlos en `ESTADO.md`).
- [ ] Autorrevisión con subagente hecha con `docs/2.0/checklists/revision.md`.
- [ ] Con pantallas: probadas a 375, 1024 y 1280 px, en claro y oscuro, con `docs/2.0/checklists/qa.md`.
- [ ] Si porta algo de 1.0: revisado con `docs/2.0/checklists/paridad.md`. OPAI 1.0 no se tocó.
- [ ] `docs/2.0/ESTADO.md` y `docs/2.0/ROADMAP.md` actualizados.
- [ ] Migraciones: ninguna / aditivas y listas para que Carlos las aplique en Neon `dev` y `main` antes del merge (con migraciones nuevas, el Revisor pone `migracion-pendiente`; el bot no integra hasta que Carlos la aplica y quita la etiqueta).

## Validación

<!-- Comandos ejecutados y resultados reales. Pantallas: capturas a 375 y 1280 px. Rendimiento: medición antes y después (ADR-045). -->
