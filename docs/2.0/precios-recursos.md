# Precios de recursos (lista de plataforma)

Fuente en código: `PRECIOS_RECURSOS_BASE` en `packages/domain/src/catalogos.ts`, sembrada en `core.precios_recursos` por `seed:dev-tenant` (ADR-031). Montos en **micro-USD por unidad** (1 USD = 1.000.000). El medidor (`ctx.medidor`) costea cada consumo con el precio vigente; las integraciones propias del tenant (BYOK) se miden con costo 0 (`sinCosto`).

Son valores **referenciales al 23-10-2026**, pensados para mostrar costo aproximado y aplicar presupuestos a agentes, no para facturar. OPAI los ajusta en Plataforma → Ajustes cuando cambie el precio del proveedor; un cambio crea una fila nueva con `vigente_desde` (el historial no se reescribe).

| Recurso | Unidad | micro-USD por unidad | Equivalente | Proveedor de referencia |
| --- | --- | ---: | --- | --- |
| `capacidad.ejecucion` | llamada | 0 | sin costo | — (se mide para uso y presupuestos) |
| `ia.economica.entrada` | token | 1 | US$ 1 por millón | clase económica (Haiku) |
| `ia.economica.salida` | token | 5 | US$ 5 por millón | clase económica |
| `ia.estandar.entrada` | token | 3 | US$ 3 por millón | clase estándar (Sonnet) |
| `ia.estandar.salida` | token | 15 | US$ 15 por millón | clase estándar |
| `ia.potente.entrada` | token | 15 | US$ 15 por millón | clase potente (Opus) |
| `ia.potente.salida` | token | 75 | US$ 75 por millón | clase potente |
| `geo.autocompletado` | consulta | 2.830 | US$ 2,83 por 1.000 | Google Places Autocomplete (sesión) |
| `geo.geocodificacion` | consulta | 5.000 | US$ 5 por 1.000 | Google Geocoding |
| `geo.mapa` | imagen | 2.000 | US$ 2 por 1.000 | Google Static Maps |
| `correo.enviado` | correo | 400 | US$ 0,40 por 1.000 | Resend |
| `biometria.vida` | sesión | 15.000 | US$ 0,015 por sesión | AWS Rekognition Face Liveness (CAR-89 · B4) |
| `biometria.enrolar` | operación | 1.000 | US$ 0,001 por imagen | AWS Rekognition IndexFaces (CAR-89 · B4) |
| `biometria.verificar` | operación | 1.000 | US$ 0,001 por imagen | AWS Rekognition SearchFacesByImage (CAR-89 · B4) |
| `almacenamiento.subida` | MB | 15 | US$ 0,015 por GB | Cloudflare R2 (almacenamiento del primer mes) |
| `almacenamiento.descarga` | URL | 0 | sin costo | R2 no cobra egreso |

## Diferencias con el Brief 02

- El brief pedía IA "por 1.000 tokens", almacenamiento "por GB·mes" y MCP/API "por 1.000 llamadas". Se mide por la unidad atómica (token, MB subido, llamada) para no redondear consumos chicos; la tabla muestra el equivalente. El almacenamiento se cobra una vez al subir (aproximación del primer mes); el costo mensual recurrente por GB guardado queda para cuando exista el informe de almacenamiento.
- `capacidad.ejecucion` cubre UI, API y MCP por igual (ADR-004): no hay precio distinto para MCP.
- Los montos en base: `consumos.costo_total_micro` es `INT` (una fila nunca supera ~2.147 USD); los acumulados (`consumos_diarios.costo_total_micro`) y los presupuestos de API keys son `BIGINT`.
