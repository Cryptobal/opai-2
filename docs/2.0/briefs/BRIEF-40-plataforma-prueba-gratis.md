# BRIEF-40 · Plataforma: prueba gratis por empresa (CAR-222)

**Plataforma · Code · 6-nov-2026 · rama `brief/car-222-plataforma-prueba-gratis` · ADR-071 (adenda, punto 6) · continúa BRIEF-36 (CAR-204)**

Dos PRs, uno a la vez: **PR 1 · respaldo** (este) y **PR 2 · pantallas** (después de integrar el 1).

## 1. Objetivo
Que cada empresa active **una sola vez**, desde su ERP, la prueba gratis de un módulo o de una parte de Finanzas; que dure **10 días** y se **desactive sola**; y que Plataforma pueda **extenderla o reactivarla**. Sin inventar cobros.

## 2. Decisión de Carlos (6-nov-2026) y lo que decide esta sesión
Carlos: la activa cada empresa una vez desde su ERP, dura 10 días, se desactiva sola, Plataforma extiende o reactiva; el detalle lo decide OPAI de forma conservadora y reversible. Decisiones de esta sesión, todas reversibles:
- «Se desactiva» = el módulo queda en **solo lectura** (se ve y se lee, nada se borra), igual que una prueba de Plataforma que no pasa a cobro.
- Los 10 días cuentan el primero: empieza hoy, el último día es hoy + 9, y al día 11 queda en solo lectura.
- Reactivar o extender: `dias` (10 por defecto, hasta 60) desde el último día si sigue vigente, o **desde hoy** si ya terminó (no se regalan los días que pasaron).
- Solo se prueba lo que la empresa **no tiene contratado**: un módulo activo, en prueba, en solo lectura o suspendido no se puede probar desde el ERP (solo lectura o suspendido lo decide OPAI).
- Una parte de Finanzas se prueba aunque Finanzas no esté contratado (decisión de Carlos); si no lo está, el módulo `finanzas` pasa a «en prueba». **Hasta que la Sesión 5 filtre por partes, eso da acceso a todo Finanzas durante la prueba**: es el riesgo aceptado y está acotado a 10 días. Con Finanzas activo, las partes ya vienen incluidas.
- Las partes respetan las dependencias (Flujo necesita Bancos…), contando las partes ya probadas o con precio en la empresa.

## 3. Datos y migración
`core.pruebas_gratis` (empresa, módulo o parte, inicio, hasta, extensiones, activada_por, cerrada_en). **Único por (empresa, módulo): esa unicidad es la regla «una sola vez».** RLS `tenant_isolation` con ENABLE + FORCE, grants a `opai_app`, `CHECK (hasta >= inicio)`, `SET LOCAL lock_timeout`, reversión documentada. Migración `20261111090000_core_pruebas_gratis`, aditiva. **No es una condición de cobro:** no guarda precio, no crea `cobro_condiciones` ni cargos.

## 4. Dominio (`packages/domain/src/cobros/prueba-gratis.ts`)
`DIAS_PRUEBA_GRATIS`, `finDePruebaGratis`, `estadoPruebaGratis`, `extenderPruebaGratis` y `motivoSinPrueba`, con pruebas. Reutiliza `sumarDias` del calendario.

## 5. Capacidades
- `core.modules.probar` (tenant, `core:tenant.manage`, escritura, `dryRun`, `idempotencyKey`): crea la prueba, pone el módulo en prueba (siembra su catálogo) y emite `core.prueba_gratis.activada`. Un doble clic o dos pestañas dan «ya se activó» (la unicidad), no un error interno.
- `platform.cobros.prueba_gratis_extender` (`platform:tenants.manage`, **irreversible** para agentes, `dryRun`, auditoría global con antes y después): exige que la empresa ya la haya activado; rechaza un módulo suspendido o activo.
- Trabajo diario `core.pruebas_gratis.cerrar`: cierra las vencidas y deja el módulo en solo lectura, salvo que Plataforma ya le haya puesto precio o que otra parte de Finanzas siga en prueba. Idempotente.

## 6. Pantallas (PR 2)
ERP → Módulos: botón «Probar 10 días», estado «Prueba hasta …» y precio de lista de cada parte de Finanzas (lectura de las empresas del precio de lista). Plataforma → pestaña Cobro: ver la prueba gratis, «Extender 10 días» y «Reactivar». Sin diseño aprobado: patrón existente.

## 7. Seguridad y tenant
RLS real en la tabla; el tenant sale de la sesión; las operaciones de Plataforma filtran por `tenantId`; toda escritura de plataforma queda en la auditoría global. Toca permisos y trae migración: pide **revisión final «sin bloqueos»** y que el bot aplique la migración con respaldo (`migracion-pendiente`).

## 8. Pruebas
Dominio; capacidades en memoria (activar, vista previa, una sola vez, plan base, dependencias, permisos, extender, reactivar, vencer, no cerrar lo que ya se cobra); con Postgres real y dos empresas (cada una activa la suya, con `app.tenant_id` de B no se ve la de A, extender la de A no toca la de B, el trabajo cierra solo la de su empresa, sin precios ni cargos).

## 9. Riesgos y rollback
Migración aditiva (`DROP TABLE`). Riesgo principal: la prueba de una parte sin Finanzas contratado abre todo el módulo hasta que la Sesión 5 filtre por partes. Mitigación: 10 días, una vez, auditado, y se cierra sola.

## 10. Pendiente de decisión de Carlos
¿Una prueba terminada debe poder pedirse de nuevo a OPAI desde el ERP (hoy solo «extiende OPAI»)?

## 11. Reporte de ejecución
Ver el PR.
