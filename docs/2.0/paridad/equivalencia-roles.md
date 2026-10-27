# Equivalencia de roles 1.0 → 2.0 (Brief 07c · B2)

Guía de alta para crear a mano los usuarios de Gard en 2.0 **sin dar de más ni quitar acceso**
(los usuarios no se migran; los crea Carlos, `ESTADO.md` decisión 1). Cierra la brecha Alta B2 de
`docs/2.0/paridad/nucleo.md`.

**Decisión de Carlos (26-oct-2026 11:57 CLT, t310u — «ok a todo» a la recomendación de §16.1):**
opción B. Los roles de 1.0 se mapean a los **cinco roles base** de 2.0 (owner, admin, gerente,
supervisor, viewer, ADR-016); para lo que no calza se crean **roles personalizados acotados** sobre
el catálogo del Núcleo (`seed:roles-base`, solo `dev`/`test`). Los roles **legacy** de 1.0 (brecha N1)
**no se recrean**: se resuelven aquí con el rol más cercano y, cuando haga falta, una excepción por
usuario o una concesión explícita (owner/admin).

**Decisión de OPAI 2.0 — mínimo privilegio (autorizado por Carlos el 26-oct-2026 16:54 y 16:59 CLT
para decidir en el Núcleo).** `rrhh`, `finanzas` y `solo_payroll` **no** se mapean a **gerente** (que
edita casi todo): daría permisos de más. Cada uno se mapea a su **propio rol personalizado acotado**
—«RRHH», «Finanzas», «Payroll»— de **solo lectura y cálculo**, y el owner/admin concede `finanzas:*`
o `nomina:*` solo si el usuario los necesita. Los cinco roles personalizados («Central de monitoreo»,
«Inspector DT», «RRHH», «Finanzas», «Payroll») se siembran con `seed:roles-base`.

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
| `inspector_dt` | **«Inspector DT»** (personalizado) | rol sembrado | Lectura de cumplimiento DT (personas, documentos, instalaciones) más **estructuras de sueldo y auditoría** (Decisión de Carlos, 26-oct-2026 20:48 CLT, respuesta t74s350 en el chat de Diseño y QA: "Sí, el Inspector DT ve sueldos y auditoría; cambia el seed"); sin escritura. Los permisos DT se suman cuando el módulo de Asistencia/DT los declare. |
| `rrhh` | **«RRHH»** (personalizado acotado) | rol sembrado + concesión | Personas y documentos en lectura. **Nunca gerente** (mínimo privilegio): si gestiona nómina, el owner/admin le concede `nomina:*` cuando exista ese módulo. |
| `finanzas` | **«Finanzas»** (personalizado acotado) | rol sembrado + concesión | Lectura para conciliar y facturar (cuentas, documentos). **Nunca gerente** (mínimo privilegio): el owner/admin le concede `finanzas:*` (y `nomina:*` si corresponde) cuando exista el módulo. |
| `operaciones` | **gerente** (base) | directo | Gestión operativa; permisos de Operaciones cuando exista el módulo. |
| `reclutamiento` | **viewer** (base) | + excepción | Lectura; los permisos de reclutamiento llegan con el módulo comercial. Se afina con excepciones por usuario. |
| `solo_payroll` | **«Payroll»** (personalizado acotado) | rol sembrado + concesión | Lectura y cálculo de nómina (personas, estructuras de sueldo). **Nunca gerente** (mínimo privilegio): el owner/admin le concede `nomina:*` cuando exista el módulo. |
| `solo_crm` | **viewer** (base) | + excepción | Lectura; permisos comerciales cuando exista el módulo. |
| `solo_ops` | **«Central de monitoreo»** (personalizado) | rol sembrado | Lectura operativa en tiempo real, igual que central_monitoreo. |
| `solo_documentos` | **viewer** (base) | + excepción | Lectura acotada a documentos; se recorta con excepciones que denieguen lo demás. |

«+ concesión» = owner/admin agrega un permiso bloqueado (finanzas/nómina). «+ excepción» = se ajusta
con una excepción por usuario (`core.excepciones.set`); denegar siempre gana. Ninguna concesión
excede lo que el actor que la hace ya tiene.

## Roles personalizados sembrados (solo `dev`)

`pnpm --filter @opai/db seed:roles-base`, en el tenant `gard`, crea los cinco roles personalizados
que 1.0 tenía y los cinco roles base de 2.0 no cubren. Es **idempotente y no pisa los ajustes del
tenant**: crea los que faltan y actualiza al conjunto canónico solo los roles que él mismo sembró y
que el tenant no editó (detecta un conjunto de permisos previo conocido; cualquier otro conjunto se
considera editado y se deja intacto). Así un «Inspector DT» sembrado antes de la decisión t74s350
—sin sueldos ni auditoría— se completa al correr de nuevo, sin tocar los roles que el tenant ya
ajustó (I1 de la QA del PR #60). El seed **se niega a correr en producción** (solo `dev`/`test`,
igual que `seed:e2e`). Son roles
normales (`sistema = false`): el owner o el admin los puede ajustar. Permisos del catálogo del Núcleo;
los de los módulos (Operaciones, Rondas, Asistencia/DT, Nómina, Finanzas) se agregan cuando esos
módulos declaren los suyos. Los tres acotados nacen **sin** `finanzas:*` ni `nomina:*`; el owner/admin
los concede con `core.excepciones.set` o editando el rol, sin conceder más de lo que él tiene (§16.2).

| Rol | Permisos del catálogo core |
|---|---|
| **Central de monitoreo** | `core:tenant.read`, `core:cuentas.read`, `core:instalaciones.read`, `core:personas.read`, `core:documentos.read` |
| **Inspector DT** | `core:tenant.read`, `core:instalaciones.read`, `core:personas.read`, `core:documentos.read`, `core:estructuras.read`, `core:audit.read` |
| **RRHH** | `core:tenant.read`, `core:personas.read`, `core:documentos.read` |
| **Finanzas** | `core:tenant.read`, `core:cuentas.read`, `core:documentos.read` |
| **Payroll** | `core:tenant.read`, `core:personas.read`, `core:estructuras.read` |

En los tenants reales estos roles los crea quien corresponda desde Configuración → Usuarios y
permisos (la pantalla llega con su diseño aprobado, bloque 6 del brief).
