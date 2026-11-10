# CAR-251 · Grupos o equipos de usuarios para autorización

**Tarea:** CAR-251 (Núcleo). **Depende de:** nada. **Lo usa:** CAR-252 (políticas de aprobación por empresa y tipo de acción).

## Decisión de Carlos (10-nov-2026, 15:14, America/Santiago)

Las aprobaciones se configuran caso a caso (por ejemplo, enviar cotizaciones y emitir facturas). En cada caso se nombran uno o más usuarios, uno o más grupos o equipos de trabajo (que se pueden crear) o un perfil que pueda autorizar. **Nunca cae por defecto en admin u owner.**

Este frente crea solo los grupos y su membresía. El motor de políticas, el permiso «aprobar» separado de «ejecutar», el ruteo de avisos y la UI de políticas son de CAR-252.

## Qué entra

- **Tablas** en `core` (migración aditiva `20261119100000_core_grupos_usuarios`, con RLS `tenant_isolation`):
  - `core.grupos_usuarios`: `id`, `tenant_id`, `nombre`, `descripcion`, `archivado_en`, fechas. Nombre único por empresa entre los grupos vigentes (índice parcial sobre `lower(nombre)` con `archivado_en IS NULL`). Se archiva, nunca se borra en duro.
  - `core.grupo_usuarios_miembros`: `id`, `tenant_id`, `grupo_id`, `user_id`, fechas. Único `(grupo_id, user_id)`.
  - **FK compuestas por tenant:** `(tenant_id, grupo_id) → grupos_usuarios(tenant_id, id)` y `(tenant_id, user_id) → memberships(tenant_id, user_id)`. La base impide sumar a un usuario que no es miembro de la misma empresa o colgar un miembro de un grupo de otra empresa, aunque alguien salte la capacidad.
- **Capacidades** (`core.grupos.*`, módulo `core`, en UI, `/api/v1` y MCP):
  - Lectura (`core:users.read`): `core.grupos.list`, `core.grupos.get`.
  - Escritura (`core:users.manage` **y** rol base owner o admin, igual que roles personalizados, §16.2), todas con `dryRun` (`preview_…` en MCP) e `idempotencyKey`: `core.grupos.create`, `core.grupos.update`, `core.grupos.archive`, `core.grupos.agregar_miembros`, `core.grupos.quitar_miembro`.
  - Cada escritura real queda en `core.audit_events` (misma transacción, ADR-052) y emite su evento de dominio (`core.grupo.*`).
- **Pantalla:** Configuración › Usuarios y permisos › pestaña **Grupos** (`/configuracion/usuarios/grupos`), con la lista y la hoja de detalle/edición del DS (mismo patrón que Roles).

## Contrato para CAR-252

- Un aprobador «grupo» se resuelve con `core.grupo_usuarios_miembros` filtrando por `tenant_id` y `grupo_id`, y descartando grupos archivados y membresías no `activa`. El índice `(tenant_id, user_id)` sirve para la consulta inversa («¿a qué grupos pertenece este usuario?»).
- Un grupo archivado no debería aprobar; CAR-252 decide qué pasa con una política que lo nombra.
- Este PR **no** agrega ningún respaldo a owner/admin ni toca `core:aprobaciones.manage`.

## Fuera de alcance

Políticas, umbrales, N de M, delegación, permiso «aprobar», ruteo de avisos (CAR-252/253). `core.funciones` (cargos operativos) no se toca ni se reutiliza.
