# CAR-96 · Turnos extras: registro y aprobación

- **Sesión:** Sesión Cursor
- **PR:** (este PR) · rama `cursor/car-96-turnos-extra-374b`
- **Estado:** En PR
- **Migración:** Sí · `20270108100000_pauta_turnos_extra` (aditiva; después de visitas #816 y tickets_instalacion #821)
- **Apilado sobre / espera:** construido sobre `main`. No apila sobre #816/#821/#868/#871 (CAR-83/84). Esos PR tocan `pauta.prisma`, `pauta/index.ts`, `manifest.ts` y el snapshot MCP: al integrar habrá que resolver el merge de esos archivos centrales.

## Qué entra (PR 1 · servidor)

- Tabla `pauta.turnos_extra` + `pauta.tarifas_turno_extra` con RLS.
- Capacidades (MCP + `preview_`): `registrar`, `listar`, `aprobar`, `rechazar`, `monto_fijar`.
- Permiso `pauta:aprobar_extra` (gerente; owner/admin por `*`). Nadie aprueba lo que registró.
- Al asignar reemplazo o agregar refuerzo se crea el turno extra `por_aprobar` (variante `refuerzo_extra`).
- Anular la excepción rechaza el turno extra pendiente.
- Dominio: resolución de monto puesto → instalación → sin tarifa.
- Sin pantallas nuevas de «Por aprobar» ni ficha de externo (PR 2, diseño ADR-109).
- Sin pago, sin lote (CAR-101), sin informar a Nómina, sin migración de estados de persona.

## Qué se decidió

- **Carlos en CAR-458 (14-nov-2026):** opción A — construir ya registro y aprobación sin plata ni Nómina. Queda registrado en la adenda de ADR-083.
- **Sesión:** el «rol Operaciones» se cubre con el permiso `pauta:aprobar_extra` (asignable también por permisos adicionales); no se crea un rol base nuevo. Las tarifas viven en tabla propia porque el catálogo de ajustes solo admite ámbito tenant/usuario/plataforma.

## Qué queda fuera

- Pago por lote (CAR-101) y revisión legal/contable escrita.
- Pantallas de aprobación, tarifas en ficha e historial por persona (PR 2).
- Estados de persona postulante/externo/activo (ADR-083 §5): no bloquean el registro con `tipo_trabajador`.
- Cobro al cliente (CAR-100).
