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
| P-1 | **Gerente y lector se definen por «todo menos…».** `gerente` permite `*` y resta más de 40 denegaciones; `viewer` permite `*:read` y `*:*.read`. Un permiso nuevo de cualquier módulo queda concedido a esos roles sin que nadie lo decida. En el referente los permisos se suman: lo nuevo no lo tiene nadie hasta que se concede. | `permisos-patrones.ts`. Ninguna prueba recorre el catálogo real: `permisos-nucleo.test.ts` cubre una tabla escrita a mano y `permisos.test.ts` un catálogo de ejemplo | Alta | Ajustar: pasar gerente y lector a lista explícita, o exigir con una prueba que cada permiso del catálogo esté clasificado por rol |
| P-2 | **Un solo rol por miembro y grupos sin rol.** No se puede ser «gerente comercial» y además «aprobador de rendiciones» sin crear un rol combinado o excepciones una a una. | `Membership.rol`, `roleId`; `GrupoUsuarios` sin permisos | Alta | Ajustar: varios roles por miembro (se suman) y asignación de rol a grupo |
| P-3 | **Llaves de tipo usuario con `*` y herencia por defecto.** En ellas `scopes` admite `*` (con advertencia), los permisos son opcionales (si se omiten, hereda todo) y el vencimiento es opcional. Ya existen buenos controles: la llave de tipo servicio exige permisos explícitos y presupuesto, la de plataforma vence en 7 días y `*` nunca la cubre, crear una llave exige segundo factor y nadie concede lo que no tiene. La llave `*` de Gard sigue pendiente de revocar (ADR-051). | `packages/capabilities/src/core/apikeys.ts`, `apikey-scopes.ts`; `ApiKey` en `schema/tenancy.prisma`; `CONTEXTO-agentes.md` | Alta | Ajustar: llevar la llave de tipo usuario al nivel de la de servicio (permisos elegidos y vencimiento por defecto); `*` solo en desarrollo. Revocar la de Gard es decisión de Carlos |
| P-4 | **El alcance de datos es de caso único.** Existe para supervisor (instalaciones) y jefatura. No hay un alcance general del tipo «solo mis negocios», «solo mi área» o «solo este centro de costo». | `schema/alcance.prisma`; Comercial respeta el alcance por instalaciones, pero no hay regla «solo mis negocios» | Media | Ajustar cuando un cliente lo pida: alcance declarado por rol (todos, su equipo, propios) |
| P-5 | **El acceso no sigue al cargo.** El usuario (membresía) y la persona (ficha) se vinculan a mano (`core.personas.vincular_usuario`); cambiar el cargo no cambia el rol. | `packages/capabilities/src/core/maestros/` | Media | Decisión de producto (ver README) |
| P-6 | **No hay «por qué puede o no puede».** Existen `core.permisos.catalogo`, `core.excepciones.list` y `core.me` (los propios); ninguna explica los permisos efectivos de otro miembro. | `packages/capabilities/src/core/permisos/` | Media | Ajustar: `core.permisos.explicar` con pantalla en la ficha del miembro |

## Estado al 16-nov-2026

Repaso semanal contra `main` en `886e262` (CAR-586). Las tres brechas altas quedaron resueltas en el producto. Quedan las tres medias y una tarea operativa: revocar la llave `*` de Gard.

| # | Estado | Qué cambió y dónde se comprueba |
|---|---|---|
| P-1 | Cerrada | CAR-350 (#656) y CAR-387. Gerente, lector y supervisor salen de una lista explícita (`packages/domain/src/permisos-patrones.ts`, `permisos-base*.ts`); `apps/web/test/permisos-base.test.ts` falla si un permiso del catálogo queda sin clasificar. Solo owner y admin conservan `*` |
| P-2 | Cerrada | CAR-359. Varios roles por miembro y roles a grupos: `RolMiembro` y `RolGrupo` en `schema/roles-asignados.prisma`; `core/permisos/roles-adicionales.ts` y `core/grupos/roles.ts`. Nadie asigna un rol que no podría dar |
| P-3 | Cerrada en el producto; queda una tarea operativa | CAR-351. Toda llave nueva vence dentro del máximo de la empresa (`apikey-politica.ts`, ajuste `apikeys_vida_maxima_dias`), heredar todos los permisos dejó de ser el valor por defecto y el scope `*` en producción solo lo crea un owner. Sigue pendiente revocar la llave `*` de Gard (ADR-051): toca al tenant Gard y lo decide Carlos |
| P-4 | Abierta | Sin cambios |
| P-5 | Abierta | Sin cambios; decisión de producto |
| P-6 | Abierta | Sin cambios: no existe `core.permisos.explicar` |

**Nuevo en la semana, sin brecha.** «Ver como» (CAR-528, PR #910, #911 y #913, abiertos al 16-nov) sigue el patrón de Stripe e Intercom: permiso propio (`core:ver_como.iniciar`, sin rol base), solo lectura bloqueada en el servidor, vencimiento a los 30 minutos, inicio y fin en la auditoría de seguridad, y no se puede ver como alguien de un rol superior. Se revisó contra esta capa y no se encontró brecha.

## Qué se mantiene tal cual

Permisos finos por capacidad, roles a medida, excepciones con motivo, la regla de no conceder más de lo propio, auditoría encadenada, separación de plataforma y lecturas sensibles auditadas. Están al nivel del referente.

## Si se rehiciera

No se recomienda. Las brechas se cierran con cambios aditivos: P-1 no pierde nada (misma matriz, escrita al revés); P-2 migra `Membership.roleId` a una tabla de asignaciones conservando lo actual.
