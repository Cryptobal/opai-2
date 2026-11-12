# Permisos y roles — auditoría contra GitHub · Google Workspace · Rippling

**Recomendación: ajustar.** El modelo es correcto y cercano al referente. Hay que invertir una regla y sumar dos piezas.

## Qué hace hoy

- **Permisos finos `<modulo>:<accion>`** con comodines y denegación que siempre gana: `packages/domain/src/permisos.ts`.
- **Cinco roles base** fijos (owner, admin, gerente, supervisor, viewer): `packages/domain/src/permisos-roles.ts`; sus patrones en `permisos-patrones.ts`.
- **Roles a medida por empresa** (`core.roles`) y **excepciones por usuario** con motivo y autor (`core.permiso_excepciones`): `packages/db/prisma/schema/permisos.prisma`, capacidades en `packages/capabilities/src/core/permisos/`.
- **Nadie concede más de lo que tiene**: `permisosNoConcedibles` y `puedeAsignarRol` en `permisos-efectivos.ts` y `permisos.ts`.
- **Un rol por miembro**: `Membership.rol` más `roleId` opcional (`schema/tenancy.prisma`).
- **Alcance por filas** para el supervisor (instalaciones a cargo, `schema/alcance.prisma`) y por jefatura (CAR-314), aplicado en la consulta (ADR-022).
- **Grupos de usuarios** (`schema/grupos.prisma`, `core.grupos.*`): hoy solo los usa la configuración de Slack.
- **Campos sensibles con permiso propio** (`core:estructuras.read_sensible`, datos de pago y previsión) y lecturas auditadas (NÚCLEO-H).
- **Auditoría encadenada e inmutable** con pantalla y capacidad: `core.audit.list`, `apps/web/app/(erp)/configuracion/auditoria/`.
- **Llaves de agente** con alcance por módulo, permisos finos opcionales, presupuesto y vencimiento opcional (`ApiKey` en `schema/tenancy.prisma`); la autenticación exige membresía activa del responsable (`apps/web/lib/api-key.ts`).
- **Plataforma separada**: `platform:*` nunca sale de un rol de empresa.

## Qué hace el referente

Roles hechos de permisos que **se suman**, varios roles por persona, roles asignados a equipos, alcance de datos como dimensión propia, acceso que sigue a los atributos de la persona, y llaves restringidas por recurso.

## Brechas

| # | Brecha | Evidencia | Gravedad | Recomendación |
|---|---|---|---|---|
| P-1 | **Gerente y lector se definen por «todo menos…».** `gerente` permite `*` y resta más de 40 denegaciones; `viewer` permite `*:read` y `*:*.read`. Un permiso nuevo de cualquier módulo queda concedido a esos roles sin que nadie lo decida. En el referente los permisos se suman: lo nuevo no lo tiene nadie hasta que se concede. | `permisos-patrones.ts`. No se encontró una prueba que falle cuando aparece un permiso sin clasificar (`permisos.test.ts` usa un catálogo de ejemplo) | Alta | Ajustar: pasar gerente y lector a lista explícita, o exigir con una prueba que cada permiso del catálogo esté clasificado por rol |
| P-2 | **Un solo rol por miembro y grupos sin rol.** No se puede ser «gerente comercial» y además «aprobador de rendiciones» sin crear un rol combinado o excepciones una a una. | `Membership.rol`, `roleId`; `GrupoUsuarios` sin permisos | Alta | Ajustar: varios roles por miembro (se suman) y asignación de rol a grupo |
| P-3 | **Llaves con `*` y herencia por defecto.** `scopes` admite `*`, `heredaPermisos` nace en verdadero y `expiraEn` es opcional. La llave `*` de Gard sigue pendiente de revocar (ADR-051). | `ApiKey` en `schema/tenancy.prisma`; `CONTEXTO-agentes.md` | Alta | Ajustar: llave nueva nace sin herencia, con permisos elegidos y vencimiento; `*` solo en desarrollo. Revocar la de Gard es decisión de Carlos |
| P-4 | **El alcance de datos es de caso único.** Existe para supervisor (instalaciones) y jefatura. No hay un alcance general del tipo «solo mis negocios», «solo mi área» o «solo este centro de costo». | `schema/alcance.prisma`; en Comercial no se encontró filtro por responsable como regla de acceso (por verificar en detalle) | Media | Ajustar cuando un cliente lo pida: alcance declarado por rol (todos, su equipo, propios) |
| P-5 | **El acceso no sigue al cargo.** El usuario (membresía) y la persona (ficha) se vinculan a mano (`core.personas.vincular_usuario`); cambiar el cargo no cambia el rol. | `packages/capabilities/src/core/maestros/` | Media | Decisión de producto (ver README) |
| P-6 | **No hay «por qué puede o no puede».** No se encontró una capacidad que explique los permisos efectivos de un miembro (rol, excepción o denegación que decide). | `packages/capabilities/src/core/permisos/` | Media | Ajustar: `core.permisos.explicar` con pantalla en la ficha del miembro |

## Qué se mantiene tal cual

Permisos finos por capacidad, roles a medida, excepciones con motivo, la regla de no conceder más de lo propio, auditoría encadenada, separación de plataforma y lecturas sensibles auditadas. Están al nivel del referente.

## Si se rehiciera

No se recomienda. Las brechas se cierran con cambios aditivos: P-1 no pierde nada (misma matriz, escrita al revés); P-2 migra `Membership.roleId` a una tabla de asignaciones conservando lo actual.
