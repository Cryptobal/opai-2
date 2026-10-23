# BRIEF DE IMPLEMENTACIÓN — 00 FUNDACIÓN

**Repositorio:** `Cryptobal/opai-2` · **Rama:** `main` · **Fecha:** 22-oct-2026

> **Cómo ejecutarlo (Carlos):** abre Claude Code en la carpeta del repo y dile: *"Lee y ejecuta `docs/2.0/briefs/BRIEF-00-fundacion.md` completo. Antes de empezar, lee `docs/2.0/00-documento-de-arranque.md` y `docs/2.0/01-decisiones.md`."* Deja que corra. Se detendrá solo en los puntos marcados **STOP**.

---

## 1. Objetivo

Dejar el monorepo listo para construir módulos sin volver a discutir estructura, convenciones ni infraestructura:

- Monorepo con tooling, gate de calidad y CI.
- `CLAUDE.md` con las reglas del proyecto.
- `packages/db` con Prisma, schema `core`, aislamiento por tenant con RLS y test que lo pruebe.
- `packages/capabilities` con el registro de capacidades y la API `/api/v1/`.
- `packages/ds` (DS 2.0) con tokens provisionales neutros (ADR-013; los definitivos llegan del diseño aprobado en Claude Design, Brief 00b), shell mobile e iPad first y los cinco patrones de pantalla con sus estados.
- Scaffold de módulo que genera un módulo vacío correcto.
- `apps/web` desplegada en `test.opai.cl` sobre un proyecto Neon propio.
- `docs/2.0/ESTADO.md` actualizado.

Sin auth, sin módulos de negocio, sin MCP, sin R2. Eso es el Brief 01 (Núcleo mínimo).

## 2. Estado actual del repo (verificado)

El repo contiene solo `README.md` y `docs/2.0/` (arranque, decisiones, este brief, contexto para agentes, instrucciones del proyecto). No hay código. Rama por defecto `main`.

## 3. Alcance

### Incluido

- Bloques 0 a 10 de la sección 11.

### Excluido

- Autenticación, usuarios, roles, API keys, MCP (Brief 01).
- Cualquier módulo de negocio.
- Cloudflare R2 y archivos (Brief 01).
- Sitio de marketing.
- Capacitor, Serwist, push (fase 3).

## 4. Arquitectura relevante

Ver `docs/2.0/00-documento-de-arranque.md` secciones 3, 4 y 5, y `docs/2.0/01-decisiones.md` ADR-002, 003, 004, 007, 011 y 013. Este brief implementa la base de cada uno.

Versiones: usar la **última versión estable** de Next.js, React, Tailwind, Prisma, Vitest, Playwright, Turborepo y pnpm al momento de ejecutar; Node LTS vigente. Registrar las versiones elegidas en `ESTADO.md`. Si una versión estable cambia una API respecto de lo descrito aquí (por ejemplo, Tailwind o Prisma), conservar el objetivo y adaptar.

## 5. Archivos

Todos son **Archivo nuevo propuesto** salvo `README.md` (modificar).

| Ruta | Función |
|---|---|
| `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.nvmrc`, `.editorconfig`, `.gitignore`, `.env.example` | Raíz del monorepo |
| `tsconfig.base.json`, `eslint.config.mjs`, `prettier.config.mjs`, `vitest.workspace.ts` | Tooling compartido |
| `CLAUDE.md` | Reglas del proyecto (sección 11, bloque 7) |
| `apps/web/` | Next.js App Router, Tailwind, shadcn/ui, route groups, `/api/health`, `/api/v1/[...capability]`, página `/_ds` (solo dev) |
| `apps/web/vercel.json` | Región `gru1` |
| `packages/db/` | Prisma schema (`core`), extensión `forTenant`, SQL de roles y RLS, migración inicial, test de aislamiento |
| `packages/domain/` | Paquete vacío con estructura y un test de ejemplo (dinero: redondeo CLP) |
| `packages/capabilities/` | `defineCapability`, registro, handler HTTP, capacidad de ejemplo `core.ping` |
| `packages/ds/` | `tokens.css` (`@theme`, set provisional neutro según ADR-013), fuente del sistema, componentes base (shadcn), `AppShell`, patrones `ListScreen`, `DetailScreen`, `FormScreen`, `PlanillaScreen`, `DashboardScreen`, estados `Loading`, `Empty`, `ErrorState`, `Forbidden` |
| `packages/integrations/`, `packages/testing/` | Paquetes vacíos con README y estructura |
| `modules/README.md`, `modules/index.ts` | Registro de módulos (vacío) |
| `scripts/scaffold-module.ts`, `scripts/templates/module/` | Generador de módulo |
| `.github/workflows/ci.yml` | Gate en CI |
| `docs/2.0/ESTADO.md` | Estado del proyecto (modificar al final) |

## 6. Modelo de datos y migraciones

Schema de Postgres `core`. Dos modelos en este brief, suficientes para probar RLS y dejar lista la auditoría:

```prisma
model Tenant {
  id        String   @id @default(uuid(7)) @db.Uuid
  slug      String   @unique
  nombre    String
  vertical  String   // "seguridad" | "aseo" | "outsourcing" | "mantenimiento"
  timezone  String   @default("America/Santiago")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  @@map("tenants")
  @@schema("core")
}

model AuditEvent {
  id         String   @id @default(uuid(7)) @db.Uuid
  tenantId   String   @map("tenant_id") @db.Uuid
  actorType  String   @map("actor_type")   // "user" | "agent" | "system"
  actorId    String?  @map("actor_id")
  viaUserId  String?  @map("via_user_id")  // agente vía usuario
  capability String                        // "crm.lead.create"
  entityType String?  @map("entity_type")
  entityId   String?  @map("entity_id")
  payload    Json?
  createdAt  DateTime @default(now()) @map("created_at")
  @@index([tenantId, createdAt])
  @@map("audit_events")
  @@schema("core")
}
```

Reglas:

- `datasource` con `schemas = ["core"]`; cada módulo futuro agrega su schema.
- IDs `uuid(7)` (ordenables en el tiempo). Nombres de columna en `snake_case` vía `@map`.
- Dos URLs: `DATABASE_URL` (rol `opai_app`, sin `BYPASSRLS`, conexión pooled) para la aplicación; `DATABASE_URL_MIGRATE` (rol propietario, conexión directa) solo para migraciones. La app nunca usa el rol propietario.
- La migración inicial incluye SQL manual (agregado tras `prisma migrate dev --create-only`):
  - creación del rol `opai_app` si no existe (contraseña desde variable de entorno al ejecutar; nunca en el archivo),
  - `GRANT USAGE ON SCHEMA core`, `GRANT SELECT, INSERT, UPDATE, DELETE` sobre las tablas y `ALTER DEFAULT PRIVILEGES` para las futuras,
  - en `audit_events`: `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY` y política `tenant_isolation` con `USING (tenant_id = current_setting('app.tenant_id', true)::uuid)` y `WITH CHECK` igual,
  - `tenants` no lleva `tenant_id` (es el tenant); se protege por permisos de aplicación, no por RLS.
- Extensión Prisma en `packages/db/src/client.ts`: `db.forTenant(tenantId)` devuelve un cliente cuyas operaciones corren dentro de una transacción que ejecuta `SET LOCAL app.tenant_id = $1` antes de la consulta. Exportar también `dbAdmin` (rol propietario) solo para scripts y migraciones, con nombre que desaliente su uso.
- `prisma generate` en `postinstall` de `packages/db`. Las migraciones se aplican solo con `pnpm db:deploy` (explícito). `build` nunca migra.

## 7. Capacidades a registrar

| Capacidad | Módulo | Permiso | Efecto | dry_run |
|---|---|---|---|---|
| `core.ping` | core | ninguno (pública en este brief; en Brief 01 pasa a requerir sesión) | lectura | no |

`defineCapability` recibe: `id` (`<modulo>.<entidad>.<verbo>` o `<modulo>.<verbo>`), `permiso`, `input` y `output` (Zod), `efecto` (`"lectura" | "escritura" | "irreversible"`), `dryRun: boolean`, `handler(ctx, input)`. El `ctx` lleva `tenantId`, `actor` y `db` (ya acotado al tenant). En este brief `ctx` se construye con un tenant de desarrollo fijo tomado de `DEV_TENANT_ID` y actor `system`; la autenticación real llega en Brief 01. El handler HTTP `/api/v1/[...capability]` resuelve la capacidad por id, valida input, ejecuta y devuelve `{ ok, data }` o `{ ok: false, error: { code, message, issues } }`. Toda ejecución de capacidad con efecto distinto de lectura escribe en `audit_events`.

## 8. Interfaz y responsive

No hay pantallas de negocio. Sí hay DS 2.0:

- **Tokens (provisionales, ADR-013).** No portar nada de 1.0. Crear `packages/ds/src/tokens.css` como `@theme` de Tailwind con un set neutro: escala de grises de 10 pasos para fondo, superficie, borde y texto; un único acento temporal (azul neutro) usado solo para acción principal y foco; semánticos de estado `success`, `warning`, `danger`, `info`. Nombres semánticos obligatorios: `--ds-bg`, `--ds-surface`, `--ds-surface-raised`, `--ds-border`, `--ds-border-strong`, `--ds-fg`, `--ds-fg-muted`, `--ds-fg-subtle`, `--ds-accent`, `--ds-accent-fg`, `--ds-accent-muted`, `--ds-success`, `--ds-warning`, `--ds-danger`, `--ds-info` (con variantes `-fg` y `-muted` donde aplique) y `--ds-focus`. Modo claro y oscuro vía `prefers-color-scheme` y `[data-theme]`. Tipografía: `system-ui` hasta que el diseño aprobado defina la familia; escala tipográfica 12/13/14/16/18/22/28/36 y espaciado en base 4px. Encabezar el archivo con `/* PROVISIONAL — reemplazar con los tokens aprobados en Claude Design (Brief 00b). No agregar colores aquí ni en ningún otro lugar. */`. Los componentes solo usan nombres semánticos, de modo que el reemplazo posterior no los toque.
- **Breakpoints.** Base = teléfono (375px), `md` = 768 (iPad vertical), `lg` = 1024 (iPad apaisado), `xl` = 1280 (desktop). Toda pantalla debe ser plenamente usable en base y `lg`; `xl` solo agrega espacio.
- **AppShell.** Barra superior (título, selector de portal, usuario placeholder); navegación inferior con hasta 5 ítems en base; riel lateral compacto en `md`/`lg`; barra lateral expandida en `xl`. Padding con `env(safe-area-inset-*)`. Contenido con `max-width` y gutters de 16px en base.
- **Patrones** (en `packages/ds/src/patterns/`), cada uno con prop `state: "loading" | "empty" | "error" | "forbidden" | "ready"` y render estándar de los cuatro primeros:
  - `ListScreen`: cabecera con título y acción principal, búsqueda, slot de filtros, lista en tarjetas en base y tabla en `md+`, paginación.
  - `DetailScreen`: cabecera con título, estado y acciones; tabs; secciones.
  - `FormScreen`: secciones; barra de acciones fija abajo en base, a la derecha en `md+`.
  - `PlanillaScreen`: grilla con cabeceras de fila y columna fijas, scroll interno controlado, zoom de celda en base. Versión mínima funcional.
  - `DashboardScreen`: grilla de tiles de indicador y widgets.
- **Estados** (`Loading`, `Empty`, `ErrorState`, `Forbidden`) con ilustración simple de tokens, texto y acción opcional.
- **Página `/_ds`** (solo `NODE_ENV !== "production"`): muestra shell, los cinco patrones y los cuatro estados con datos de ejemplo del dominio genérico (personas, instalaciones, montos CLP). Sirve para la revisión visual a 375 y 1024.

## 9. Seguridad y tenant

- RLS forzada en toda tabla con `tenant_id`; rol de aplicación sin `BYPASSRLS`; test automático de aislamiento.
- `DATABASE_URL_MIGRATE` solo en la máquina de Carlos y, más adelante, en CI; nunca en Vercel.
- `/api/v1/` responde `404` para capacidades no registradas y `400` con issues de Zod para input inválido. Sin autenticación en este brief; `DEV_TENANT_ID` solo se lee fuera de producción, y en producción `/api/v1/` responde `503` hasta el Brief 01.
- `.env*` en `.gitignore`; `.env.example` con nombres, sin valores.

## 10. Casos límite

- `forTenant` con tenant inexistente: la consulta devuelve vacío, no error.
- Dos operaciones del mismo tenant en paralelo: cada una con su `SET LOCAL` en su transacción.
- Prisma puede exigir que `SET LOCAL` y la consulta vayan en la misma transacción interactiva; verificar en la versión instalada.
- Tailwind `@theme` y tokens con nombres de 1.0 que colisionen con utilidades de Tailwind: prefijar con `ds-`.
- Vercel con monorepo: el proyecto apunta a `apps/web` como root y pnpm se detecta por el lockfile en la raíz.
- Cloudflare delante de Vercel: el registro de `test.opai.cl` debe ser **DNS only** (nube gris), no proxied.

## 11. Plan de implementación

Un commit por bloque. Prefijos: `infra:`, `core:`, `ds:`, `docs:`. Mensajes en español, imperativo. Antes de cada commit: gate verde.

### Bloque 0 · Prerrequisitos

Verificar y **STOP** si falta alguno, indicando a Carlos exactamente qué correr:

```
node --version   (LTS vigente)   pnpm --version
gh auth status   vercel whoami   neonctl me   wrangler whoami
```

`wrangler` no se usa en este brief (R2 va en Brief 01) pero se verifica ahora. En este brief no se lee nada del repo de 1.0 (ADR-013: el DS no hereda de 1.0).

### Bloque 1 · Monorepo y tooling (`infra:`)

pnpm workspaces (`apps/*`, `packages/*`, `modules/*`), Turborepo con tareas `dev`, `build`, `typecheck`, `lint`, `test`; `tsconfig.base.json` estricto (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); ESLint flat config con typescript-eslint y reglas del proyecto:

- `no-restricted-imports`: `@prisma/client` prohibido fuera de `packages/db`; `next`, `react`, `@prisma/client` prohibidos en `packages/domain` y en `modules/*/domain`.
- `max-lines`: 150 por archivo (warning en tests).

Prettier; Vitest workspace; scripts raíz: `dev`, `build`, `typecheck`, `lint`, `test`, `test:db`, `db:generate`, `db:migrate` (crea migración, usa `DATABASE_URL_MIGRATE`), `db:deploy` (aplica, usa `DATABASE_URL_MIGRATE`), `scaffold:module`. `.nvmrc`, `.editorconfig`, `.gitignore`, `.env.example`.

### Bloque 2 · `apps/web` mínima (`core:`)

Next.js App Router con TypeScript, Tailwind y shadcn/ui inicializado contra `packages/ds`. Route groups vacíos con un `layout.tsx` cada uno: `(platform)`, `(erp)`, `(trabajador)`, `(terreno)`, `(cliente)`, `(supervisor)`. Página raíz `/` que muestra "OPAI 2.0 · fundación" dentro del `AppShell`. `GET /api/health` → `{ ok: true, version, commit }`. `vercel.json` con `regions: ["gru1"]`.

### Bloque 3 · `packages/ds` (`ds:`)

Tokens provisionales (sección 8), fuente del sistema, componentes base vía shadcn (button, input, select, card, sheet, dialog, tabs, table, badge, skeleton, toast), `AppShell`, los cinco patrones, los cuatro estados, página `/_ds`. Revisión visual obligatoria a 375 y 1024 con Playwright (screenshot de `/_ds` en ambos viewports guardada en `apps/web/e2e/__screenshots__/`, solo como evidencia; no test de regresión visual aún).

### Bloque 4 · `packages/db` (`core:`)

Prisma con `multiSchema`, modelos de la sección 6, extensión `forTenant`, SQL de rol y RLS dentro de la migración inicial, `dbAdmin` separado. Test `packages/db/test/rls.test.ts` (corre con `pnpm test:db` si existe `DATABASE_URL_TEST`): crea dos tenants, inserta eventos en cada uno, verifica que `forTenant(A)` ve solo A, que `forTenant(B)` ve solo B, y que una consulta con el rol de aplicación sin `SET LOCAL` devuelve cero filas. Se ejecuta contra la rama `dev` de Neon (bloque 9); si Neon aún no existe al llegar aquí, dejar el test listo y correrlo en el bloque 9.

### Bloque 5 · `packages/capabilities` (`core:`)

`defineCapability`, `registry` (mapa id → capacidad, con validación de ids duplicados al cargar), `executeCapability(ctx, id, input, { dryRun })` que valida, autoriza (en este brief solo verifica que el permiso sea `null`), ejecuta y audita; handler para `apps/web/app/api/v1/[...capability]/route.ts`; capacidad `core.ping`. Tests unitarios: id inexistente, input inválido, ejecución correcta, auditoría escrita para efecto `escritura` (con un fake de `db`).

### Bloque 6 · Scaffold de módulo (`core:`)

`pnpm scaffold:module <id> --nombre "<Nombre>"` crea `modules/<id>/` con `manifest.ts` (id, nombre, version, dependencias, permisos, navegacion, configuracion como esquema Zod, eventos), `schema.prisma` (fragmento con `@@schema("<id>")`), `domain/index.ts` + test de ejemplo, `capabilities/index.ts` con una capacidad `<id>.ping`, `ui/` con una `ListScreen` de ejemplo, `README.md`; y registra el módulo en `modules/index.ts`. Ejecutarlo con un módulo `ejemplo`, verificar que el gate pasa, y luego eliminar `modules/ejemplo` (dejar solo el generador).

### Bloque 7 · `CLAUDE.md`, `README.md`, `.env.example` (`docs:`)

Escribir `CLAUDE.md` con este contenido, adaptando solo rutas o comandos que hayan quedado distintos:

```markdown
# CLAUDE.md — OPAI 2.0

## Qué es esto
Monorepo de OPAI 2.0: SaaS modular, multi-tenant y agent-first para empresas intensivas en personal (seguridad, aseo, outsourcing, mantenimiento). Antes de cualquier tarea lee `docs/2.0/ESTADO.md` y `docs/2.0/01-decisiones.md`. El brief en curso está en `docs/2.0/briefs/`.

## Comandos
- `pnpm install` · `pnpm dev` · `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm test:db`
- `pnpm db:generate` · `pnpm db:migrate` (crea migración; usa DATABASE_URL_MIGRATE) · `pnpm db:deploy` (aplica; solo con instrucción explícita)
- `pnpm scaffold:module <id> --nombre "<Nombre>"`
- Gate obligatorio antes de cada commit: `pnpm typecheck && pnpm lint && pnpm test`
- Nunca: `prisma migrate reset`, borrar migraciones, commitear `.env*`, correr `db:deploy` contra un entorno no indicado, usar `dbAdmin` fuera de scripts y migraciones.

## Estructura
`apps/web` (app Next.js, route groups por portal) · `packages/db` (Prisma, RLS) · `packages/domain` (lógica pura) · `packages/capabilities` (registro → UI, API, MCP) · `packages/ds` (DS 2.0) · `packages/integrations` (adaptadores) · `modules/<id>` (módulos vendibles) · `docs/2.0` (memoria del proyecto).

## Reglas de código
- TypeScript estricto. Sin `any`, sin `@ts-ignore`, sin `as unknown as`.
- Archivos de hasta 150 líneas; dividir antes de superar.
- Dominio puro: `packages/domain` y `modules/*/domain` no importan `next`, `react` ni `@prisma/client`.
- Todo acceso a datos pasa por `db.forTenant(tenantId)`. Nunca el cliente Prisma crudo fuera de `packages/db`.
- Toda tabla de negocio: `tenant_id`, `created_at`, `updated_at`, RLS habilitada y forzada con política `tenant_isolation`. IDs `uuid(7)`. Columnas `snake_case`.
- Dinero: CLP en enteros; UF `Decimal(12,4)`; porcentajes `Decimal(7,4)`. Nunca float para dinero.
- Tiempo: `timestamptz` en UTC; zona del tenant para presentar; intervalos `[inicio, fin)`.
- Zod en el borde; tipos derivados de los esquemas.
- Toda consulta o mutación de negocio es una capacidad (`defineCapability`). UI, API y MCP solo invocan capacidades. Toda escritura expuesta acepta clave de idempotencia y soporta `dry_run`.
- Módulos: solo importan de `packages/*` y de módulos declarados en `dependencias` de su manifest. Sin imports cruzados.
- Configuración, notificaciones e integraciones: el módulo declara (manifest), el núcleo implementa.
- Vocabulario genérico en código (persona, instalación, puesto, servicio, recorrido). Los textos visibles pasan por el diccionario de la vertical del tenant.

## UI
- Solo tokens y componentes de `packages/ds`. Sin hex, sin estilos inline, sin componentes propios por módulo cuando el DS tiene uno.
- Patrones de pantalla: `ListScreen`, `DetailScreen`, `FormScreen`, `PlanillaScreen`, `DashboardScreen`. Estados loading, vacío, error y sin permisos siempre presentes.
- Mobile e iPad first: diseñar y verificar a 375px y 1024px antes que desktop. Touch targets ≥44px. Safe-area iOS.

## Tests
- Dominio: Vitest obligatorio para todo cálculo.
- Capacidades: test de validación, autorización y auditoría.
- Playwright para flujos críticos por portal.

## Flujo de trabajo
- Un brief = un bloque = commits atómicos con prefijo de ámbito (`infra:`, `core:`, `ds:`, `crm:`, `docs:`...), mensaje en español, imperativo.
- No refactorizar fuera del alcance del brief. Si el brief contradice el repo, conservar el objetivo, adaptar y reportar.
- Al terminar un brief: actualizar `docs/2.0/ESTADO.md` (hecho, pendiente, decisiones del bloque, versiones) y reportar.
- Nada se despliega a producción de Gard ni se toca OPAI 1.0 desde aquí.
```

`README.md`: nombre, una frase, enlace a `docs/2.0/00-documento-de-arranque.md` y los comandos. `.env.example` con `DATABASE_URL`, `DATABASE_URL_MIGRATE`, `DATABASE_URL_TEST`, `DEV_TENANT_ID`, `OPAI_APP_DB_PASSWORD`.

### Bloque 8 · CI (`infra:`)

`.github/workflows/ci.yml`: en `push` a `main` y en `pull_request`: checkout, pnpm con caché, `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`. Sin acceso a base de datos en esta etapa (`test:db` queda local).

### Bloque 9 · Infraestructura (`infra:`)

Todo desde CLIs autenticadas. Ningún secreto se imprime ni se escribe en archivos versionados.

1. **Neon.** `neonctl regions list`; elegir `aws-sa-east-1` si existe, si no `aws-us-east-1`. `neonctl projects create --name opai-2 --region <region>`. Ramas: `main` (test.opai.cl) y `dev` (local y `test:db`). En `main` y `dev`: ejecutar la migración inicial con `pnpm db:deploy` usando la URL del propietario en la variable de entorno del comando; la contraseña de `opai_app` se genera con `openssl rand -base64 32` y se pasa por `OPAI_APP_DB_PASSWORD`. Obtener las URLs pooled del rol `opai_app` y directa del propietario con `neonctl connection-string`, guardarlas solo en variables del shell y en `.env.local` (ignorado por git).
2. **Vercel.** `vercel link` dentro de `apps/web` creando el proyecto `opai-2` en el equipo de Carlos (`cryptobal`); root directory `apps/web`; `vercel git connect` a `Cryptobal/opai-2`; `vercel env add DATABASE_URL production` y `preview` leyendo la URL pooled de `opai_app` desde la variable del shell por stdin (no por argumento). No agregar `DATABASE_URL_MIGRATE` a Vercel. `vercel env add DEV_TENANT_ID preview` con el id del tenant `gard` creado en el paso 4.
3. **Dominio.** `vercel domains add test.opai.cl`. El comando indica el registro DNS necesario (CNAME a `cname.vercel-dns.com` o el valor que devuelva). Si existen `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ZONE_ID` en el shell, crear el registro con la API de Cloudflare con `proxied: false`; si no, **STOP**: imprimir el registro exacto y pedir a Carlos que lo agregue en Cloudflare como **DNS only**. Verificar con `vercel domains inspect test.opai.cl` hasta que esté activo.
4. **Tenant de desarrollo.** Script `packages/db/scripts/seed-dev-tenant.ts` que crea (idempotente) el tenant `gard` ("Gard Security", vertical `seguridad`) en la rama indicada por la URL que reciba. Ejecutarlo en `dev` y en `main`. Guardar el id en `.env.local` como `DEV_TENANT_ID`.
5. **Deploy.** `vercel deploy --prod` desde `apps/web`. Verificar `https://test.opai.cl/api/health` y `https://test.opai.cl/` (shell visible). `/_ds` no debe estar disponible en producción.
6. Correr `pnpm test:db` contra `dev` y confirmar el test de aislamiento en verde.

### Bloque 10 · Estado y reporte (`docs:`)

Actualizar `docs/2.0/ESTADO.md` con: qué existe, versiones instaladas, región Neon y Vercel elegidas, id del tenant `gard` (no es secreto), pendientes y decisiones tomadas durante el brief. Reporte final según sección 16.

## 12. Tests obligatorios

- `packages/domain`: test de ejemplo de redondeo CLP (entero, sin decimales).
- `packages/capabilities`: los cuatro tests del bloque 5.
- `packages/db`: test de aislamiento RLS del bloque 4 (`test:db`).
- `apps/web`: test de `GET /api/health` y de `/api/v1/core.ping`.
- Playwright: screenshots de `/_ds` a 375 y 1024 (evidencia).

## 13. Validación

- Gate `pnpm typecheck && pnpm lint && pnpm test` verde en local y en CI.
- `pnpm test:db` verde contra Neon `dev`.
- `https://test.opai.cl/api/health` responde; `/` muestra el shell; `/_ds` responde 404 en producción.
- Revisión visual de `/_ds` a 375 y 1024: shell con navegación inferior y riel; patrones legibles; estados visibles; sin hex en el código (`grep -rn "#[0-9a-fA-F]\{6\}" packages/ds/src apps/web/app` debe devolver solo `tokens.css`).
- `grep` de `@prisma/client` fuera de `packages/db` vacío.

## 14. Criterios de aceptación

- [ ] Monorepo con `pnpm`, Turborepo, TypeScript estricto, ESLint con reglas del proyecto, Prettier, Vitest, Playwright.
- [ ] `CLAUDE.md` con el contenido del bloque 7.
- [ ] `packages/db` con schema `core`, `forTenant`, RLS forzada y test de aislamiento en verde.
- [ ] `packages/capabilities` con registro, handler `/api/v1/` y `core.ping` probados.
- [ ] `packages/ds` con tokens provisionales neutros marcados como tales (ADR-013), `AppShell`, cinco patrones y cuatro estados; `/_ds` revisado a 375 y 1024.
- [ ] `pnpm scaffold:module` genera un módulo que pasa el gate.
- [ ] CI en verde en `main`.
- [ ] Neon `opai-2` con ramas `main` y `dev`, migración aplicada, rol `opai_app` sin `BYPASSRLS`.
- [ ] Vercel `opai-2` conectado al repo, región `gru1`, `test.opai.cl` activo, `/api/health` en verde.
- [ ] Ningún secreto en el repo ni en la salida de la consola.
- [ ] `docs/2.0/ESTADO.md` actualizado.

## 15. Riesgos y rollback

- Todo es nuevo: el rollback es `git revert` del bloque. Neon y Vercel se pueden borrar sin consecuencias.
- Si `forTenant` no logra garantizar `SET LOCAL` en la misma transacción con la versión de Prisma instalada, **STOP** y reportar con la alternativa concreta (por ejemplo, `$transaction` interactiva por operación) antes de continuar; no avanzar con un aislamiento parcial.

## 16. Instrucción final para Claude Code

Implementa este brief en el repositorio `opai-2`, bloque por bloque y en orden. Antes de editar, lee `docs/2.0/00-documento-de-arranque.md` y `docs/2.0/01-decisiones.md`. El repositorio y la documentación oficial de cada herramienta son la fuente final de verdad: si una versión estable cambia una API respecto de lo descrito aquí, conserva el objetivo, adapta y reporta la diferencia. No ejecutes acciones destructivas. No imprimas secretos. Detente solo en los puntos marcados **STOP**. Corre el gate antes de cada commit, corrige los errores que introduzcas, revisa el diff y haz un commit por bloque. Al terminar informa: qué se implementó, qué archivos cambiaron, qué validaciones corriste y con qué resultado, qué versiones quedaron instaladas, y qué riesgo o pendiente material queda.
