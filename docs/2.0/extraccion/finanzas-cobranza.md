# Extracción 1.0 · Finanzas: cobranza (CAR-166 · F4)

Fuente (solo lectura, `Cryptobal/opai`): `src/modules/finance/billing/cobro-reminders.service.ts`, `dte-overdue.service.ts`, `cobro-notify.ts` y sus pruebas. Reglas verificadas en el código; lo que 1.0 no hace se marca como brecha.

## 1. Vencimiento (`dte-overdue.service.ts`)

- R-COB-01. Una factura emitida sin pagos pasa a `OVERDUE` cuando su `dueDate` quedó atrás. Antes del cron diario solo se marcaba al conciliar; una factura que nadie tocaba nunca vencía.
- R-COB-02. Corte de día en `America/Santiago`. `dueDate` = hoy **no** está vencida: vence al terminar el día de pago (vencida desde mañana). Se compara el día calendario como texto `YYYY-MM-DD`, no el `Date`.
- R-COB-03. Cobrables: estados SII `PENDING`, `SENT`, `ACCEPTED`, `WITH_OBJECTIONS`. Fuera: `DRAFT`, `REJECTED`, `ANNULLED`.
- R-COB-04. Fuera de cobranza: notas de crédito (tipo 61), documentos anulados por NC total (`voidedByCreditNoteId`) y recibidos (deuda nuestra). Solo `direction = ISSUED`.
- R-COB-05. `PARTIAL` no pasa a `OVERDUE` en 1.0 (el enum no permite «parcial y vencida»). **Brecha**: una factura con abono y vencida desaparece de la cobranza.
- R-COB-06. Sin `dueDate` no se degrada un `OVERDUE` previo.

## 2. Recordatorios (`cobro-reminders.service.ts`)

- R-COB-10. Lo que recuerda 1.0 es la **confirmación de la proforma o estado de pago** (aprobación del cliente antes de emitir), no el cobro de una factura vencida. La cobranza de facturas vencidas no tiene motor de recordatorios en 1.0.
- R-COB-11. Escalones en días hábiles desde el envío original: +3, +7 y +12; tope de 3 recordatorios (`REMINDER_STEPS_BIZ_DAYS`).
- R-COB-12. Se detiene ante: ya emitido (folio > 0), tope alcanzado, sin token, token expirado, OC (referencia 801) ya ingresada, nada pendiente (aprobada u observada).
- R-COB-13. Día hábil = lunes a viernes (`differenceInBusinessDays`). **Brecha declarada en el propio código:** no considera feriados chilenos.
- R-COB-14. Cron diario global; cada envío se acota al tenant del documento; el contador y la fecha del último recordatorio se escriben solo si el envío tuvo éxito. Un fallo de un documento no corta el resto.
- R-COB-15. Evaluador puro (`evaluateCobroReminder`) testeable sin base de datos.

## 3. Qué hereda 2.0 y qué cambia

| Tema | 1.0 | 2.0 |
|---|---|---|
| Vencida | Estado materializado por cron | Se **deriva** (fecha, saldo, estado); sin columna ni cron que marque |
| Abono parcial vencido | Se pierde | Entra a cobranza por el saldo |
| Feriados | No | Calendario del núcleo (`core.calendario`) |
| Recordatorio de cobro | No existe | Secuencia configurable por empresa, pausa al conciliar el pago |
| Envío | Servicio propio | Comunicaciones (ADR-020), silencio por defecto |
| Confirmación proforma | Recordatorios +3/+7/+12 | Fuera de F4 (seguimiento EP/proforma: F5) |
| Aging | No | Tramos por cliente |
