# BRIEF-33 · Finanzas: cierre de mes de facturación y emisión en lote (CAR-167 · F5)

## 1 Objetivo
Que quien factura vea, en una pantalla, todos los borradores que generaron las plantillas del mes, sepa en qué etapa está cada uno (falta OC/HES, observado, por enviar, esperando OK, listo, emitido) y emita los que ya tienen el OK del cliente **con una sola aprobación**.

## 2 Estado actual (verificado en `main` `4327a21`)
- Las programaciones generan borradores idempotentes por período (`ventas_programaciones_corridas`, #243). Nunca emiten.
- `finanzas.ventas.emitir` emite de a uno (irreversible, `dryRun`, aprobación para agentes).
- No existe nada de OC/HES, proforma ni OK del cliente. El diseño «Programación y cierre» (v3, pestaña «Tablero del mes») lo muestra por etapas.

## 3 Alcance
**Entra:** tablero del mes por etapa; seguimiento manual (OC/HES, proforma enviada o recordada, OK, observación, reabrir); emisión en lote de los «listos».
**No entra (pendiente, ver ESTADO):** enlace público de aprobación del cliente (`/cobro/[token]`, el cliente aprueba u observa solo), envío automático de la proforma por correo y recordatorios automáticos. Hoy una persona registra lo que el cliente respondió.

## 4 Arquitectura
Dominio puro `packages/domain/src/finanzas/cierre.ts` (etapa y transiciones). Una tabla de seguimiento por borrador. Tres capacidades en `packages/capabilities/src/finanzas/cierre-*.ts`. La emisión reutiliza `emitirBorrador` (extraída de `finanzas.ventas.emitir`, sin cambiar su comportamiento).

## 5 Archivos
Dominio: `cierre.ts` y su test. Capacidades: `cierre-esquemas`, `cierre-tablero`, `cierre-actualizar`, `cierre-emitir-lote`; `ventas-emision.ts` exporta `emitirBorrador`. UI: `/finanzas/ventas/programacion/cierre` (`pantalla-cierre`, `fila-cierre`, `dialogos-cierre`, `datos`, `tipos`) y pestañas «Plantillas | Tablero del mes» en la lista de plantillas.

## 6 Modelo de datos y migración (aditiva)
`finanzas.ventas_cierre_seguimientos` (una fila por documento): `estado` (pendiente | enviada | observada | ok), `requiere_oc_hes`, `orden_compra`, `hes`, `observacion`, marcas de tiempo, `actualizado_por_id`. RLS FORCE con `tenant_isolation`, `documento_id` único y trigger `mismo_tenant`. Migración `20261105163000_finanzas_cierre_seguimiento`. Etiqueta `migracion-pendiente`.

## 7 Capacidades (74 → 77)
- `finanzas.cierre.tablero` (lectura, `finanzas:read`, lectura auditada por cuenta).
- `finanzas.cierre.actualizar` (escritura, `dryRun`, `finanzas:ventas.manage`).
- `finanzas.cierre.emitir_lote` (irreversible, `dryRun`, **aprobación humana** para agentes, máx. 50 documentos).

## 8 Interfaz y responsive
Pestañas por ruta. Mes con flechas. Secciones por etapa con cantidad y total; cada fila muestra cliente, plantilla, detalle de la etapa y solo las acciones que corresponden. «Emitir N listos» abre una confirmación con el total y lo que se omitirá. 375: una columna de filas apiladas, botones de 44 px; 1280: mismo orden, más ancho.

## 9 Seguridad y tenant
Todo por `ctx.db` (RLS). El tenant sale de la sesión. Solo borradores; un documento emitido ya no admite seguimiento. Permiso de escritura `finanzas:ventas.manage` (owner y admin, igual que el diseño).

## 10 Casos límite
Documento inexistente o de otra empresa → «no existe». Lote con elementos no listos → se omiten con motivo. Repetir el lote → los ya emitidos se omiten (no duplica). Una emisión que falla → **no se emite ninguna** (una sola transacción). OK sin la OC/HES exigida → vuelve a «falta OC/HES». Observación vacía → rechazada.

## 11 Plan por bloques
1 dominio y test · 2 migración y modelo · 3 capacidades y test con Postgres · 4 pantalla · 5 inventario MCP, ADR y ESTADO.

## 12 Tests
`cierre.test.ts` (11), `finanzas-cierre-db.test.ts` (recorrido completo, lote con omitidos, idempotencia, aislamiento entre empresas), paridad e inventario.

## 13 Validación
`pnpm typecheck && pnpm lint && pnpm test`, `pnpm test:db` del cierre, `pnpm build` y `pnpm presupuesto`.

## 14 Criterios de aceptación
El tablero agrupa por etapa y suma por etapa; el lote emite solo lo que tiene OK, con una confirmación; reintentar no duplica folios; un agente recibe `APPROVAL_REQUIRED`; otra empresa no ve nada.

## 15 Riesgos y rollback
Riesgo: el lote es todo o nada, así que un CAF con pocos folios hace fallar el lote entero (el mensaje lo dice). Rollback: `DROP TABLE finanzas.ventas_cierre_seguimientos` (solo guarda seguimiento) y revertir el PR.

## 16 Reporte de ejecución
Ver el PR y `ESTADO.md`.
