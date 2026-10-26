# Equivalencia de roles 1.0 → 2.0 (Brief 07c · B2)

Guía de alta para crear a mano los usuarios de Gard en 2.0 **sin dar de más ni quitar acceso**
(los usuarios no se migran; los crea Carlos, `ESTADO.md` decisión 1). Cierra la brecha Alta B2 de
`docs/2.0/paridad/nucleo.md`.

**Decisión de Carlos (26-oct-2026 11:57 CLT, t310u — «ok a todo» a la recomendación de §16.1):**
opción B. Los roles de 1.0 se mapean a los **cinco roles base** de 2.0 (owner, admin, gerente,
supervisor, viewer, ADR-016); para lo que no calza se crean **dos roles personalizados** («Central
de monitoreo», «Inspector DT») sobre el catálogo del Núcleo (`seed:roles-base`, solo `dev`). Los
roles **legacy** de 1.0 (brecha N1) **no se recrean**: se resuelven aquí con el rol base más cercano
y, cuando haga falta, una excepción por usuario o una concesión explícita (owner/admin).

## Principios (no se rompen)

- **Finanzas y nómina nacen bloqueadas.** `finanzas:*` y `nomina:*` solo los tienen owner y admin
  (bloqueo financiero de ADR-016, heredado de `applyFinancialRoleLock` de 1.0). Gerente, supervisor,
  viewer y los roles personalizados nacen **sin** ellos. El **owner o el admin** pueden concederlos
  explícitamente a cualquier rol o usuario, siempre dentro de «nadie concede un permiso que no tiene»
  (Carlos, 26-oct-2026 11:57 y 12:28 CLT, t310u y t320u; §16.2 del brief).
- **`platform:*` nunca por un rol del tenant**, ni siquiera personalizado.
- **Permiso ≠ alcance.** Que el supervisor vea solo sus instalaciones es alcance por filas (B3, PR 3),
  no un permiso; esta tabla solo fija el **permiso** (qué acciones).

## Roles activos de 1.0 (7)

| Rol 1.0 | Rol 2.0 | Cómo | Notas |
|---|---|---|---|
| `owner` | **owner** (base) | directo | Sin cambios; protegido como último owner. |
| `admin` | **admin** (base) | directo | «Hace todo salvo borrar el tenant y gestionar owners» (ADR-016); conserva finanzas y nómina. |
| `editor` | **gerente** (base) | directo | Edita maestros y configuración sin finanzas ni nómina. Si el editor de 1.0 emitía o anulaba facturas, el owner/admin le concede `finanzas:*` explícitamente. |
| `jefe_operaciones` | **gerente** (base) | directo | Gestión operativa amplia; los permisos de Operaciones se suman cuando exista ese módulo. |
| `central_monitoreo` | **«Central de monitoreo»** (personalizado) | rol sembrado | Lectura en tiempo real (instalaciones, cuentas, personas, documentos); sin finanzas, nómina ni gestión de usuarios. No calza en viewer sin perder contexto operativo; por eso rol propio (§16.1). |
| `supervisor` | **supervisor** (base) | directo | Permisos de supervisor + **alcance por instalación** (B3, PR 3): ve solo lo asignado. |
| `viewer` | **viewer** (base) | directo | Solo lectura general. |

## Roles legacy de 1.0 (9 · no se recrean, brecha N1)

| Rol legacy 1.0 | Rol 2.0 | Cómo | Notas |
|---|---|---|---|
| `inspector_dt` | **«Inspector DT»** (personalizado) | rol sembrado | Lectura de cumplimiento DT (personas, documentos, instalaciones); sin escritura ni finanzas. Los permisos DT se suman cuando el módulo de Asistencia/DT los declare. |
| `rrhh` | **gerente** (base) | + concesión | Personas y documentos. Si gestiona nómina, el owner/admin le concede `nomina:*`. |
| `finanzas` | **gerente** (base) | + concesión | El owner/admin le concede `finanzas:*` (y `nomina:*` si corresponde). Evita el alcance completo de admin sin perder finanzas. |
| `operaciones` | **gerente** (base) | directo | Gestión operativa; permisos de Operaciones cuando exista el módulo. |
| `reclutamiento` | **viewer** (base) | + excepción | Lectura; los permisos de reclutamiento llegan con el módulo comercial. Se afina con excepciones por usuario. |
| `solo_payroll` | **gerente** (base) | + concesión | El owner/admin le concede `nomina:*`; sin el resto del alcance de gerente que no use, recortado con excepciones que denieguen. |
| `solo_crm` | **viewer** (base) | + excepción | Lectura; permisos comerciales cuando exista el módulo. |
| `solo_ops` | **«Central de monitoreo»** (personalizado) | rol sembrado | Lectura operativa en tiempo real, igual que central_monitoreo. |
| `solo_documentos` | **viewer** (base) | + excepción | Lectura acotada a documentos; se recorta con excepciones que denieguen lo demás. |

«+ concesión» = owner/admin agrega un permiso bloqueado (finanzas/nómina). «+ excepción» = se ajusta
con una excepción por usuario (`core.excepciones.set`); denegar siempre gana. Ninguna concesión
excede lo que el actor que la hace ya tiene.

## Roles personalizados sembrados (solo `dev`)

`pnpm --filter @opai/db seed:roles-base` crea (idempotente, en el tenant `gard`) los dos roles
personalizados que 1.0 tenía y los cinco roles base de 2.0 no cubren. Son roles normales
(`sistema = false`): el owner o el admin los puede ajustar. Permisos del catálogo del Núcleo; los de
los módulos (Operaciones, Rondas, Asistencia/DT) se agregan cuando esos módulos declaren los suyos.

| Rol | Permisos del catálogo core |
|---|---|
| **Central de monitoreo** | `core:tenant.read`, `core:cuentas.read`, `core:instalaciones.read`, `core:personas.read`, `core:documentos.read` |
| **Inspector DT** | `core:tenant.read`, `core:instalaciones.read`, `core:personas.read`, `core:documentos.read` |

En los tenants reales estos roles los crea quien corresponda desde Configuración → Usuarios y
permisos (la pantalla llega con su diseño aprobado, bloque 6 del brief).
