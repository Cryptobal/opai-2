# Núcleo · Validación del portal en sesiones

## Encargo y bloque 0

Origen: review 5661270514 del Revisor OPAI 2.0 en el PR #59, citada en el encargo.
La adenda del encargo fija que un `ctx.portal` vacío se rechaza (fail-closed);
solo en las rutas ERP se deriva el portal del servidor, nunca del cliente.
No se ha implementado ni modificado esta decisión.

Se confirmó en `origin/main` la presencia de #59 (`4439401`) y #60 (`bacf808`).
Se ejecutó `git merge origin/main` en `core/portal-sesion`, resuelto por fast-forward
a `7eefa91`. Sin push, sin PR y sin modificaciones a otras ramas.

## Bloqueo: aceptar una invitación antes de tener membresía

- `apps/web/app/(auth)/invitacion/[slug]/[token]/acciones.ts:18-30` construye
  un contexto de usuario con tenant y portal ERP, sin membresía.
- La misma acción ejecuta `core.invitations.accept` (líneas 38-41).
- `packages/capabilities/src/core/aceptar.ts:63-90` declara esa capacidad interna
  precisamente porque se acepta el enlace antes de existir la membresía.
  El handler valida el token y el correo y después crea la membresía.
- Exigir acceso al portal desde una membresía existente para toda sesión con
  tenant bloquearía este flujo. Derivar `erp` del servidor no lo resuelve:
  falta la membresía que debe conceder acceso a ese portal.

Se detiene la implementación por falta de una decisión sobre esta excepción.
Propuesta para aprobación, **no implementada**: conservar exclusivamente el flujo
interno de aceptación autenticado por token y correo fuera del requisito de
portal de membresía; no exceptuar indiscriminadamente capacidades internas.
No se atribuye esta propuesta a Carlos ni se considera aprobada.

## Criterios pendientes

Bloques 1 y 2 pendientes completos: autorización, propagación de portales de la
membresía actual, pruebas negativas/positivas, test:db y e2e afectados.
Bloque 3 pendiente: registro definitivo de la regla en ADR-016/033 y ESTADO.
No hay cambios de código, pantallas, migraciones ni de permisos efectivos.
No se dispone de ID CAR-n en el encargo: no se inventa uno.

## Gate del cambio documental

`pnpm typecheck` OK; `pnpm lint` OK (18 advertencias preexistentes de longitud);
`pnpm test` OK (121 archivos, 716 pruebas). No se ejecutaron test:db, build,
presupuesto ni e2e: no hubo implementación ni push. `PR-BODY.md` queda sin commitear.
