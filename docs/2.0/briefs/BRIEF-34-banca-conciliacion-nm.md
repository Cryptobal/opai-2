# BRIEF-34 · Banca: conciliación N:M, cobro manual en la ficha (CAR-169 · F7a)

## 1 Objetivo
Un abono de banco casi nunca paga una sola factura. El contador debe poder conciliar un movimiento con varias facturas, ver folio y cliente (no ids) y registrar un cobro manual desde la ficha de la venta.

## 2 Estado actual (verificado)
`finanzas.conciliaciones.confirmar` ya acepta 1–10 enlaces y exige suma == monto del movimiento. La pantalla solo confirmaba un documento por vez, mostraba prefijos de UUID y pedía pegar un UUID para "otro documento". `finanzas.cobros.manual` existía sin pantalla.

## 3 Alcance
- Hoja «Reconocer movimiento»: agregar varias sugerencias, buscar otra factura por folio, repartir el abono (manual o «Prorratear») y confirmar solo si el reparto cuadra.
- Ficha de venta: botón «Registrar cobro» (hoja con cuenta, monto y nota).
- Fuera: editor de reglas bancarias (las reglas se guardan pero no se evalúan; falta decisión de negocio, se consulta a Carlos).

## 4 Arquitectura
Dominio puro `prorratearAbono` / `diferenciaAsignada` (`packages/domain/src/finanzas/prorrateo.ts`): reparto proporcional al pendiente, tope por documento, resto determinista por orden, sobrante informado. UI solo invoca capacidades existentes.

## 7 Capacidades
Sin capacidades nuevas. `finanzas.conciliaciones.sugerir` suma `folio`, `tipoDte`, `contraparte` a su salida (aditivo).

## 8 Interfaz
Celular: la hoja es un panel a pantalla completa; cada sugerencia es una tarjeta con «Agregar/Quitar»; el reparto muestra un campo por factura y un aviso verde «cuadra» o ámbar «faltan $X». Escritorio: igual, en panel lateral.

## 9 Seguridad y tenant
Sin cambios de permisos; el servidor revalida suma, tenant y pendiente. dryRun previo a cada confirmación.

## 10 Casos límite
Abono menor que lo pendiente (queda parcial), mayor (sobrante, no cuadra → no confirma), factura ya elegida, folio inexistente o pagada.

## 11 Plan
1 dominio + tests · 2 sugerir con folio/cliente · 3 hoja N:M · 4 cobro manual · 5 docs.

## 12 Tests
`prorrateo.test.ts` (5). Los tests db de conciliación existentes cubren el servidor.

## 13 Validación
typecheck, lint, test, build + presupuesto.

## 14 Criterios
Conciliar un abono con 2+ facturas desde la UI; ver folio/cliente; registrar cobro desde la ficha.

## 15 Riesgos y rollback
Sin migración; revertir el PR.

## 16 Reporte de ejecución
Ver PR.
