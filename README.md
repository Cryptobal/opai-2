# OPAI 2.0

SaaS modular, multi-tenant y agent-first para empresas intensivas en personal y servicios distribuidos (seguridad, aseo, outsourcing, mantenimiento).

- Arranque y arquitectura: [`docs/2.0/00-documento-de-arranque.md`](docs/2.0/00-documento-de-arranque.md)
- Decisiones (ADR): [`docs/2.0/01-decisiones.md`](docs/2.0/01-decisiones.md)
- Estado de las tareas: Linear (equipo OPAI; reglas en [`AGENTS.md`](AGENTS.md)). Foto técnica: [`docs/2.0/ESTADO.md`](docs/2.0/ESTADO.md)
- Briefs de implementación: [`docs/2.0/briefs/`](docs/2.0/briefs/)
- Diseño (prompts para Claude Design y exports aprobados): [`docs/2.0/design/`](docs/2.0/design/)
- Reglas para Claude Code: [`CLAUDE.md`](CLAUDE.md)

## Comandos

```bash
pnpm install                 # instala y genera el cliente Prisma
pnpm dev                     # apps/web en http://localhost:3000 (y /ds con el sistema de diseño)
pnpm typecheck && pnpm lint && pnpm test   # gate obligatorio antes de cada commit
pnpm test:db                 # test de aislamiento RLS (requiere DATABASE_URL_TEST)
pnpm db:migrate              # crea una migración (DATABASE_URL_MIGRATE)
pnpm db:deploy               # aplica migraciones (solo con instrucción explícita)
pnpm scaffold:module <id> --nombre "<Nombre>"   # crea y registra un módulo
```

Variables de entorno: ver [`.env.example`](.env.example). Nunca se commitean valores reales.

## Estructura

`apps/web` (Next.js, portales) · `packages/db` (Prisma, RLS por tenant) · `packages/domain` (lógica pura) · `packages/capabilities` (capacidades → UI, API, MCP) · `packages/ds` (DS 2.0) · `packages/integrations` (adaptadores) · `modules/<id>` (módulos vendibles) · `docs/2.0` (memoria del proyecto).
