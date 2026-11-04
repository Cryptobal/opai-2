# BRIEF-29 · Finanzas: cobranza y «Hoy en Finanzas» (CAR-166 · F4)

Rama `brief/car-166-finanzas-cobranza`. Depende de F2 (envío al cliente) y F3 (programaciones), ya en `main` (#243). Extracción: `docs/2.0/extraccion/finanzas-cobranza.md`. Diseño aprobado: `docs/2.0/diseño/export-finanzas-ventas-banca-v3/` (pantallas 1 «Hoy en Finanzas» y 5 «Cobranza»).

## 1. Objetivo
Que el equipo de Finanzas sepa cada mañana qué emitir, qué cobrar y qué conciliar, y que el cobro de facturas vencidas tenga seguimiento: vencimiento por plazo de pago, aging por cliente, secuencia de recordatorios configurable con feriados chilenos que se detiene sola al conciliar el pago, y envío por Comunicaciones. Necesario para el corte de Gard (auditoría §2.1 y §6).

## 2. Estado actual (verificado en `main` `dd9238c`)
- `finanzas.documentos_emitidos` ya tiene `fecha_vencimiento`, `monto_total`, `monto_cobrado`, `estado_dte`, `estado_cobro` (`pendiente|pagada_parcial|pagada|cedida`) y `cesion_estado`. `cobros.ts` es el único escritor de `estado_cobro`.
- `plazoPagoDias` existe en proveedores y en la programación; no hay plazo de cobro por cliente ni por empresa.
- Envío al cliente: `ventas-enviar-cliente.ts` (PDF + XML, contactos con rol `facturacion`, evento comunicable `finanzas.venta.enviada_cliente`).
- Calendario del núcleo: `core.calendario` (feriados por empresa) con lectura en `packages/capabilities/src/core/calendario`.
- No hay `page.tsx` en `/finanzas`; no hay cobranza, aging ni recordatorios.

## 3. Alcance
Dentro:
1. Vencimiento derivado y aging por cliente (tramos 1-30, 31-60, 61+ días vencidos y «por vencer»).
2. Secuencia de recordatorios: pasos en días hábiles tras el vencimiento (por defecto +3, +7, +12; tope 3), configurable por empresa, con feriados del calendario del núcleo.
3. Pausa automática al quedar la factura pagada (conciliación) y pausa manual por documento.
4. Envío por Comunicaciones (correo con PDF), manual desde la ficha del deudor y automático solo si la empresa lo activa.
5. Registro de gestiones (línea de tiempo del deudor).
6. Pantallas `/finanzas/cobranza` (tramos y ficha de deudor, con sheet «Enviar recordatorio») y portada `/finanzas` «Hoy en Finanzas».
Fuera: WhatsApp automático (queda el enlace manual `wa.me`, variante B del diseño, a confirmar por Carlos), seguimiento de proforma/estado de pago (F5), cesión y factoring.

## 4. Arquitectura
- Dominio puro en `packages/domain/src/finanzas/cobranza/`: `estaVencida`, `diasVencido`, `tramo`, `saldo`, `diasHabilesDespues(fecha, n, feriados)`, `evaluarRecordatorio` (puro, determinista, a la manera de `evaluateCobroReminder` de 1.0). Fechas como `YYYY-MM-DD` en zona del tenant; sin `Date` de reloj dentro.
- Vencida **derivada**, sin columna ni cron que la marque: `estado_dte ∈ {enviado, aceptado}`, tipo 33/34, `cesion_estado ≠ cedido`, saldo > 0 y `fecha_vencimiento` < hoy (el día del vencimiento no está vencida, R-COB-02). El abono parcial no saca la factura de cobranza (corrige R-COB-05).
- Fecha de vencimiento ausente: `fecha_emision + ajuste cobranza.plazoPagoDiasDefecto` (30).
- Capacidades en `packages/capabilities/src/finanzas/cobranza-*.ts` y registro en `modules/finanzas`.
- Trabajo diario `finanzas.cobranza.recordatorios` (`defineTrabajo`, diaria): por empresa, evalúa y envía solo si `cobranza.recordatoriosAutomaticos` está activo (silencio por defecto, ADR-020); si no, no hace nada.
- Evento comunicable nuevo `finanzas.cobranza.recordatorio` (plantilla por defecto, variables cliente, folio, monto, vencimiento, días vencido).

## 5. Archivos
- `packages/domain/src/finanzas/cobranza/*.ts` + tests.
- `packages/capabilities/src/finanzas/cobranza-{resumen,deudor,recordar,pausar,trabajo,datos}.ts`, `hoy-resumen.ts`.
- `packages/capabilities/src/finanzas/ajustes.ts` (ajustes de cobranza), `packages/domain/src/comunicaciones/finanzas.ts` (evento).
- `packages/db/prisma/schema/finanzas.prisma` + migración `20261105120000_finanzas_cobranza`.
- `apps/web/app/(erp)/finanzas/page.tsx` y `cobranza/` (`page.tsx`, `[cuentaId]/page.tsx`, `_componentes/`).
- `apps/web/lib/registro.ts`, `docs/2.0/paridad/mcp-inventario.md`, snapshot `herramientas-mcp.txt`, `docs/2.0/ESTADO.md`, ADR en `01-decisiones.md`.

## 6. Modelo de datos y migraciones (aditivas)
- Tabla `finanzas.cobranza_gestiones`: `id uuid(7)`, `tenant_id`, `documento_id` (FK RESTRICT), `cuenta_id`, `canal` (`correo|whatsapp_manual|nota`), `origen` (`manual|automatico`), `paso` int nulo, `resultado` (`enviado|fallido|omitido`), `detalle` texto corto, `creado_por` nulo, `created_at`, `updated_at`. RLS ENABLE + FORCE, `tenant_isolation` para `opai_app`, trigger `mismo_tenant` por `documento_id` y `cuenta_id`, índice `(tenant_id, documento_id, created_at)`, UNIQUE `(documento_id, paso)` parcial para `origen = 'automatico'` y `resultado = 'enviado'` (idempotencia de la secuencia).
- Columna `documentos_emitidos.cobranza_pausada boolean not null default false` (pausa manual).
- `SET LOCAL lock_timeout`, prefijo `20261105120000`, entrada en `packages/db/test/dos-empresas/ajustes.ts`. **No se aplica**; etiqueta `migracion-pendiente` al abrir el PR.

## 7. Capacidades (todas con MCP)
Lecturas (`finanzas:read`, como el resto de Ventas): `finanzas.cobranza.resumen` (tramos y deudores), `finanzas.cobranza.deudor` (ficha: facturas, contactos, gestiones), `finanzas.hoy.resumen` (qué emitir, cobrar y conciliar, con conteos por grupo).
Escrituras (`finanzas:ventas.manage`, `dryRun`, `idempotencyKey`, auditadas, evento de dominio por outbox): `finanzas.cobranza.recordar` (irreversible: pide aprobación a agentes), `finanzas.cobranza.pausar` (con `pausada: true | false`, pausa y reanuda), `finanzas.cobranza.registrar_gestion` (nota manual). Ajustes por `core.config.set`.

## 8. Interfaz y responsive
Solo `@opai/ds`; patrones `ListScreen`/`DetailScreen` con los cuatro estados (cargando, vacío, error, sin permiso: supervisor, gerente y viewer ven Forbidden). 375, 1024 y 1280 px, claro y oscuro. Presupuesto de JS por ruta; sheets cargados bajo demanda. «Hoy en Finanzas»: bandeja única con grupos y contador, cada fila con su acción directa.

## 9. Seguridad y tenant
Tenant de la sesión; `forTenant`/`ctx.transaccion`, solo `tx` dentro de transacciones. Referencias validadas del mismo tenant. El envío usa los contactos de la cuenta; ningún texto de terceros habilita escrituras. Sin datos personales en logs ni en la auditoría (solo IDs).

## 10. Casos límite
Vencimiento hoy (no vencida); fecha de vencimiento en feriado o fin de semana (los pasos se cuentan en hábiles); factura pagada entre dos pasos (se omite y se registra); abono parcial (sigue en cobranza por el saldo); cedida, NC total o rechazada (fuera); cliente sin contacto con rol `facturacion` (resultado `omitido` con aviso, no falla el lote); doble ejecución del trabajo (UNIQUE por paso); fallo de un envío no corta el resto.

## 11. Plan por bloques (un commit por bloque)
1. Extracción y brief (este documento).
2. Dominio puro y tests.
3. Migración y modelo.
4. Capacidades de lectura (resumen, deudor, hoy).
5. Capacidades de escritura, evento comunicable y trabajo diario.
6. Pantalla Cobranza (tramos, ficha, sheet).
7. Portada «Hoy en Finanzas».
8. Paridad MCP, ajustes, ESTADO y ADR.

## 12. Tests
Dominio (vencimiento, tramos, días hábiles con feriados, evaluador); capacidades con contexto falso (validación, permisos, auditoría, dryRun, idempotencia); `test:db` (aislamiento con `tenantB`, UNIQUE de paso, pausa al pagar); e2e de cobranza a 375 y 1024 con la etiqueta `e2e`.

## 13. Validación
`pnpm typecheck && pnpm lint && pnpm test && pnpm test:db`, `pnpm build` y `pnpm presupuesto`; capturas a 375 y 1280; paridad MCP regenerada.

## 14. Criterios de aceptación
- Una factura emitida sin pagar aparece en su tramo desde el día siguiente al vencimiento, con y sin abonos.
- Con la secuencia activa, el recordatorio sale en el día hábil correcto contando feriados y no sale tras el pago.
- Cada recordatorio queda en la línea de tiempo del deudor y no se duplica ante reintentos.
- «Hoy en Finanzas» lista emitir, cobrar y conciliar con acción directa.
- Toda acción de pantalla tiene herramienta MCP; gate de paridad en verde.

## 15. Riesgos y rollback
Riesgo: enviar correos de cobranza por error. Mitigación: automático apagado por defecto, `dryRun`, aprobación a agentes y vista previa. Rollback: la migración es aditiva (se revierte con DROP de la tabla y la columna); apagar `cobranza.recordatoriosAutomaticos`.

## 16. Reporte de ejecución
Ver la descripción del PR. Cambios respecto del plan: pausar y reanudar son una sola capacidad (`pausada`); el menú suma «Hoy en Finanzas» y «Cobranza».

## Decisiones propuestas a Carlos
1. Pasos por defecto +3, +7 y +12 días hábiles **después del vencimiento** (en 1.0 son después del envío de la proforma).
2. Tramos 1-30, 31-60 y 61+ días vencidos (el diseño dice «0-30 / 31-60 / 60+», que se solapa en 60).
3. WhatsApp: solo enlace manual `wa.me` en esta etapa.
