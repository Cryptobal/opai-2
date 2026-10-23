# ESTADO — OPAI 2.0

**Última actualización:** 23-oct-2026 (madrugada) · **Actualizado por:** Claude (arquitectura) · **Fase en curso:** 0 — Fundación (código y DS listos; falta infraestructura)

Este archivo es la fuente de verdad del avance. Cada brief lo actualiza al terminar. Si algo no está aquí, no está hecho.

## Hecho

- Decisión de construir OPAI 2.0 desde cero (ver `01-decisiones.md`, ADR-001 a ADR-013).
- Documento de arranque, registro de decisiones, contexto para agentes e instrucciones del proyecto Claude en `docs/2.0/`.
- Design Prompt de fundamentos del DS 2.0 en `docs/2.0/design/DESIGN-PROMPT-ds-2.0-fundamentos.md`.
- **Brief 00 (Fundación) ejecutado, bloques 1 a 8 y 10** (commits `22a630d` → `d08a676`):
  - Monorepo pnpm + Turborepo, TypeScript estricto, ESLint 10 con reglas del proyecto (150 líneas, Prisma solo en `packages/db`, dominio puro), Prettier, Vitest 5.
  - `packages/db`: Prisma 7 (`prisma-client` + `@prisma/adapter-pg`), esquemas en `prisma/schema/` (`core.prisma` con `Tenant` y `AuditEvent`), migración inicial con rol `opai_app` (NOBYPASSRLS), grants, RLS y política `tenant_isolation`; `forTenant(tenantId)` fija `app.tenant_id` por transacción; `dbAdmin()` solo para scripts; scripts de contraseña del rol y seed del tenant `gard`. **Test de aislamiento en verde contra Postgres 16 real** (dos tenants, cero fuga, cero filas sin tenant, escritura cruzada rechazada).
  - `packages/domain`: dinero CLP en enteros, redondeo contable, IVA, UF escalada, formato chileno; 8 tests.
  - `packages/capabilities`: `defineCapability`, registro, `executeCapability` (valida input y output, autoriza, ejecuta, audita escrituras reales con actor y clave de idempotencia, `dryRun`), handler HTTP para `/api/v1`, `defineModule`/`registrarModulos`; 15 tests.
  - `packages/ds` (DS 2.0 provisional, ADR-013): `tokens.css` neutro marcado PROVISIONAL, componentes base propios, `AppShell` (bottom nav 375 / riel 1024 / barra lateral 1280, selector de portal, safe-area), cinco patrones con `state` y cuatro estados.
  - `apps/web`: Next.js 16 (Turbopack, Cache Components), route groups por portal con una página cada uno, `GET /api/health`, `/api/v1/[...capability]` (503 en producción hasta el Brief 01), página `/ds` solo fuera de producción. Build de producción verificado; capturas de `/ds` a 375 y 1024 en `apps/web/e2e/__screenshots__/`.
  - `modules/registry` (`@opai/modules`) y `pnpm scaffold:module <id> --nombre` (verificado con un módulo de prueba, luego eliminado).
  - `CLAUDE.md`, `README.md`, `.env.example`, CI (`typecheck`, `lint`, `test`, `test:db` con Postgres 16 como servicio).
  - Gate completo en verde: `pnpm typecheck && pnpm lint && pnpm test` (27 tests) y `pnpm test:db` (4 tests).
- **Brief 00b ejecutado: DS 2.0 definitivo** (ADR-014). Diseño aprobado por Carlos en Claude Design; export guardado en `docs/2.0/design/export-ds-2.0/` (40 pantallas). `tokens.css` reemplazado por los valores aprobados (Inter + JetBrains Mono autoalojadas, índigo, neutros, modo oscuro verdadero), `styles.css` con estilos tipográficos; componentes, shell (barra superior con selector de portal, barra inferior, riel, barra lateral con tenant y usuario) y patrones ajustados al diseño; nuevos `Chip`, `ChipAgregar`, `Avatar`, `Monograma`, `PortalSwitcher`. Revisado visualmente a 375, 1024 y 1280 en claro y oscuro; build y gate en verde; capturas actualizadas.

## En curso

- **Carlos (Mac, 10–15 min):** ejecutar `docs/2.0/briefs/BRIEF-00-infra.md` en Claude Code (Neon, Vercel, `test.opai.cl`, rol y tenant). Alternativa parcial desde el teléfono: importar el repo en Vercel (root `apps/web`), crear la base Neon desde Storage y agregar el dominio; las migraciones y el rol se hacen igual desde el Mac.

## Pendiente (siguiente)

- Evaluar Radix/shadcn para Combobox con búsqueda, Dialog y Menú cuando el primer módulo los necesite (Comercial).
- Brief 01 — Núcleo mínimo (auth, usuarios, roles y permisos, tenants y Plataforma mínima, módulos y entitlements, cuentas, contactos, instalaciones, cargos y estructuras, archivos y PDF, configuración declarativa, MCP con API keys, telemetría, selector de portal real, diccionario de vertical).
- Extracción de 1.0 para Comercial y CPQ → `docs/2.0/extraccion/`.
- Modelo de planes y facturación de suscripciones: cuando exista Opai SpA (en creación).

## Versiones instaladas

Node 22 · pnpm 10.28 · Next.js 16.4.2 · React 19.3.0 · Tailwind 4.3.3 · Prisma 7.10.1 (estable; 8 está en RC) · TypeScript 5.9.3 (7.0 existe pero se mantiene 5.x por compatibilidad del ecosistema) · ESLint 10.13 + typescript-eslint 8.72 · Vitest 5.0.5 · Playwright 1.64 · Turborepo 2.11 · Zod 4.6 · lucide-react 1.61.

## Infraestructura

- Repositorio: `Cryptobal/opai-2`, rama `main`. CI en GitHub Actions.
- Vercel: **pendiente** (el conector de Vercel en Claude no tiene permiso para crear proyectos; se crea desde el Mac con `vercel link` o desde el panel). Región de funciones: `gru1` (`apps/web/vercel.json`).
- Neon: **pendiente** (BRIEF-00-infra, paso 1). Región sugerida `aws-sa-east-1`.
- Dominio: `test.opai.cl` (construcción) · `app.opai.cl` (producción, futuro). `opai.cl` está en Cloudflare; el registro debe ser DNS only.
- Tenant de desarrollo: `gard` — id: (lo imprime `seed:dev-tenant`).

## Decisiones tomadas durante la ejecución

- `/ds` en vez de `/_ds`: en App Router las carpetas con `_` son privadas y no generan ruta. Sigue siendo solo fuera de producción (404 en producción, verificado).
- RLS con `ENABLE` y no `FORCE`: el rol propietario (migraciones, importaciones, seeds) debe poder escribir en todos los tenants; la aplicación solo se conecta como `opai_app`, que no puede saltarse la RLS. El test de aislamiento lo prueba. La política usa `NULLIF(current_setting('app.tenant_id', true), '')::uuid` para que una sesión sin tenant devuelva cero filas en vez de error.
- Componentes base propios (Button, Input, Select, Badge, Card, Tabs, Sheet, Table, Skeleton) en vez de la CLI de shadcn: el diseño aún no existe y la CLI escribe en la app, no en el paquete. shadcn/Radix se evalúa en el Brief 00b con el diseño aprobado.
- Registro de módulos como paquete `modules/registry` (`@opai/modules`) en vez de `modules/index.ts`: Next necesita un paquete resoluble. Los módulos se compilan sin listarlos en `transpilePackages` (verificado con build).
- `prisma generate` en `postinstall` de `@opai/db` para que el build de Vercel tenga el cliente; `prisma.config.ts` usa un placeholder cuando falta `DATABASE_URL_MIGRATE` para que `generate` no falle.
- Con `cacheComponents` activo no se usa `export const dynamic`; los route handlers ya son dinámicos por defecto.
- Formato: Prettier en código; `docs/` excluido para no reescribir los documentos.
- Título de página en iPad y desktop en la barra superior del shell (como en el diseño); el patrón lo muestra solo en teléfono. La acción principal queda en el patrón (una fila bajo la barra en iPad/desktop) para no acoplar shell y patrón.

## Riesgos y pendientes materiales

- Sin infraestructura aún no hay `test.opai.cl`; todo lo demás está verificado localmente y en CI.
- Pendientes de diseño para módulos: patrón de vista dividida (lista + detalle en iPad, como `DetailTablet.html`), paleta de comandos ⌘K, menú de usuario, Combobox con búsqueda. Se diseñan con el módulo que los necesite.
