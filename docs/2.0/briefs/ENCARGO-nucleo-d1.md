# NÚCLEO-D1 · Portal forzado en servidor y portal de inicio

Encargo de Carlos: 26-oct-2026 20:47 CLT, chat con OPAI 2.0, t457u:
«ponlo entonces en el plan de desarrollo para que todo se haga y lo que debamos hacer en el nucleo lo hagamos altiro».
Continuaciones del encargo del 27-oct-2026. No incluye ID de Linear; no se inventa uno.

## Alcance y adaptación a main

- Bloque 0: actualización normal desde `origin/main`. #59 y #60 presentes; #68 ya
  valida portal de sesiones y catálogo en `restriccion`. Se conserva su excepción
  exclusiva de `core.invitations.accept` y el comportamiento sin tenant.
- Bloque 1: ambos ejecutores web rechazan el portal antes de buscar la capacidad.
  Mismo FORBIDDEN y mensaje exista o no el ID. Plataforma solo por rol global.
- Bloque 2: dominio puro, diagnóstico de solo lectura, validación al invitar y al
  modificar rol/portales o reactivar. Una suspensión sola no exige reparar datos históricos.
- Bloque 3: `portal_inicio` nullable en membresías e invitaciones (para conservar la
  elección del administrador hasta la aceptación). Capacidad personal con preview,
  idempotencia del ejecutor, auditoría y outbox. Actualización condicionada al usuario,
  tenant, estado activo y portal todavía concedido. Login y cambio de empresa respetan
  `next` explícito, incluso `/`; sin `next`, preferencia o primer portal permitido.
  La aceptación pasa por un request nuevo para leer la membresía recién creada.
- Bloque 4: hoja del menú de usuario con Sheet, Campo, Select, Button y Alerta del
  DS V2 existente; carga diferida. No hay ruta, patrón ni componente del DS nuevo.
- No se modifica `lib/navegacion.ts` ni `datos-shell.ts`.
- Autorrevisión del constructor OpenCode: una membresía con rol histórico desconocido
  no se reactiva ni cambia portales sin indicar un rol válido; aún puede suspenderse.
  La migración se renombró a `20261028110000_portal_inicio` por colisión de timestamp,
  sin modificar su SQL. El merge de #70 conserva el bloqueo de cambios de rol por agentes.

## Criterios técnicos de implementación

Responsable: constructor OpenCode / openai/gpt-6.1-sol, según este encargo y ADR-016/022/033.
No son nuevas decisiones atribuidas a Carlos:

1. La matriz de usuario interno admite ERP, Supervisor, Trabajador y Terreno para los
   cinco roles base: el rol determina acciones y alcance, no concede el portal. Todos
   rechazan Cliente, Plataforma y nombres desconocidos. No concede accesos a ninguna
   membresía. Roles personalizados heredan el rol base. Principales cuenta/persona
   admiten solo Cliente/Trabajador, respectivamente (ADR-033).
2. Preferencia por empresa, no global, porque vive en memberships; null significa
   primero permitido en el orden de la membresía. Plataforma nunca se guarda como
   preferencia del tenant. Sin membresía, el rol global puede entrar en Plataforma.
3. El diagnóstico muestra IDs de membresía y tenant, rol y portales, sin correos.
   No repara datos existentes. Carlos decide cualquier corrección posterior.
4. Compare-and-swap para la combinación rol/portales/estado al actualizar usuarios;
   la preferencia usa una condición atómica. Si cambia la membresía, se pide recargar.

## Criterios de aceptación y evidencia

| CA | Implementación / prueba |
|---|---|
| Portal ajeno denegado sin enumerar catálogo | `servidor-portales.test.ts`, `capacidad-acceso.test.ts`; restricciones de #68 conservadas |
| Rol, portal y principal coherentes | `domain/src/portales.test.ts`, `core-users.test.ts`; diagnóstico sin escrituras |
| Preferencia propia, preview, auditoría y revocación concurrente | `portal-inicio.test.ts` de capacidades |
| Preferencia de invitación llega a membresía | `core-users.test.ts` |
| Nueva columna conserva RLS | `db/test/rls-identidad.test.ts`, suite completa test:db |
| Redirect y next seguro | `web/test/portal-inicio.test.ts`, `destinoSeguro` sin cambios |
| UI DS V2 y login a 375/1024/1280 | `e2e/portal-inicio.spec.ts`, capturas locales fuera del repositorio |
| Presupuesto sin subir topes | `pnpm presupuesto` después del build |

Autorrevisión independiente realizada; se corrigieron la redirección desde invitación
y la suspensión de membresías históricamente incoherentes. El resultado final de los
gates y cualquier limitación externa se registra en `PR-BODY.md`, sin commitearlo.
La migración se verifica en Postgres local; Neon lo aplica Carlos al abrirse el PR,
que debe llevar `migracion-pendiente`. Este encargo no abre PR ni integra main.
