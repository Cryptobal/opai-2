# CLAUDE.md — OPAI 2.0

## Qué es esto

Monorepo de OPAI 2.0: SaaS modular, multi-tenant y agent-first para empresas intensivas en personal (seguridad, aseo, outsourcing, mantenimiento). Antes de cualquier tarea lee `docs/2.0/ESTADO.md` y `docs/2.0/01-decisiones.md`. El brief en curso está en `docs/2.0/briefs/`. OPAI 1.0 (`Cryptobal/opai`) es solo referencia de reglas de negocio: no se porta código.

## Comandos

- `pnpm install` · `pnpm dev` (apps/web en http://localhost:3000) · `pnpm build`
- Gate obligatorio antes de cada commit: `pnpm typecheck && pnpm lint && pnpm test`
- `pnpm test:db` corre el test de aislamiento RLS si existe `DATABASE_URL_TEST` (Postgres local o rama `dev` de Neon, rol propietario).
- `pnpm db:generate` · `pnpm db:migrate` (crea la migración sin aplicarla; usa `DATABASE_URL_MIGRATE`) · `pnpm db:deploy` (aplica; solo con instrucción explícita y contra el entorno indicado)
- `pnpm --filter @opai/db role:password` fija la contraseña del rol `opai_app` desde `OPAI_APP_DB_PASSWORD`.
- `pnpm --filter @opai/db seed:dev-tenant` crea el tenant `gard` (solo para desarrollo).
- `pnpm --filter @opai/auth seed:platform-owner` crea (idempotente) el usuario plataforma desde `SEED_OWNER_PASSWORD`; usa `DATABASE_URL_MIGRATE`.
- `pnpm --filter @opai/web e2e` corre Playwright: `/ds`, acceso (`/ds/acceso`, variantes del diseño) y el flujo con sesión (usa `SEED_OWNER_PASSWORD` del `.env.local` de la raíz contra `dev`).
- `pnpm scaffold:module <id> --nombre "<Nombre>"` crea un módulo completo y lo registra.
- Nunca: `prisma migrate reset`, borrar migraciones, commitear `.env*`, correr `db:deploy` contra un entorno no indicado, usar `dbAdmin()` fuera de scripts y migraciones, imprimir secretos.

## Estructura

- `apps/web`: app Next.js (App Router, Turbopack, Cache Components). Route groups por portal: `(erp)`, `(platform)`, `(trabajador)`, `(terreno)`, `(cliente)`, `(supervisor)`. Página `/ds` (solo fuera de producción) con el DS completo.
- `packages/db`: Prisma 7 con `@prisma/adapter-pg`. Esquemas en `prisma/schema/` (`core.prisma` + uno por módulo). `forTenant(tenantId)` fija `app.tenant_id` por transacción; `dbAdmin()` solo para scripts.
- `packages/domain`: lógica pura (dinero, tiempo, cálculos) con tests. Sin Next, React ni base de datos.
- `packages/capabilities`: `defineCapability`, registro, `executeCapability`, handler HTTP, `defineModule`, `registrarModulos`.
- `packages/ds`: DS 2.0 aprobado (ADR-014). `tokens.css` (único archivo con colores), `styles.css` (base y estilos `t-*`), componentes, `AppShell`, patrones y estados. Referencia visual: `docs/2.0/design/export-ds-2.0/` (sistema y patrones) y `docs/2.0/design/export-acceso/` (pantallas de acceso).
- `packages/integrations`: adaptadores (DTE, banco, factoring, mensajería, biometría). Vacío en el Brief 00.
- `modules/<id>`: módulos vendibles; `modules/registry` (`@opai/modules`) los lista.
- `scripts/`: generador de módulos y utilidades.
- `docs/2.0`: memoria del proyecto (arranque, decisiones, estado, briefs, diseño, extracción de 1.0). En `docs/2.0/extraccion/` están las reglas verificadas en el código de 1.0 (normativa DT, integraciones y configuración por tenant, rondas y tickets): leerlas antes del brief del módulo correspondiente.

## Reglas de código

- TypeScript estricto. Sin `any`, sin `@ts-ignore`, sin `as unknown as`.
- Archivos de hasta 150 líneas (ESLint lo exige); dividir antes de superar.
- Dominio puro: `packages/domain` y `modules/*/domain` no importan `next`, `react`, `@opai/db` ni `@prisma/client`.
- Todo acceso a datos pasa por `db.forTenant(tenantId)`. El cliente Prisma crudo solo existe en `packages/db` (ESLint lo bloquea fuera). Excepciones acotadas: `forUser(userId)` solo para leer las membresías propias (política `user_self`) antes de elegir tenant; `globales()` solo para `tenants` y `users` (sin RLS); `clienteAuth()` solo en `packages/auth`.
- Identidad: el código usa `@opai/auth` (`getSession`, `requireSession`) y `apps/web/lib/actor.ts` (`resolverActor`); nunca Better Auth directo. Toda página de portal verifica sesión y acceso al portal en servidor (`PaginaPortal`).
- Permisos: `<modulo>:<accion>` con roles y comodines en `@opai/domain` (`tienePermiso`, ADR-016). `executeCapability` verifica tenant, módulo activo, scopes del agente y permiso; `platform:*` solo con `platformRole`. Las capacidades de plataforma reciben `tenantId` en el input y usan `ctx.plataforma.paraTenant`.
- Toda tabla de negocio: `tenant_id`, `created_at`, `updated_at`, IDs `uuid(7)`, columnas `snake_case` vía `@map`, `@@schema("<modulo>")`. Toda migración que cree una tabla con `tenant_id` agrega:

  ```sql
  ALTER TABLE "<schema>"."<tabla>" ENABLE ROW LEVEL SECURITY;
  CREATE POLICY tenant_isolation ON "<schema>"."<tabla>" AS PERMISSIVE FOR ALL TO opai_app
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
  ```

  y, al crear un schema nuevo: `GRANT USAGE ON SCHEMA "<schema>" TO opai_app` más los `GRANT`/`ALTER DEFAULT PRIVILEGES` de la migración inicial.

- Dinero: CLP en enteros (`clp()`, `redondearCLP()` de `@opai/domain`); UF y porcentajes como enteros escalados (`UF_ESCALA`, `PCT_ESCALA`) o `Decimal` de escala fija en base de datos. Nunca float para dinero.
- Tiempo: `timestamptz` en UTC; zona del tenant solo para presentar; turnos como intervalos `[inicio, fin)`.
- Zod en el borde; los tipos se derivan de los esquemas.
- Toda consulta o mutación de negocio es una capacidad (`defineCapability`). UI, API y MCP solo invocan capacidades. Toda escritura soporta `dryRun` y acepta `idempotencyKey`; las escrituras reales quedan en `core.audit_events`.
- Módulos: solo importan de `packages/*` y de módulos declarados en `dependencias` de su manifest. Sin imports cruzados. Permisos `<id>:<accion>`, capacidades `<id>.<entidad>.<verbo>`, eventos `<id>.<evento>`.
- Configuración, notificaciones e integraciones: el módulo declara en el manifest, el núcleo implementa. Nunca una página de configuración ni una entrada de navegación "Configuración" por módulo: el centro de configuración del núcleo renderiza el esquema del manifest por ámbitos (ADR-018). Los eventos comunicables (correo, WhatsApp, push) se declaran en el manifest con plantilla por defecto; el tenant los edita en Configuración → Comunicaciones; silencio por defecto (ADR-020).
- Documentos y archivos: ningún módulo sube archivos por su cuenta ni crea tablas de adjuntos; todo pasa por `core.documentos.*` con vínculos polimórficos a sus entidades (ADR-019).
- Permisos (acciones) y alcance (filas) son dimensiones distintas: las capacidades de entidades con alcance (instalaciones a cargo, cuenta del cliente, persona propia) aplican el filtro en la consulta, nunca en la UI (ADR-022).
- Reglas de negocio configurables (modelo de costeo de CPQ, parámetros) se expresan como configuración versionada evaluada en `packages/domain`, no como código por tenant (ADR-021).
- Hechos regulados (marcas de asistencia, firmas, rondas): inmutables, con hora de servidor, hash y bitácora encadenada append-only; las correcciones son hechos nuevos. Ver `docs/2.0/extraccion/dt-normativa.md` y ADR-023 antes de tocar Asistencia, Rondas o Documentos.
- Eventos y trabajos: toda escritura relevante emite un evento de dominio por outbox en la misma transacción; los crons encolan trabajos, no hacen el trabajo (ADR-029).
- Integraciones: ningún módulo lee credenciales de `process.env` para servicios de tenant; usa el catálogo de integraciones del núcleo y sus adaptadores; los secretos del tenant viven cifrados en el almacén del núcleo y nunca salen por API ni MCP (ADR-027). Geolocalización y mapas solo por el servicio del núcleo.
- Marca del tenant: toda salida (PDF, correo, portales) toma logos, colores y datos legales del perfil de marca del núcleo; nunca hardcodear nombres ni logos de Gard (ADR-028).
- Consumos: toda llamada a un recurso con costo (IA, mapas, biometría, mensajería, firmas, almacenamiento) pasa por el adaptador del núcleo que mide en `core.consumos`; nunca SDKs de proveedores en módulos; la IA se invoca por clase de tarea (`economica`, `estandar`, `potente`), nunca por nombre de modelo (ADR-031).
- Agéntico: OPAI no construye chats ni copilotos; expone capacidades, publica eventos y controla la autonomía de los agentes (lectura, vista previa, aprobación humana para lo irreversible). Los flujos para agentes se documentan en `docs/2.0/agentes/` (ADR-032).
- Vocabulario genérico en código (persona, instalación, puesto, servicio, recorrido, novedad). Los textos visibles pasan por el diccionario de la vertical del tenant (Brief 01).

## UI

- Solo tokens y componentes de `@opai/ds`. Sin hex, sin estilos inline, sin componentes propios por módulo cuando el DS tiene uno. `grep -rn "#[0-9a-fA-F]\{6\}" apps packages modules --include=*.tsx --include=*.ts --include=*.css` debe devolver solo `tokens.css`.
- Sin elementos interactivos crudos fuera de `packages/ds`: ESLint prohíbe `<button>`, `<input>`, `<select>`, `<textarea>`, `<dialog>` y `<a>` en `modules/**/ui` (error) y en `apps/web/app` (aviso hasta el Brief 02; luego error). Si falta un componente, se agrega al DS con diseño en Claude Design, nunca al módulo (ADR-017).
- Controles complejos (menú, diálogo, select, combobox, popover, tooltip, switch, checkbox, toast, paleta ⌘K) se construyen sobre primitivas Radix/shadcn copiadas a `packages/ds` y re-estilizadas con tokens; nunca sobre `<select>`/`<dialog>` nativos ni desde cero (ADR-017).
- Pulido obligatorio en toda pantalla: foco visible, skeleton con la forma del contenido, estado vacío con acción, transiciones de 150–200 ms con `prefers-reduced-motion`, contraste AA. Todo componente nuevo aparece en `/ds` con sus estados.
- Patrones de pantalla: `ListScreen`, `DetailScreen`, `FormScreen`, `PlanillaScreen`, `DashboardScreen`, siempre con `state` y los estados loading, vacío, error y sin permisos. Tipografía solo con los estilos `t-*` o la escala del DS; nunca tamaños arbitrarios.
- En iPad y desktop el título de la página va en el `AppShell` (`titulo`); el patrón recibe el mismo título y lo muestra solo en teléfono. La acción principal va en el patrón.
- Mobile e iPad first: diseñar y verificar a 375px y 1024px antes que desktop. Touch targets ≥44px. Safe-area iOS. Los nombres de carpeta con `_` no son rutas en App Router.
- Las pantallas nuevas pasan por Claude Design (Design Prompt → diseño aprobado → brief) antes de implementarse.

## Tests

- Dominio: Vitest obligatorio para todo cálculo.
- Capacidades: tests de validación, autorización y auditoría con contexto falso (ver `packages/capabilities/test`).
- Base: `pnpm test:db` contra Postgres real antes de tocar RLS o migraciones.
- Playwright para flujos críticos por portal (a 375 y 1024).

## Flujo de trabajo

- Un brief = bloques = commits atómicos con prefijo de ámbito (`infra:`, `core:`, `ds:`, `crm:`, `docs:`…), mensaje en español, imperativo.
- No refactorizar fuera del alcance del brief. Si el brief contradice el repo, conservar el objetivo, adaptar y reportar la diferencia.
- Al terminar un brief: actualizar `docs/2.0/ESTADO.md` (hecho, pendiente, decisiones del bloque, versiones) y reportar: qué se implementó, archivos, validaciones y resultados, riesgos pendientes.
- Nada se despliega a producción de Gard ni se toca OPAI 1.0 desde aquí.
