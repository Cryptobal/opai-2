# Informe preliminar de paridad: Fundación y Núcleo (fase 1)

Generado: 24-10-2026, 10:45 (hora de Chile, UTC-3). Solo lectura: se comparan reglas y flujos en código, docs y esquemas, no datos.
- 1.0: Cryptobal/opai, main (congelado desde el 22-oct-2026).
- 2.0: Cryptobal/opai-2, main, sha 60a37efe.

> **Por qué es preliminar.** `docs/2.0/ESTADO.md` marca la fase 1 como "en cierre", no como cerrada. Siguen en curso seeds, 02 D, `mcp:verificar` y los briefs 03, 04 y 05.
>
> **Formato.** `docs/2.0/checklists/paridad.md` no existe (404), así que se usa el formato acordado: Brechas / Mejoras / No copiar, con evidencia en ambos repos y prioridad.
>
> **Reglas que ya están a la par (no son brecha):**
> - El último owner activo está protegido. 1.0: `src/app/(app)/opai/actions/users.ts`, "Debe haber al menos un owner activo". 2.0: `packages/capabilities/src/core/users.ts`, `quedanOtrosOwners`.
> - Nadie asigna un rol superior al propio. 1.0: `hasHigherRole` en `src/lib/role-policy.ts`. 2.0: `puedeAsignarRol` en `packages/domain/src/permisos.ts`.
> - Solo owner y admin ven finanzas y sueldos. 1.0: `applySensitiveSalaryRoleLock` / financial lock en `src/lib/permissions.ts`. 2.0: `FINANCIERO` y `core:estructuras.read_sensible`, ADR-016.
> - Un tenant suspendido bloquea el ingreso. 1.0: `resolveTenantAccess` en `src/lib/auth.ts`. 2.0: `Tenant.estado` "suspendido" en `core.prisma`.
> - Google no permite autorregistro. 1.0: `src/lib/auth.ts` busca un Admin existente. 2.0: `disableSignUp` en `packages/auth/src/opciones.ts`.
> - Hay invitación revocable de un solo uso en ambos.

> **Nota posterior (24-oct, al subirlo al repo).** `docs/2.0/checklists/paridad.md` ya existe: lo crea el PR #15 del contrato. Desde ahora, los informes de paridad siguen ese checklist. Las «Decisiones de Carlos (24-oct-2026)» del final están registradas en `ESTADO.md`. No cierran las 11 preguntas de `modulos/comercial.md`, que son otro tema.

---

## 1. Brechas (2.0 todavía no tiene una regla o flujo que existe en 1.0)

| # | Brecha | Evidencia 1.0 | Evidencia 2.0 | Prioridad |
|---|---|---|---|---|
| B1 | **Protección contra fuerza bruta persistente.** En 1.0 el bloqueo por cuenta vive en la BD (`failedLoginCount`, `lockedUntil`), con un rate limit por IP+correo y registro de cada intento. En 2.0 el límite está en memoria por instancia, así que en serverless se pierde y no se comparte entre instancias. | `prisma/schema.prisma` `Admin` l.670-671 (`failed_login_count`, `locked_until`); `ops.guardias` l.4478-4479; `LoginAttempt`; `src/lib/rate-limit.ts`; `src/lib/login-audit/policy.ts`; `src/lib/auth.ts` (lockout + `logAudit` en los fallos) | `docs/2.0/ESTADO.md` (deuda: "rate limit en memoria"); `packages/auth/src/opciones.ts` | **Alta** |
| B2 | **Falta la tabla de equivalencia de roles 1.0→2.0.** 1.0 tiene 7 roles activos (owner, admin, editor, jefe_operaciones, central_monitoreo, supervisor, viewer), 9 legacy (rrhh, operaciones, finanzas, reclutamiento, solo_*, inspector_dt), plantillas `RoleTemplate` por tenant con niveles none/view/edit/full por módulo y submódulo, y unas 70 capacidades finas (facturacion_issue/void, banking_*, cashflow_*, rendicion_*, dt_manage_sessions, supervision_view_all). 2.0 tiene 5 roles fijos y deja los roles personalizados en backlog. Sin la tabla, la migración de usuarios de Gard puede dar más permisos o quitar acceso (por ejemplo, ¿central_monitoreo pasa a supervisor o a viewer?). **En progreso (Brief 07c PR 2):** roles personalizados y excepciones por usuario construidos (B2), y la tabla de equivalencia documentada en `docs/2.0/paridad/equivalencia-roles.md`; falta solo la pantalla (bloque 6, pendiente de diseño). | `src/lib/role-policy.ts`, `src/lib/rbac.ts`, `src/lib/permissions.ts` (1.472 líneas), modelo `RoleTemplate`, `src/app/(app)/opai/configuracion/roles` | `packages/domain/src/permisos.ts` y `permisos-efectivos.ts`, `packages/db/prisma/schema/permisos.prisma`, `docs/2.0/paridad/equivalencia-roles.md`, `01-decisiones.md` ADR-016 y ADR-022 | **Alta** |
| B3 | **Alcance por filas del supervisor y de los portales.** En 2.0 el supervisor lee todas las cuentas, instalaciones y personas del tenant. En 1.0 hay asignaciones supervisor↔instalación y la capacidad `supervision_view_all`. Es un riesgo de exposición de datos personales y bloquea la fase 3. | `src/lib/permissions.ts` (`supervision_view_all`), modelos de asignación de supervisión en el schema `ops`, `src/app/api/ops/supervision/*` | ADR-022 en `01-decisiones.md` (decidido, sin construir); ESTADO.md ("sin alcance por filas", "sin asignaciones persona↔instalación") | **Alta** |
| B4 | **Ley 21.719 de datos personales.** 1.0 registra la aceptación del DPA, el contacto del DPO, un banner de consentimiento y la atención de solicitudes ARCO. En 2.0 está como principio en el ADR, sin código ni avance en ESTADO.md. La ley entra en vigor el 1-dic-2026. | migración `20260408000000_add_dpa_fields_to_tenant`, `Tenant` (campos DPA/DPO), `src/app/api/tenant/dpa/accept/route.ts`, `src/components/DpaConsentBanner.tsx`, `src/app/(app)/opai/compliance/arco/page.tsx`, `src/app/api/admin/arco/route.ts` | `01-decisiones.md` l.309 (principio 6: "DPO y DPA en el perfil del tenant", retención, exportación); el árbol no tiene rutas dpa ni arco | **Alta** |
| B5 | **Política de seguridad configurable por tenant.** En 1.0 todo viene apagado por defecto y se activa por tenant: MFA por rol (código de 6 dígitos por correo, TTL 10 min, 5 intentos), MFA del portal, expiración e historial de contraseña, inactividad de cuenta (se desactiva sola), sesión ociosa, PIN del guardia con vencimiento a 90 días e historial de 5, usuarios exentos y cuentas de servicio. 2.0 tiene una regla fija: mínimo 10 caracteres, sin MFA (cero archivos) y sin historial. | `src/lib/security-policy/policy.ts`, `src/lib/security/mfa.ts`, `src/lib/security/inactivity.ts`, `TenantSecurityPolicy` (l.690), `AdminPasswordHistory`, `MfaChallenge`, `src/app/(app)/opai/configuracion/seguridad` | `packages/auth/src/opciones.ts`; ESTADO.md ("sin historial de contraseñas") | Media |
| B6 | **Impersonación de soporte auditada.** 1.0 la tiene: `impersonating`/`impersonatingFrom` en el JWT y registro en `PlatformAuditLog`. 2.0 no la tiene. | `src/lib/auth.ts`, `src/lib/platform/audit.ts`, `src/lib/platform-jwt` | ESTADO.md ("sin impersonación") | Media |
| B7 | **Ciclo de vida comercial del tenant.** 1.0 maneja trialing, trial_expired (solo lectura), active, past_due, suspended y cancelled, con matriz de transiciones, gracia, banners y gate de solo lectura en el middleware. 2.0 solo tiene trial, activo y suspendido. | `src/lib/platform/tenant-lifecycle.ts`, `src/lib/platform/read-only-gate`, `src/proxy.ts`, `TenantPlan` (l.274) | `packages/db/prisma/schema/core.prisma` `Tenant.estado` | Media |
| B8 | **Auditoría de acceso y contexto de red.** 1.0 guarda la IP y el user agent en `AuditLog`, el detalle de cada intento de login (razón y cuenta en hash, sin RUT ni PIN, también en los portales), el historial de cambios de rol (`configuracion/roles/auditoria`) y el before/after saneado en las acciones de plataforma. 2.0 tiene `AuditEvent` sin IP ni user agent, `platform.ajustes` todavía no audita y no hay evidencia de auditoría de logins. | `AuditLog` (l.901), `src/lib/audit.ts`, `src/lib/login-audit/policy.ts`, `LoginAttempt`, `src/lib/platform/audit.ts` | `core.prisma` `AuditEvent`; ESTADO.md ("platform.ajustes sin audit_events") | Media |
| B9 | **Grupos de usuarios** (por ejemplo, aprobadores de tickets). | `AdminGroup`, `AdminGroupMembership`, `src/app/(app)/opai/configuracion/grupos` | No existe; `Aprobacion` cubre aprobaciones humanas de capacidades, no grupos | Media (se puede diferir a fase 3) |
| B10 | **Borrado y exportación de tenant.** 1.0 borra con un script que conoce las tablas huérfanas. 2.0 lo tiene decidido (cuarentena de 30 días, exportación a R2) pero sin construir. | `src/lib/tenant-deletion.ts` (`ORPHAN_TABLES`, `deleteTenant`) | `01-decisiones.md` l.310 (principio 7); permiso `core:tenant.delete` sin flujo en ESTADO.md | Baja |
| B11 | **Límites del plan** (`maxAdmins`, `maxGuards`, precio en UF). | `TenantPlan` (l.274) | `(platform)/platform/ajustes/_componentes/tabla-precios.tsx`, `docs/2.0/precios-recursos.md`; no hay límites por plan | Baja |
| B12 | **Escritura restringida de catálogos globales.** En 1.0 solo los tenants de una allowlist pueden escribir `PayrollParameterVersion` y `CrmIndustry`. En 2.0 hay que decidirlo antes de Nómina. | `src/lib/tenant-scope.ts` (`PAYROLL_PARAMS_WRITE_TENANT_SLUGS`) | Sin equivalente; corresponde a la plataforma (`platform:*`) | Baja |
| B13 | **Datos DT del empleador en el tenant** (Res. Ex. 38). | `Tenant` (campos DT) | `PerfilEmpresa` (no se verificó que tenga esos campos); va con la fase 4 | Baja (por ahora) |

## 2. Mejoras (2.0 supera a 1.0: se mantienen y no se retrocede)

| # | Mejora | Evidencia 1.0 | Evidencia 2.0 | Prioridad de conservar |
|---|---|---|---|---|
| M1 | **Aislamiento de tenants en Postgres (RLS) en vez de un filtro manual en cada consulta.** | `src/lib/tenant-scope.ts` | `for-tenant.ts`, `opai_app` NOBYPASSRLS | Alta |
| M2 | **Multiempresa real:** un mismo usuario puede estar en varios tenants y elige empresa al entrar. En 1.0 el `Admin` tiene un solo `tenantId` y un correo único global. | `Admin` (l.627); `multitenancy.md` ("Cada Admin tiene un único tenantId") | `Membership` (`tenancy.prisma`), `app/(auth)/elegir-empresa` | Alta |
| M3 | **Capacidad única para UI, MCP y API:** cada una declara permiso, efecto, dryRun e idempotencia, y queda auditada automáticamente. En 1.0 las rutas se escriben a mano y `logAudit` es opcional. | `src/lib/api-auth.ts` + `api-auth-*` | `packages/capabilities/src/define.ts`, `autorizacion.ts`; gate de paridad UI↔MCP | Alta |
| M4 | **API keys:** scopes por módulo, usuario responsable, tipo de principal, presupuesto mensual, expiración y autonomía, con aprobación humana y `soloPersonas`. En 1.0 la key es solo READ o READ_WRITE (con una READ_WRITE quedan expuestas 106 herramientas) y los dominios están solo diseñados. | `McpApiKey` (l.14004), `docs/integrations/mcp-scopes-design.md` | `ApiKey`, `ApiKeyAutonomia`, `Aprobacion`, `UsageEvent`; `autorizacion.ts` | Alta |
| M5 | **Una sola fuente de permisos** con patrón `<modulo>:<accion>`, comodines y denegación que siempre gana. En 1.0 conviven tres sistemas (role-policy, permissions, rbac). | `role-policy.ts`, `rbac.ts`, `permissions.ts`, `role-policy-single-source.md` | `packages/domain/src/permisos.ts` | Alta |
| M6 | **Invitación más segura:** token con hash SHA-256 de búsqueda directa, 72 h, portales y rol validado por jerarquía. En 1.0 dura 48 h, se compara contra cada pendiente y el correo dice "Gard Docs". | `src/app/(app)/opai/actions/users.ts` | `core/invitar.ts`, `invitations.ts` (solo un owner invita a un owner; solo owner y admin invitan a un admin) | Media |
| M7 | **Contraseña mínima de 10 caracteres** con letra y número (en 1.0 el mínimo es 8). Recuperación en 30 minutos. | `security-policy/policy.ts` (mínimo histórico 8) | `packages/auth/src/opciones.ts` | Media |
| M8 | **Bitácora encadenada append-only y auditoría en toda escritura.** | `AuditLog` plano | `packages/db/src/bitacora.ts`, `AuditEvent` | Media |
| M9 | **Configuración declarativa por ámbitos** y secretos cifrados por tenant. En 1.0 es un `Setting` key-value sin tipo con 31 secciones. | `Setting`, `src/app/(app)/opai/configuracion/*` | ADR-018, ADR-027, `Ajuste`, `Integracion`, `Secreto`, `ClaveTenant` | Media |
| M10 | **Identidad única para la plataforma** (`platformRole` owner/support, que nunca da permisos dentro de un tenant). En 1.0 `PlatformAdmin` es una tabla aparte con su propio login. | `PlatformAdmin` (l.306), `src/lib/platform-jwt` | `identidad.prisma` `User.platformRole`, `permisos.ts` | Media |
| M11 | **Notificaciones en silencio por defecto**, con plantillas por evento y canal. Ataca el ruido de 1.0 (unas 1.000 notificaciones diarias). | modelos `Notification*` | ADR-020, `Plantilla`, `NotificacionRegla` | Media |

## 3. No copiar (existe en 1.0 y no debe pasar a 2.0)

| # | Elemento | Evidencia 1.0 | Motivo / referencia 2.0 | Prioridad |
|---|---|---|---|---|
| N1 | Roles legacy (`solo_ops/crm/documentos/payroll`, `reclutamiento`, `operaciones`) y el permiso deprecado `facturacion_manage` | `src/lib/role-policy.ts`, `src/lib/permissions.ts` | Se resuelve con la tabla de equivalencia de B2; no se crean como roles nuevos | Alta |
| N2 | Impersonación con secreto compartido de entorno (no se muestra el valor) | `src/lib/auth.ts` (`PLATFORM_IMPERSONATE_SECRET`) | Si se porta (B6), debe ser una capacidad `platform:*` auditada, con motivo y caducidad | Alta |
| N3 | `Setting` key-value sin tipo | modelo `Setting` | `extraccion/maestros.md` §10 e `integraciones-y-configuracion` §3 | Media |
| N4 | `PlatformAdmin` como tabla y login aparte | `PlatformAdmin`, `src/app/platform/*` | Lo reemplaza `platformRole` (M10) | Media |
| N5 | Filtro de tenant manual en la aplicación como único control | `src/lib/tenant-scope.ts` | Lo reemplaza RLS (M1) | Media |
| N6 | Autorregistro público de tenants | `src/app/api/public/signup` | 2.0 da de alta tenants solo desde la plataforma (`platform:tenants.manage`) | Media |
| N7 | Secciones de configuración de módulos excluidos | `configuracion/{gamificacion,ats,alertas-cobertura,psicolaboral,conocimiento,asistente-ia}` | Gamificación, ATS, alertas y cobertura, psicolaboral y conocimiento están en el backlog del ROADMAP (`01-decisiones.md` l.336). `asistente-ia` no: la sección de configuración de 1.0 no se porta, y el asistente sale del backlog como agente interno nuevo (ADR-049, propuesto; ver N8) | Baja |
| N8 | Integraciones de Slack, agenda/Google Calendar y chat o asistente IA | modelos `Slack*`, `Calendar*`, schema `chat`, `src/lib/ai/help-chat-*` | Slack y agenda están en el backlog; las integraciones nuevas se declaran por ADR-027. **Nota del 26-oct-2026:** el asistente IA sale del backlog: es el agente interno de ADR-049, propuesto en PR #38 (Decisión de Carlos, 26-oct-2026 10:08 CLT, chat con OPAI 2.0 (registrada por el bot OPAI 2.0): «ok» a la recomendación del bot de las 10:07), con brief propio después de CPQ y la reserva del punto de entrada integrada en `main` (PR #37, `7e526eb`); no se porta el código de 1.0 | Baja (Slack y agenda) · Planificada (asistente, ADR-049, propuesto) |
| N9 | Onboarding y tours de la UI | `(app)/personas/onboarding`, modelos `Onboarding*` | Excluidos | Baja |

## 4. Preguntas abiertas para Carlos

1. Equivalencias de roles (B2): ¿a qué rol de 2.0 pasa cada uno de jefe_operaciones, central_monitoreo, editor, rrhh, finanzas e inspector_dt? ¿O se adelantan los roles personalizados?

### Preguntas cerradas (24-oct)

- `portal/acceso` (control de acceso físico, schema `access_control`): ¿entra en Operaciones o queda excluido? **Resuelta:** se porta en el portal de terreno (ver Decisiones).
- Ley 21.719 (B4): ¿se implementa en 2.0 antes de migrar a Gard, o 1.0 la cubre mientras siga en producción? **Resuelta:** 2.0 la cubre siempre y por diseño (ver Decisiones).

## Decisiones de Carlos (24-oct-2026)
- Usuarios: no se migran; Carlos los crea a mano. Pero 2.0 debe manejar roles y permisos al menos tan bien como 1.0 (roles personalizados, permisos finos, alcance del supervisor por instalación). Brecha Alta.
- Ley 21.719: 2.0 la cubre siempre y por diseño (DPA, consentimiento, ARCO, DPO). Brecha Alta del Núcleo.
- Control de acceso (portal/acceso): se porta sí o sí, mejorado y con registro completo, dentro del portal de terreno (fase Operaciones y portales).
- Migración: solo cuentas, instalaciones, contactos, negocios, licitaciones y guardias. Recomendación: definir el mapeo por módulo durante el desarrollo y probarlo con copia anonimizada; carga real al final.
