# BRIEF — CAR-96 · Turnos extra: registro y aprobación (PR 1, mínimo)

**Estado: propuesta para aprobar (solo documentación).** Alcance elegido por Carlos el 6-nov-2026: «Registro + aprobación mínimos». No hay especificación ni diseño aprobados de turnos extra (`AGENTS.md`: especificación → diseño → código), y el PR 1 necesita una migración y un permiso nuevo; por eso este PR deja el brief para su OK y el código va en el PR siguiente. Decisiones de origen: A5–A10 y C13–C15 (29-oct-2026, Linear CAR-96). Depende de: Pauta diaria y reemplazos (CAR-86), titular y series (CAR-206 y CAR-207, ADR-081).

## 1. Objetivo
Que todo reemplazo o refuerzo pagado sea un **turno extra** registrado por el supervisor y aprobado por Operaciones o RR. HH., con su monto y su tipo de trabajador (propio o externo), sin tocar la nómina.

## 2. Estado actual (verificado en `main`)
- La Pauta ya registra **reemplazos** y **refuerzos** como excepciones (`pauta.excepciones`, tipos `reemplazo` y `refuerzo`) y las celdas llevan la variante «Turno extra por aprobar» (`refuerzo_extra`), pero **no hay monto, aprobación ni tipo propio/externo**.
- «No doblar» (A9) existe en `validarNoDoblar` (solapado o seguido).
- Los montos y reglas configurables se declaran como ajustes del módulo (`defineAjustes`, ADR-018).
- No existe permiso de aprobación de extras en `@opai/domain`.

## 3. Alcance (PR 1)
1. Registrar un turno extra sobre un reemplazo o refuerzo (un día, un puesto, una persona): tipo `propio` o `externo`, monto sugerido y motivo.
2. **Monto fijo por instalación**, con **excepción por puesto**; se puede editar en cada turno con motivo (queda en la auditoría).
3. **Aprobar o rechazar** (Operaciones o RR. HH.); el supervisor ve el estado; el cliente ve solo la cobertura.
4. «Nunca doblar» con la regla actual de la Pauta (normal pegado a un extra o dos extras seguidos); el umbral configurable queda para el PR 2.
5. Paridad MCP completa con `preview_` y `ESTADO.md`.
**Fuera de este PR:** estado de pago, boleta de externos, horas extra en la pauta diaria, enlace explícito al turno de origen y reportes (PR 2, con la propuesta ControlRoll, que sigue «no aprobada»).

## 4. Arquitectura
- Tabla nueva `pauta.turnos_extra` (una fila por turno extra; nunca una por persona y día de la serie). La excepción de reemplazo o refuerzo sigue siendo la fuente de la celda; el turno extra la **referencia** (`excepcion_id`) y suma monto, tipo y estado. Aprobado, rechazado o pendiente **no cambia la cobertura**: el turno se cubre al registrarse.
- Eventos por outbox: `pauta.turno_extra.registrado`, `.aprobado`, `.rechazado`. La notificación al supervisor y al guardia va por Comunicaciones (silencio por defecto, ADR-020).
- Montos como ajustes versionados del módulo (`pauta.turno_extra.monto_instalacion`, `monto_puesto`), CLP entero; la resolución (puesto → instalación) vive en `packages/domain`.

## 5. Archivos (estimado)
`packages/db/prisma/schema/pauta.prisma` y una migración; `packages/domain/src/pauta/turno-extra.ts` (resolución de monto, reglas); `packages/capabilities/src/pauta/turnos-extra-*.ts`; pantalla en la Pauta diaria (hoja del turno y lista «Por aprobar»); tests, e2e, paridad.

## 6. Modelo de datos y migraciones
`pauta.turnos_extra`: `id uuid(7)`, `tenant_id`, `puesto_id`, `fecha`, `persona_id`, `excepcion_id` (FK a la excepción), `tipo_trabajador` (`propio`/`externo`), `monto_clp` (entero ≥ 0), `monto_motivo` (obligatorio si se edita), `estado` (`por_aprobar`/`aprobado`/`rechazado`), `registrado_por`, `resuelto_por`, `resuelto_en`, `motivo_resolucion`, `created_at`, `updated_at`; único activo por excepción. RLS `tenant_isolation` con FORCE; `GRANT` a `opai_app`; aditiva. **La aplica el bot «OPAI 2.0» con respaldo (ADR-070); el PR lleva `migracion-pendiente`.**

## 7. Capacidades
| Capacidad | Permiso | Efecto |
|---|---|---|
| `pauta.turnos_extra.registrar` | `pauta:write` | escritura, `dryRun`, `idempotencyKey` |
| `pauta.turnos_extra.aprobar` / `.rechazar` | `pauta:aprobar_extra` (nuevo: owner, admin, gerente; no supervisor) | irreversible: pide aprobación humana a los agentes |
| `pauta.turnos_extra.listar` | `pauta:read` | lectura auditada por IDs |
| `pauta.turnos_extra.monto_fijar` | `pauta:write` (instalación o puesto) | escritura (ajuste) |
Un supervisor solo ve y registra en sus instalaciones (ADR-022); nadie aprueba lo que él mismo registró.

## 8. Interfaz y responsive
Sin diseño aprobado: **primero la especificación y el diseño en Claude Design (DS 2.0)**. Propuesta: botón «Registrar turno extra» en la hoja del turno, pestaña «Por aprobar» para Operaciones y badge «Turno extra» en la celda. Verificación a 375, 1024 y 1280 px; el cambio visual pasa por Carlos (A2.10).

## 9. Seguridad y tenant
Tenant de la sesión; persona con vínculo vigente en la instalación; el monto nunca lo ve el cliente ni el portal del guardia; el motivo de edición del monto es texto de negocio, no se copia a la bitácora general. El responsable de la key agente hereda los permisos.

## 10. Casos límite
Reemplazo ya aprobado y luego anulado: el turno extra pasa a `rechazado` con motivo. Cambio de instalación del guardia entre registro y aprobación: se valida al registrar, no al aprobar. Monto en cero (turno sin pago): permitido con motivo. Externo sin vínculo: fuera de alcance hasta definir el alta de externos (ver «Decide Carlos»).

## 11. Plan por bloques
1. Dominio (monto, reglas) con tests. 2. Esquema y migración. 3. Capacidades y permiso. 4. Pantalla. 5. Paridad, e2e y `ESTADO.md`.

## 12. Tests
Dominio (resolución de monto, doblar), capacidades (validación, permisos, auditoría, no auto-aprobación), `test:db` con dos empresas y RLS, e2e (registrar → por aprobar → aprobar), paridad MCP.

## 13. Validación
Gate completo, e2e a 375/1024/1280, subagente revisor, revisión final (A2.2) y OK visual de Carlos.

## 14. Criterios de aceptación
1. Un reemplazo o refuerzo registrado como turno extra lleva tipo, monto y estado. 2. Solo Operaciones o RR. HH. aprueban, y no lo propio. 3. Monto por puesto con respaldo en el de la instalación, editable con motivo y auditoría. 4. Nunca doblar. 5. El cliente no ve costos. 6. `tools/list` trae las herramientas y sus `preview_`.

## 15. Riesgos y rollback
Migración aditiva: se revierte con el revert del PR y la tabla sin uso. Riesgo: confundir «aprobado» con «pagado» (no hay estado de pago hasta el PR 2).

## 16. Decide Carlos
1. **Externos:** ¿se registran como persona sin vínculo (alta mínima) o solo con nombre y RUT en el turno? Afecta datos personales (Ley 21.719).
2. **Permiso de aprobación:** ¿owner, admin y gerente, o también un rol «Operaciones» propio?
3. **¿Puede el supervisor editar el monto de un turno** o solo registrarlo con el monto sugerido?
4. **Orden:** ¿aprobamos este brief y el diseño en Claude Design antes de construir?
