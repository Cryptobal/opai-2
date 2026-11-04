# BRIEF · CAR-154 (P3) · Cliente real de App Octava para la cesión

## 1. Objetivo
Reemplazar el adaptador de cesión inventado (`https://api.octava.cl/api/v1/cesion/enviar`, Basic) por el cliente de la API real de App Octava, portado de OPAI 1.0 (`src/lib/octava/octava-client.ts` y `src/modules/finance/shared/adapters/octava-cesion.ts`). Es una pieza aislada y probada que el ROADMAP permite portar con revisión.

## 2. Estado actual (verificado)
`packages/integrations/src/cesion/octava.ts` llamaba a endpoints que no existen. 1.0 usa `https://www.appoctava.cl/apirestcesion` con `RegistraCedente`, `ObtenerToken`, `CargaXmlCesion`, `CedeDte` y `ConsultaEstadoAEC`. La integración `dte_cesion` ya guarda `usuario` y `clave` cifrados; el certificado `.pfx` del cedente ya vive cifrado en `dte_emision` (`certificado_pfx`, `certificado_clave`).

## 3. Alcance
Cliente HTTP con `fetch` inyectable; registro único del cedente; token de 6 h con renovación al recibir `TEXP`/`TINV`; carga y cesión del XML; consulta del RPETC desde el trabajo horario existente. Fuera de alcance: polling dentro de la capacidad, descarga del AEC firmado, re-cesión (código 4), alta de la clave de acceso desde pantalla.

## 4. Arquitectura
`@opai/integrations/cesion` queda sin base ni `process.env`: recibe dependencias (`integrador`, `cedente`, `almacen`, `ambiente`, `fetch`). `packages/capabilities/src/finanzas/adaptador-cesion*.ts` las arma desde la integración del tenant.
- **Mapeo de credenciales.** `usuario` = RUT de la empresa integradora que contrató Octava (`INTEGRADOR`); `clave` = su contraseña (`PASSWORDINTEGRADOR`). Reemplaza a `OCTAVA_INTEGRADOR_RUT/PASSWORD` de 1.0: cada empresa trae su contrato con Octava.
- **Sin registro ni certificado (ajuste 4-nov-2026).** Octava confirmó a Carlos que con el RUT y la contraseña de acceso que ellos entregaron se obtiene el token (6 h) con `ObtenerToken`. OPAI 2 no llama a `RegistraCedente`, no usa el `.pfx` ni guarda `PassAccesoApi`; `usuario` = `RUTACCESOAPI` y `clave` = `PASSWORDACCESOAPI`.
- **Sesión.** El token se guarda como secreto cifrado de la integración `dte_cesion` (`token_sesion`), sin columnas ni migración y sin sufijo.
- **Identificador de operación.** Octava no entrega uno: `octava:<ambiente>:<rutEmisor>:<tipo>:<folio>` en `cesiones.operacion_externa_id`, suficiente para `ConsultaEstadoAEC`.
- **Respuestas.** El string `"NULL"` se trata como ausente; `IdResultadoFE=3` en `CedeDte` (ya cedido) sigue como enviada; `CodigoCesion`: `EOK` → aprobada, vacío o `PEN` → enviada, otro → anulada con glosa.

## 5. Archivos
`packages/integrations/src/cesion/` (`tipos`, `simulado`, `octava-api`, `octava-http`, `octava-cliente`, `octava-sesion`, `octava-estado`, `octava`, `octava-doble`, pruebas y `fixtures/`); `packages/capabilities/src/finanzas/adaptador-cesion.ts` y `adaptador-cesion-octava.ts`; `ventas-cesion-ceder.ts`; `trabajos-cesion.ts`; `catalogo-extra.ts`; `hoja-ceder.tsx`.

## 6. Modelo de datos
Sin migración.

## 7. Capacidades
`finanzas.ventas.cesion_ceder` acepta `factorEmail` y `factorDireccion` (opcionales, compatibles) y envía tipo de DTE, correo del deudor (`emailDte` de la cuenta) y vencimiento. La configuración de `dte_cesion` admite `emailCedente`, `direccionCedente`, `contactoNombre` y `contactoEmail` (opcionales; por defecto, el usuario que cede).

## 8. Interfaz
La hoja «Ceder factura» suma correo y dirección del factor.

## 9. Seguridad y tenant
Secretos cifrados por tenant, nunca en `process.env`; sin logs de cuerpos ni de credenciales; el trabajo horario captura el fallo de una consulta sin frenar las demás.

## 10. Casos límite
Token expirado, `TDUP` con token `"NULL"`, DTE ya cargado (`5`), ya cedido (`3`), datos del deudor o del factor faltantes, respuesta que no es JSON.

## 11 a 13. Plan, tests y validación
Dos commits: cliente y adaptador; integración con capacidades, pantalla y docs. Vitest con `fetch` grabado (cero llamadas reales), almacén de sesión en `capabilities`. Gate: `pnpm typecheck && pnpm lint && pnpm test`.

## 14. Criterios de aceptación
Los 5 endpoints reales con el cuerpo de 1.0; ningún secreto en código; tests en verde; sin tocar Octava real.

## 15. Riesgos y rollback
No probado contra Octava (falta certificación: ver ESTADO). Revertir el PR devuelve el adaptador anterior; no hay migración. El XML se envía como UTF-8; 1.0 lo enviaba en latin1, hay que confirmar con certificación si Octava exige ISO-8859-1.

## 16. Reporte de ejecución
Ver el PR.
