# BRIEF CAR-320 · La proforma y el estado de pago salen con su PDF

## 1 Objetivo
Condición 2 de ADR-099 (Carlos, 11-nov-2026): la programación de facturas y el envío de proforma deben funcionar bien antes de pasar la facturación de Gard a producción. CAR-320 punto 3 exige que el correo de proforma y el de estado de pago lleguen **con el PDF adjunto**.

## 2 Estado actual (verificado en `main` `f3c6240`)
- `generarPdfPrevio` (CAR-221, `packages/integrations/src/dte/pdf-previo.ts`) arma el PDF A4 de la proforma y del estado de pago, pero **nadie lo usa**: `enviarPrevios` manda el correo sin adjunto.
- El número interno (`PF-…`, `EP-…`) solo existía en los fixtures (ESTADO, fila CAR-221 «PDF A4»: pendiente).

## 3 Alcance
- Entra: el PDF adjunto en ambos correos, el número interno estable por período y el receptor compartido con el PDF del DTE.
- No entra: UF de valorización en el PDF (la corrida guarda la UF, pero falta decidir cuándo rotularla «estimada»), firmas del estado de pago, varios PARA (1.0 admite 10 TO + 10 CC; brecha 7 de CAR-320, decisión de Carlos).

## 4 Arquitectura
`finanzas/ventas-pdf-previo.ts`:
- `numeroInterno(ctx, tipo, documentoId)` devuelve `PF|EP-<período>-<correlativo>`. El correlativo es la posición de la corrida dentro del período en la empresa (`createdAt`, `id`). Las corridas no se borran, así que el número es estable al reintentar.
- `pdfDePrevio` arma el `PdfPrevioInput` desde el borrador: líneas, montos, vencimiento y referencias (OC/HES…). El emisor sale del perfil de la empresa (ADR-028) y el receptor de `receptorPdf`, extraído de `ventas-pdf-doc.ts`.

`enviarPrevios` adjunta el PDF. Si no se puede armar, el envío queda `fallido` («No se pudo armar el PDF del documento.») y el trabajo diario lo reintenta, igual que un correo caído.

## 5 Archivos
`packages/capabilities/src/finanzas/ventas-pdf-previo.ts` (nuevo), `ventas-pdf-doc.ts`, `ventas-programacion-previos.ts`, `packages/capabilities/test/finanzas-programacion-circuito-db.test.ts`.

## 6 Modelo de datos
Sin migración.

## 7 Capacidades
Sin capacidades nuevas: cambia lo que hacen `finanzas.ventas_programacion.generar` y el trabajo diario de previos.

## 8 Interfaz
Sin pantallas. El cliente recibe «Proforma PF-2026-12-0001.pdf» o «Estado de pago EP-2026-12-0001.pdf».

## 9 Seguridad y tenant
Todo se lee por `ctx.db` del tenant. El número cuenta solo las corridas de la empresa (RLS). El PDF no lleva datos que el borrador no tenga.

## 10 Casos límite
- Borrador sin corrida: número `PF-<últimos 8 del id>`.
- Fallo al armar el PDF: el envío queda `fallido` y se reintenta.
- Mismo período generado dos veces: no reenvía (sin cambio).

## 12 Tests
`finanzas-programacion-circuito-db.test.ts` (Postgres real y correo simulado capturado): ambos correos traen un PDF válido (`%PDF-`) llamado `Proforma PF-aaaa-mm-nnnn.pdf` / `Estado de pago EP-…` con el mismo correlativo.

## 13 Validación
PDF de muestra generado por la prueba y revisado como imagen: número, período, receptor, detalle y totales correctos, y «Sin valor tributario».

## 14 Criterios de aceptación
Correo de proforma y de estado de pago con PDF adjunto; número estable; ningún folio del SII usado.

## 15 Riesgos y rollback
Si el PDF falla para un cliente, sus previos quedan fallidos y visibles en el historial del borrador (antes salían sin PDF). Rollback: revertir el PR.
