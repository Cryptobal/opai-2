# BRIEF-35 · Finanzas bloque 0: candado de ambiente y cesión anulada (CAR-191)

**Rama:** `fix/car-191-finanzas-candado-ambiente` · **Sin migración** · Hoja de alcance: [finanzas.md](../modulos/finanzas.md) §4, bloque 0.

## Por qué
Nada impedía que test.opai.cl emitiera en el SII real o cediera con Octava: el ambiente salía solo de `dte_config`, y solo `NODE_ENV=test` o `SII_ADAPTADOR`/`CESION_ADAPTADOR=simulado` forzaban el simulado. Además, una cesión anulada por el RPETC dejaba la factura «cedida» para siempre.

## a) Candado de ambiente
- `packages/integrations/src/sii/entorno.ts`: `produccionTributariaHabilitada(env)` es `true` solo si `OPAI_PRODUCCION_TRIBUTARIA === "habilitada"` **y** el host de `BETTER_AUTH_URL` es `app.opai.cl`. Falla cerrado. `ambienteTributarioEfectivo(configurado, env)` devuelve `certificacion` si no está habilitada.
- Se usa en los dos únicos puntos de paso: `ambienteDe` (emisión, NC, envío y consulta SII, trabajos DTE) y `adaptadorCesionDe` (Octava).
- `finanzas.dte_config.actualizar` rechaza «producción» si no está habilitada («La producción del SII solo está disponible en app.opai.cl»), también en vista previa. Las filas ya guardadas en «producción» quedan acotadas en tiempo de ejecución. El preflight de emisión avisa que se usa certificación.
- Se retira `adaptadorSiiDesdeEntorno` (sin usos, con un TODO).

## b) Cesión anulada
Cuando el RPETC devuelve `anulada` para una cesión que no lo estaba, `finanzas.cesion.consultar_rpetc`, en una transacción: cesión `anulada`; el documento vuelve a `no_cedido` con `cesionOperacionId` y `cesionProveedor` nulos; `sincronizarCobroDocumento` recalcula `estadoCobro` y `montoCobrado`; evento `finanzas.venta.cesion_anulada` (solo campana). `cesion_ceder` toma la secuencia siguiente para no chocar con el UNIQUE (tenant, documento, secuencia).

## Pruebas
Unitarias de la función (variable ausente, host distinto, ambos presentes), de capacidad (producción guardada sin habilitar → adaptador y `ambienteDe` reciben certificación; `dte_config.actualizar` rechaza) y de base (`finanzas-cesion-anulada-db.test.ts`: ceder, anular, factura cobrable, ceder de nuevo).

## Pendiente de Carlos
Poner `OPAI_PRODUCCION_TRIBUTARIA=habilitada` **solo** en el despliegue de app.opai.cl cuando entre a producción.
