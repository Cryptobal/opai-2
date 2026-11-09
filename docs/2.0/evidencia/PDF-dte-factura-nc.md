# Evidencia: PDF descargable de factura y nota de crédito (CAR-221)

Todo es **ficticio**: los RUT, nombres y direcciones de los fixtures están inventados. No hay documentos, clientes ni datos de Gard.

## Qué significa «datos reales» en las pruebas anteriores

En el PR dije que probé el PDF «con datos reales». Quise decir **datos que salen del modelo y del circuito de emisión** (cuenta, líneas, referencias y configuración DTE de un tenant de QA sintético con el SII simulado), **no clientes reales**. Los PDF que bajé desde la pantalla vinieron de una **combinación local** de ramas que no está acreditada: no sirven como evidencia. Los artefactos de esta carpeta sí: se regeneran desde el SHA indicado.

## Artefactos

| Archivo | Fixture | Generador (SHA) | Contenido |
|---|---|---|---|
| `pdf-dte/factura-33-fixture.pdf` | `FIXTURE_FACTURA` (`packages/integrations/src/dte/pdf-fixtures.ts`) | `752d64992248e578de5f4a92260dd584f9363fe2` | Factura 33 N° 1234: 2 páginas (original y copia CEDIBLE), con referencia a una orden de compra, timbre PDF417 y resolución. |
| `pdf-dte/nota-credito-61-fixture.pdf` | `FIXTURE_NC` (mismo archivo) | `752d64992248e578de5f4a92260dd584f9363fe2` | Nota de crédito 61 N° 5678: 1 página, con referencia a la factura 1234 y código «Corrige montos». |

Reproducir: `pnpm --filter @opai/integrations pdf:fixtures`. Las fechas internas del PDF son las de emisión, así que el mismo código da los mismos bytes (lo verifica `pdf.test.ts`). Para verlos como imagen: `pdftoppm -r 80 -png <archivo>.pdf salida`.

El timbre de los fixtures es un texto de pruebas (no un TED firmado del SII). **Esto verifica la hoja impresa; no es una aceptación del SII.**

## De dónde sale cada campo en 2.0

| Campo impreso | Fuente en el modelo | Estado |
|---|---|---|
| Razón social del emisor | `core.perfil_empresa.razon_social` (si falta, el nombre del tenant) | Hecho |
| Giro, calle, comuna, teléfono del emisor | `core.perfil_empresa` (`giro`, `calle`, `comuna`, `telefono`) | Hecho: se imprime lo cargado y nada más |
| RUT del emisor, resolución (número y fecha) | `finanzas.dte_config` | Hecho |
| Receptor (razón social, giro, RUT, dirección, comuna, ciudad) | `core.cuentas` | Hecho |
| Referencias (tipo, folio, fecha, código, razón) | `finanzas.documentos_emitidos_referencias` | Hecho |
| Neto, exento, IVA, total | `finanzas.documentos_emitidos` | Hecho |
| Descripción y monto de cada línea | `finanzas.documentos_emitidos_lineas` (`glosa`, `monto`) | Hecho |

> Corrección: en el comentario del PR dije que el giro, la dirección y el teléfono del emisor «no se guardan todavía en 2.0». Era falso: están en `perfil_empresa`, y el PDF ahora los usa.

## Brechas reales (requieren un cambio de modelo revisado)

1. **Cantidad, unidad y precio unitario por línea.** `documentos_emitidos_lineas` guarda solo `glosa` y `monto`. La programación sí tiene cantidad y precio, pero se pierden al generar el borrador. Hoy el PDF deja esas columnas en blanco en lugar de inventarlas. Propuesta: migración **aditiva** con `cantidad numeric(14,4)`, `unidad text`, `precio_unitario bigint` y `descuento_pct int`, todas nulas, y que la generación y la emisión las llenen.
2. **Código de actividad económica (ACTECO), oficina del SII y ciudad del emisor.** No existen en `perfil_empresa` ni en `dte_config`. El ACTECO es un campo obligatorio del emisor en el DTE; hoy el XML y el PDF no lo traen. Propuesta: `acteco int` y `oficina_sii text` en `dte_config`, y la ciudad en `perfil_empresa`.
3. Forma de pago y observaciones del documento: no hay campos. Hoy solo se imprime la glosa.

Ninguna de las dos migraciones se hizo en este PR: las aplica el bot «OPAI 2.0» con respaldo (ADR-070) y esperan la decisión de Carlos sobre los campos obligatorios.

## Corte A4 (mandato del 8-nov-2026): hoja A4, detalle paginado, proforma y estado de pago

La hoja pasa de Carta a **A4** (595,28 × 841,89 pt). El detalle ya no se recorta ni pisa los totales: cada línea crece en alto según su texto (hasta 6 renglones), el detalle se reparte en páginas de continuación y los totales, el timbre y el acuse quedan en la última página. La copia CEDIBLE repite el documento completo. Las referencias crecen hasta 6 y el resto se resume. Se agregan los PDF previos, sin valor tributario y sin folio del SII:

| Archivo | Fixture | Contenido |
|---|---|---|
| `pdf-dte/factura-33-larga-fixture.pdf` | `FIXTURE_FACTURA_LARGA` | 45 líneas: 3 páginas del original y 3 de la copia CEDIBLE |
| `pdf-dte/proforma-fixture.pdf` | `FIXTURE_PROFORMA` | Proforma `PF-2026-12-000042`, UF estimada rotulada |
| `pdf-dte/estado-pago-fixture.pdf` | `FIXTURE_ESTADO_PAGO` | Estado de pago `EP-2026-12-000042`, con firmas y «aprobado en línea» |

Los PDF anteriores (`factura-33-fixture`, `nota-credito-61-fixture`) se regeneraron en A4. Número interno, versión y UF son datos del fixture: el cableado al correo de la programación va en otro corte. **No es una aceptación del SII.**

