# Ahorro de GitHub Actions e integración con gate local (ADR-112)

- **Sesión:** Sesión Diseño
- **PR:** este PR · rama `ci/car-ahorro-actions` (ticket de Linear pendiente: Linear no respondía al abrirlo)
- **Estado:** En PR
- **Migración:** No

## Qué entra

- Los e2e completos (10 shards) dejan de correr en cada push a `main`. Siguen de noche, a mano y con la etiqueta `e2e`.
- `revision-diseno` solo corre con la etiqueta `revision-diseno`.
- Runner configurable con la variable de repositorio `RUNNER_LINUX`, para usar un runner propio sin tocar los workflows.
- `scripts/gate-local.sh` y `scripts/gate-local-visual.sh` para integrar mientras Actions esté bloqueado (`OPERACION-agentes.md` A2.11).

## Qué queda pendiente

- Arrendar un servidor Linux con Docker, registrarlo como runner del repo y definir `RUNNER_LINUX=self-hosted`. El registro lo hace Carlos.
- Reactivar la regla «Proteger main» cuando Actions vuelva a correr.

## Qué se decidió

- ADR-112 (Carlos, 13-nov-2026).
