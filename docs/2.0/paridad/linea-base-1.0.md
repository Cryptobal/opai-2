# Línea base de paridad OPAI 1.0 ↔ OPAI 2.0

Generado: 24-10-2026, 10:40 (hora de Chile, UTC-3). Trabajo de solo lectura.
- 1.0: Cryptobal/opai, rama main. Producción en opai.gard.cl, congelado desde el 22-oct-2026. Árbol: 8.617 archivos; `prisma/schema.prisma` tiene 456 modelos.
- 2.0: Cryptobal/opai-2, rama main, sha 60a37efe. Staging en test.opai.cl. Árbol: 1.258 rutas.
- Fuentes: conector GitHub de solo lectura. Copias locales en `/workspace/paridad/src1` (1.0) y `/workspace/paridad/src2` (2.0).
- No se usaron el MCP de 1.0 (user-opai), el de 2.0 (user-opai2) ni Neon. No se leyeron datos reales: solo código, documentación y esquemas.

> **Nota posterior (24-oct, al subirlo al repo).** El texto de abajo es la línea base tal como se generó. Desde entonces cambiaron dos cosas:
> - **`portal/acceso`:** dejó de estar «sin mapear». Carlos decidió el 24-oct portarlo, mejorado y con registro completo, dentro del portal de terreno (fase 3). Ver `paridad/nucleo.md`, «Decisiones de Carlos», y `ESTADO.md`.
> - **`docs/2.0/checklists/paridad.md`:** ya existe; lo crea el PR #15 del contrato del repositorio.

---

## 1. Estado de 2.0 según `docs/2.0/ESTADO.md` (24-oct-2026)

- **Fase 1 · Núcleo: "en cierre".**
  - Hecho:
    - Briefs 00, 00b, infra y 01 (identidad y plataforma, criterios cumplidos).
    - 01c y 02 A–C (maestros, documentos y servicios).
    - QA 1 y 2.
    - Gate de paridad UI↔MCP.
  - En curso: seeds, 02 D (verificación guiada), `mcp:verificar` y los briefs 03, 04 y 05.
- **Fase 2 · Comercial y CPQ: pendiente.** Hay un borrador en `docs/2.0/modulos/comercial.md` con 11 preguntas abiertas para Carlos.
- **Fases 3 a 6** (Operaciones y portales, Asistencia y DT, Finanzas, Nómina) y **Licitaciones: sin empezar.**
- **Deudas que ESTADO.md declara:**
  - No hay historial de contraseñas.
  - El rate limit de login vive en memoria.
  - No hay impersonación.
  - El supervisor no tiene alcance por filas (ADR-022).
  - No hay asignaciones persona↔instalación.
  - `platform.ajustes` no escribe audit_events.
  - `core.geo` no tiene permiso ni rate limit.
  - `/verificar` lee la BD directo.
  - Los roles personalizados están en backlog.

Regla de este informe: no se da por hecho ningún avance de 2.0 que no aparezca en ESTADO.md. El código de 2.0 solo se cita como evidencia de cómo está implementado lo que ESTADO declara.

## 2. `docs/2.0/checklists/paridad.md`: no existe

- La ruta da 404. Tampoco aparece en el árbol de main, en la carpeta `docs/2.0/checklists/` (que no existe) ni en el PR #14.
- Por eso no hay un formato oficial que seguir. Se usa el que pidió el padre: por módulo, tres secciones (**Brechas**, **Mejoras**, **No copiar**); cada punto con evidencia en 1.0 y en 2.0 y prioridad Alta, Media o Baja.
- Lo que sí existe en 2.0 sobre "paridad" es la **paridad UI↔MCP**, que es otra cosa: comprueba que cada pantalla tenga su capacidad MCP. Está en `packages/capabilities/test/paridad*.ts` y `apps/web/test/paridad-registro.test.ts`.

### Documentos en `docs/2.0/`

| Carpeta | Archivos |
|---|---|
| raíz | 00-documento-de-arranque, 01-decisiones (ADR), CONTEXTO-agentes, ESTADO, INSTRUCCIONES-proyecto-claude, NAVEGACION, PREGUNTAS-carlos, ROADMAP, precios-recursos |
| agentes/ | README, operar-el-nucleo |
| briefs/ | BRIEF-00-fundacion, 00-infra, 01-identidad-y-plataforma, 01c, 02-maestros-y-servicios |
| extraccion/ | comercial-y-cpq, dt-normativa, integraciones-y-configuracion-por-tenant, maestros, rondas-y-tickets |
| modulos/ | _plantilla, comercial |
| design/ | prompts y exports del sistema de diseño |

## 3. Inventario de 1.0 según el orden de 2.0

Leyenda: **[NC]** = no copiar (excluido de 2.0: está en el backlog del ROADMAP o en la lista del padre).

### 3.1 Fundación (equivale a 2.0 brief 00 / infra)

| Aspecto | 1.0 (evidencia) | 2.0 (evidencia) |
|---|---|---|
| Stack | Next (app router) monolito `src/`, Prisma único `prisma/schema.prisma` (456 modelos, schemas Postgres public/ops/finance/crm/cpq/payroll/docs/dt/…) | Monorepo pnpm/Turborepo, Next 16, Prisma 7, `packages/db/prisma/schema/*.prisma` |
| Aislamiento tenant | Filtro en aplicación: `src/lib/tenant-scope.ts` (cross-tenant ⇒ 404, tenantId solo del AuthContext); no hay RLS | RLS `tenant_isolation`, rol `opai_app` NOBYPASSRLS, `packages/db/src/for-tenant.ts` |
| Middleware | `src/proxy.ts`: rutas públicas de portales (`/portal/guardia`, `/portal/cliente`, `/portal/marcacion`…), gate de solo lectura (`lib/platform/read-only-gate`), módulos por ruta (`lib/tenant-module-routes`), host canónico | `apps/web` con grupos `(auth)`, `(erp)`, `(platform)` |
| API | `src/lib/api-auth.ts` (`requireAuth` → AuthContext, `ensureModuleAccess`, `parseBody` zod) + variantes por módulo (`api-auth-cpq/crm/docs…`) | Registro de capacidades `packages/capabilities` (`defineCapability`: permiso, efecto, dryRun, auditoría) expuesto por UI y MCP (`api/mcp/[[...transport]]`, `api/mcp/k/[key]`) |
| Auditoría | `src/lib/audit.ts` → `AuditLog` (schema.prisma l.901) plano; `PlatformAuditLog` (l.332) con before/after saneado (`lib/platform/audit`) | `core.AuditEvent` append-only en toda escritura (`core.prisma`) + bitácora encadenada `packages/db/src/bitacora.ts` |
| MCP | `McpApiKey` (l.14004) scope READ / READ_WRITE; `src/app/api/mcp/[key]`, `src/lib/integrations/mcp/*`; dominios granulares solo diseñados (`docs/integrations/mcp-scopes-design.md`) | `core.ApiKey` con scopes por módulo, usuario responsable, presupuesto, expiración, autonomía; `UsageEvent` |

### 3.2 Núcleo (equivale a 2.0 briefs 01 a 05), en detalle

| Submódulo | 1.0: ruta / app route / modelo Prisma | 2.0: ruta / capacidad / modelo |
|---|---|---|
| Autenticación | `src/lib/auth.ts` (NextAuth Credentials + Google, MFA, lockout, impersonación, idle timeout); `src/app/api/auth/*`; `Admin` (l.627), `PasswordResetToken`, `MfaChallenge`, `AdminPasswordHistory`, `LoginAttempt` | `packages/auth/src/opciones.ts` (Better Auth); `app/(auth)/{login,recuperar,invitacion/[slug]/[token],elegir-empresa}`; `User`, `Session`, `Account`, `Verification` (`identidad.prisma`) |
| Política de seguridad por tenant | `src/lib/security-policy/policy.ts`, `src/lib/security/mfa.ts`, `src/lib/security/inactivity.ts`, `src/lib/login-audit/policy.ts`; `TenantSecurityPolicy` (l.690) | No existe (regla fija: mínimo 10 caracteres con letra y número; rate limit en memoria) |
| Usuarios e invitaciones | `src/app/(app)/opai/actions/users.ts` (inviteUser 48 h, activateAccount, changeUserRole, toggleUserStatus, revokeInvitation); `UserInvitation` | `packages/capabilities/src/core/{invitar,invitations,users}.ts`; `(erp)/configuracion/usuarios`; `Membership`, `Invitation` (`tenancy.prisma`) |
| Roles y permisos | `src/lib/role-policy.ts`, `src/lib/rbac.ts`, `src/lib/permissions.ts` (1.472 líneas), `permissions-server.ts`; `RoleTemplate`, `AdminGroup`, `AdminGroupMembership`; docs `docs/.../usuarios-roles.md`, `role-policy-single-source.md` | `packages/domain/src/permisos.ts`, `permisos-catalogo.ts` (ADR-016, ADR-022); `(erp)/configuracion/usuarios/matriz-permisos` |
| Tenant y ciclo de vida | `src/lib/platform/tenant-lifecycle.ts`, `src/lib/tenant-deletion.ts`; `Tenant` (l.12, incluye DPA/DPO Ley 21.719 y campos DT Res. Ex. 38), `TenantModule` (l.257), `TenantPlan` (l.274) | `core/tenant.ts`, `platform-*`; `Tenant` (estado trial/activo/suspendido), `TenantModule` (trial/activo/suspendido) |
| Plataforma | `PlatformAdmin` (l.306, tabla aparte), `PlatformAuditLog`, `PlatformSetting`; `src/app/platform/*`, `src/lib/platform-jwt` | `users.platformRole` owner/support; `(platform)/platform/{tenants,ajustes,consumos,trabajos}` |
| Configuración | `Setting` key-value + 31 secciones en `src/app/(app)/opai/configuracion/*` (empresa, usuarios, roles, grupos, seguridad, auditoria, integraciones, mi-plan, cumplimiento, …) | Configuración unificada declarativa (ADR-018), `core/config/*`, `Ajuste`, `Integracion`, `Secreto`, `ClaveTenant`, `PerfilEmpresa` |
| Maestros | `crm.accounts/contacts/installations`, `ops.personas/guardias`, `payroll.salary_structures` (ver `docs/2.0/extraccion/maestros.md`) | `Cuenta`, `Contacto`, `Instalacion`, `Cargo`, `Puesto`, `Persona`, `VinculoLaboral`, `EstructuraSueldo` (`maestros.prisma`) |
| Documentos | `docs` schema (14 modelos), `src/app/(app)/opai/documentos` | `core.documentos` (ADR-019, `documentos.prisma`) |
| Notificaciones y comunicaciones | `Notification*`, push, plantillas de correo dispersas | `Plantilla`, `NotificacionRegla`, `Notificacion`, `Envio` (ADR-020, silencio por defecto) |

### 3.3 Comercial y CPQ (fase 2 de 2.0, pendiente)

- **App:** `src/app/(app)/crm/{leads,accounts,contacts,installations,deals,cotizaciones,propuestas,mi-semana,correos,licitaciones-externas}` y `src/app/(app)/cpq/{quotes,config,[id]}`.
- **API:** `src/app/api/crm/*` (correos 48, deals 18, accounts 16, installations 15, gmail 14, leads 12, …) y `src/app/api/cpq/*` (quotes 36, bundles 10, …).
- **Prisma:** schema `crm` (67 modelos) y `cpq` (26 modelos).
- **Extracción ya hecha en 2.0:** `docs/2.0/extraccion/comercial-y-cpq.md` y `modulos/comercial.md`.
- **[NC]:** apollo, la ingesta de Gmail que lleva el CRM a la bandeja, y las conversaciones/chat.

### 3.4 Operaciones y portales (fase 3)

- **App:** `src/app/(app)/ops/{pautas,pauta-mensual,pauta-diaria,puestos,ppc,refuerzos,turnos-extra,rondas,supervision,control-nocturno,tickets,marcaciones,audit-pautas}`, `src/app/(app)/portales`, `src/app/portal/{guardia,cliente,supervisor,terreno,rondas,libro,personas}`, `src/app/{r,t,ronda,marcar}`.
- **API:** `src/app/api/ops/*` (rondas 47, supervision 33, tickets 20, pauta-mensual 11, …) y `src/app/api/portal/*` (cliente 124, guardia 73, rondas 17, libro 14).
- **Prisma:** schema `ops` (130 modelos).
- **Extracción en 2.0:** `extraccion/rondas-y-tickets.md`.
- **[NC]:**
  - `ops/inventario` (y el schema `inventory`, 15 modelos);
  - `ops/camaras`;
  - `ops/ats`;
  - `ops/alertas-cobertura`;
  - `ops/incidentes-terreno` (`portal/incidentes`);
- **Se porta (decisión de Carlos, 24-oct):** `portal/acceso` (control de acceso físico, schema `access_control` con 14 modelos), mejorado y con registro completo, dentro del portal de terreno (fase 3, Brief 16).

### 3.5 Asistencia y DT (fase 4)

- **App y API:** `src/app/(app)/fiscalizacion`, `src/app/(app)/reportes/dt`, `src/app/fiscalizacion-dt/*` (inspector), `src/app/api/fiscalizacion-dt/*`, `src/app/portal/marcacion`, `src/app/api/ops/marcacion`, `src/app/api/te/*`, `src/app/verificar`.
- **Prisma:** schema `dt` (8 modelos) más los campos Res. Ex. 38 del `Tenant`.
- **Extracción en 2.0:** `extraccion/dt-normativa.md` y ADR de Asistencia certificable.

### 3.6 Finanzas (fase 5)

- **App:** `src/app/(app)/finanzas/{facturacion,rendiciones,flujo-caja,reportes,pagos,contabilidad,proveedores,pagos-proveedores,conciliacion,bancos,aprobaciones,configuracion}`.
- **API:** `src/app/api/finance/*` (billing 80, cashflow 55, banking 50, flow-v3 31, factoring 14, accounting 13, …).
- **Prisma:** schema `finance` (102 modelos) y `fx`.
- **Integración:** SII.

### 3.7 Nómina (fase 6)

- **App:** `src/app/(app)/payroll/{periodos,simulator,parameters,asistencia,anticipos}`.
- **API:** `src/app/api/payroll/*`.
- **Prisma:** schema `payroll` (15 modelos), más `PayrollParameterVersion` (catálogo global con allowlist de escritura).

### 3.8 Licitaciones

- `src/lib/mercado-publico/{client,parse,persist,digest,link}.ts`, `src/app/(app)/crm/licitaciones-externas`, `src/app/api/crm/licitaciones-externas`, crons en `src/app/api/cron/*`, y la migración `20260814000000_licitacion_proposal_v2`.
- En 2.0 el embudo admite un pipeline de licitaciones (`01-decisiones.md`, sección Comercial).

### 3.9 No copiar (lista consolidada con evidencia en 1.0)

| Excluido | Evidencia en 1.0 |
|---|---|
| Inventario | `(app)/ops/inventario`, `api/ops/inventario`, schema `inventory` |
| Cámaras | `(app)/ops/camaras`, `api/ops/camaras` |
| ATS | `(app)/ops/ats`, `api/ops/ats`, `api/public/{ats,postulacion}`, modelos `Ats*` |
| Alertas y cobertura | `(app)/ops/alertas-cobertura`, `api/ops/alertas-cobertura` |
| Incidentes | `(app)/ops/incidentes-terreno`, `portal/incidentes`, `api/portal/incidentes` |
| Conocimiento | `(app)/personas/conocimiento`, modelos `Knowledge*` |
| Onboarding | `(app)/personas/onboarding`, modelos `Onboarding*` |
| Comunicaciones (módulo RR.HH.) | `(app)/personas/comunicaciones` (la plantilla de correo del núcleo sí se porta, ADR-020) |
| Gamificación | `(app)/personas/gamificacion`, 12 modelos `Gamificacion*` |
| Psicolaboral | `(app)/personas/psicolaboral`, `api/public/{psych,psych-review}`, schema `psych` |
| Chat | schema `chat` (13 modelos), `lib/ai/help-chat-*` |
| Slack | 8 modelos `Slack*` |
| Agenda / productividad / notas | `api/agenda`, `Calendar*`, schema `notes` (fuera de alcance; consultar) |

## 4. Próximos informes

- **Ahora:** `informe-nucleo.md`. Es preliminar porque la fase 1 está "en cierre", no cerrada.
- **Después:** un informe por fase cuando ESTADO.md la marque como cerrada. Comercial y CPQ será el siguiente.
