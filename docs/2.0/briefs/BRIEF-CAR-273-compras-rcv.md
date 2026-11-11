# BRIEF CAR-273 · Compras desde el RCV del SII con SimpleAPI

**Fecha:** 11-nov-2026 · **Sesión:** proyecto «OPAI 2.0» (Claude) · **Tarea:** CAR-273 (encontrada al verificar CAR-272)

## 1. Objetivo

Que las facturas y notas que el SII registra como recibidas por la empresa lleguen solas al libro de compras, como en OPAI 1, sin cargar archivos.

## 2. Estado actual (verificado el 11-nov-2026)

- En test.opai.cl, Finanzas › Compras de Gard está vacío. Las compras solo entran a mano o con `finanzas.compras.importar` (planilla del RCV).
- OPAI 1 tiene el cron diario `finance-rcv-sync`: `POST https://servicios.simpleapi.cl/api/rcv/compras/{mes}/{anio}`, Basic `api:key`, multipart `input` (JSON con `RutCertificado`, `Password`, `RutUsuario`, `PasswordSII`, `RutEmpresa`, `Ambiente`, `Detallado`) y `certificado` (.pfx). Respuesta `compras.detalleCompras[]`.
- El plan de SimpleAPI de Gard tiene RCV contratado (30 consultas al mes, panel del 11-nov-2026).

## 3. Alcance

Entra: adaptador RCV, capacidad con vista previa (pantalla futura, API y MCP), trabajo diario. No entra: botón en la pantalla de Compras (cambio visual, va en otro PR con el OK de Carlos), RCV de ventas, aceptación o reclamo de documentos.

## 4. Arquitectura

- `packages/integrations/src/sii/simpleapi-rcv.ts`: `consultarRcvCompras(creds, mes, anio)` normaliza filas en camelCase o PascalCase y descarta las incompletas. Siempre `Ambiente: 1`: el RCV es del SII de producción y la consulta es de solo lectura (ADR-089).
- `packages/capabilities/src/finanzas/compras-importar-nucleo.ts`: el núcleo de la importación sale de `finanzas.compras.importar` para que lo use también el RCV. Mismo dedupe (proveedor + tipo + folio); `origen = "sii_rcv"`.
- `packages/capabilities/src/finanzas/compras-rcv.ts`: `finanzas.compras.sincronizar_rcv` (mes y año opcionales, por defecto los de hoy en Chile) y `finanzas.compras.sincronizar_rcv` como trabajo diario.

## 5. Archivos

Nuevos: `simpleapi-rcv.ts` (+ test), `compras-importar-nucleo.ts`, `compras-importar-esquemas.ts`, `compras-rcv.ts`, `finanzas-compras-rcv-db.test.ts`, `finanzas-compras-rcv-mes.test.ts`. Cambian: `compras-importar.ts`, `adaptador-sii.ts` (exporta `credencialesSimpleApi`), índices, instantánea MCP e inventario de paridad.

## 6. Modelo de datos y migraciones

Sin migración: `documentos_recibidos.origen` es texto libre; se agrega el valor `sii_rcv`.

## 7. Capacidades

`finanzas.compras.sincronizar_rcv` (escritura, `dryRun`, permiso `finanzas:compras.manage`): herramientas MCP `finanzas_compras_sincronizar_rcv` y `preview_finanzas_compras_sincronizar_rcv`.

## 8. Interfaz

Sin cambios de pantalla en este PR.

## 9. Seguridad y tenant

- Credenciales del almacén cifrado del tenant (`credencialesSimpleApi`), nunca de `process.env`. La key y la clave del certificado no salen en errores ni logs.
- El trabajo corre como sistema: crea proveedores sin rol, porque no hay usuario; una persona o un agente necesita `finanzas:proveedores.manage`.
- Cada consulta se mide en `core.consumos` (`sii.rcv`), aunque falle.

## 10. Casos límite

Tipos fuera del libro (33, 34, 56, 61) se omiten y se cuentan; filas incompletas se descartan; RUT inválido queda como fila con error; mes vacío no escribe nada; sin Emisión DTE configurada la capacidad avisa y el trabajo no hace nada.

## 11. Plan por bloques

Un commit: adaptador, núcleo, capacidad, trabajo, pruebas y docs.

## 12. Tests

Adaptador con `fetch` simulado (forma de la petición, ambas formas de nombre, errores sin secretos); capacidad y trabajo contra Postgres real (vista previa, idempotencia, alta de proveedor, trabajo como sistema); mes en hora de Chile.

## 13. Validación

Tras integrar, ejecutar `finanzas.compras.sincronizar_rcv` en test.opai.cl para Gard y anotar en CAR-272 cuántos documentos llegaron.

## 14. Criterios de aceptación

Las compras reales del mes aparecen sin cargar archivos y una segunda sincronización no duplica.

## 15. Riesgos y rollback

- **Cupo:** 30 consultas al mes. El trabajo hace una al día; si OPAI 1 sigue con su cron, el cupo se comparte. Ver ADR-089.
- **Datos reales en test.opai.cl:** compras reales de Gard en el ambiente de prueba (Carlos ya decidió lo mismo para el banco el 11-nov).
- Rollback: quitar el trabajo de `trabajosFinanzas`; los documentos traídos se pueden dejar (no duplican).

## 16. Reporte de ejecución

Ver el PR.
