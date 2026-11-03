# BRIEF · Comercial: ganar un negocio con efectos (R18) y cuenta con datos del SII

**Repo:** `Cryptobal/opai-2` · **Fecha:** 3-nov-2026 · **Tarea:** CAR-162 (encargo de Carlos: Comercial operable para el corte de ventas de Gard) · **Diseño:** export aprobado `docs/2.0/diseño/export-crm-v3-cierre/` (PR #240): `NegocioV2` con `screen="ganar"` y `CuentaV2` con `screen="sii"`; prompt `docs/2.0/design/DESIGN-PROMPT-comercial-cierre.md` §2 `DatosSII`, §3.5 y §3.6.

**Entrega en dos PR** (prioridad de Carlos del 3-nov-2026: Comercial operativo hoy):
- **PR 1 · `brief/car-162-ganar-efectos`:** ganar con efectos (bloques B1–B4). Sin migración.
- **PR 2 · `brief/car-162-cuenta-sii`:** cuenta con datos del SII (bloques B5–B8), apilado sobre el PR 1 si hace falta.

## 1. Objetivo
Que ganar un negocio deje el sistema listo para operar: la cuenta pasa a cliente activo, las instalaciones del negocio llegan activas a Operaciones y la cotización vigente queda aceptada (R18 de `modulos/comercial.md`, R45 de `modulos/cpq.md`), con una vista previa que dice exactamente qué va a pasar antes de confirmar. Y que una cuenta nazca lista para facturar trayendo sus datos del SII por RUT, campo por campo y con vista previa, igual en pantalla y por MCP.

## 2. Estado actual (verificado en `main` `7186617`)
- `comercial.negocios.ganar` (`packages/capabilities/src/comercial/negocios-mover.ts`) cambia la etapa y emite `comercial.negocio.ganado`, pero **nadie consume el evento** (`grep` sin consumidores). La cuenta sigue en `prospecto` y las instalaciones, en `prospecto`.
- CPQ (`cpq.versiones.estado`) ya admite `aceptada` y `rechazada` (CHECK de `20261101003000_cpq_schema`, transiciones en `modules/cpq/domain`), pero nada las fija al ganar. No hay evento `cpq.cotizacion.aceptada` en el manifest.
- No existe la oferta de puestos (R2 de CPQ): ninguna capacidad ofrece o crea puestos desde la cotización. Exige diseño propio («Crear puestos», CPQ v4) y confirmación de RRHH.
- Las transiciones de estado ya existen como capacidades: `core.cuentas.set_estado` (prospecto → cliente_activo, fija `cliente_desde`) y `core.instalaciones.set_estado`.
- La hoja «Ganar» (`apps/web/app/(erp)/negocios/_componentes/hojas/hoja-ganar.tsx`) solo pide el inicio del servicio y avisa sin cotización.
- **SII:** `packages/integrations/src/sii/` trae el adaptador DTE de SimpleAPI v1 (#234: `firmar`, `enviar`, `consultar` de envíos). **No tiene consulta de contribuyente.** 1.0 la hace con `GET https://rut.simpleapi.cl/v2/{rut}` (Basic `api:<key>`), un producto distinto de la emisión (suscripción «SimpleAPI RUT»). La cuenta ya tiene `razonSocial`, `giro`, `calle`, `comuna`, `ciudad` y `emailDte`.

## 3. Alcance
**Entra (PR 1):** plan de efectos compartido; consumidor del núcleo que activa la cuenta y las instalaciones; consumidor que acepta la vigente y rechaza las abiertas; evento `cpq.cotizacion.aceptada` con el conteo de puestos por ofrecer; `efectos` en la salida (y en la vista previa) de `comercial.negocios.ganar`; hoja ganar con «Qué va a pasar», confirmando, éxito y error de regla de negocio.

**Entra (PR 2):** interfaz `ConsultaContribuyente` en `@opai/integrations` con proveedor SimpleAPI RUT y proveedor «no configurado»; integración `sii_contribuyente` en el catálogo (secreto propio del tenant); `core.cuentas.consultar_sii` (lectura) y `core.cuentas.aplicar_sii` (escritura con dryRun, campo por campo); dominio «Lista para facturar»; componente `DatosSII` en el DS con sus estados y en `/ds`; botón «Consultar SII» e indicador en la ficha de cuenta.

**No entra:** la oferta y creación de puestos (R2): el evento `cpq.cotizacion.aceptada` lleva `puestosPorOfrecer` para el PR de puestos (CPQ v4 «Crear puestos»). Consulta SII en lote, caché persistente y consulta al crear la cuenta (pendientes de A3/P5). Perder no se toca (R19).

## 4. Arquitectura
- **Un plan, dos usos.** `planGanar(db, negocio)` (`comercial/ganar-efectos.ts`) lee la cuenta, las instalaciones vinculadas, las cotizaciones y sus versiones, y devuelve `efectos` más las versiones a rechazar. Lo llaman la vista previa de `ganar` y los consumidores, así que lo que se muestra es lo que se aplica.
- **Por eventos (ADR-029).** Ganar sigue escribiendo solo el negocio y emitiendo `comercial.negocio.ganado` en su transacción. Dos consumidores idempotentes: `comercial.ganar.activar` (cuenta e instalaciones; emite `core.cuenta.estado_cambiado` y `core.instalacion.estado_cambiado`) y `cpq.ganar.aceptar` (versiones; emite `cpq.cotizacion.aceptada`). El de CPQ vive en `packages/capabilities/src/comercial/` y no en `modules/cpq` porque comparte `planGanar` y capabilities no puede depender de un módulo; sin cotizaciones no hace nada.
- **Idempotencia.** Cada escritura va condicionada al estado de origen (`updateMany … where estado in (…)`) y el evento solo se emite si `count === 1`. Si el negocio ya no está ganado al despachar, no hace nada.
- **SII detrás de una interfaz.** `consultarContribuyente(rut)` devuelve un resultado tipado (`ok`, `rut_invalido`, `no_encontrado`, `sin_inicio`, `sin_respuesta`, `no_configurado`). Las credenciales salen del almacén cifrado del tenant (`credencialDe(ctx, "sii_contribuyente")`), nunca de `process.env`; sin key, el proveedor «no configurado» lo dice.

## 5. Archivos
PR 1: `packages/capabilities/src/comercial/{ganar-efectos,consumidor-ganado,consumidor-ganado-cpq,negocios-mover}.ts`, `src/core/index.ts`, `src/index.ts`, `modules/cpq/manifest.ts`, `apps/web/app/(erp)/negocios/_componentes/hojas/{hoja-ganar,efectos-ganar}.tsx`, tests `comercial-ganar-efectos.test.ts` y `comercial-ganar-db.test.ts`, e2e `comercial-ganar.spec.ts`.
PR 2: `packages/integrations/src/sii/contribuyente*.ts`, `catalogo-extra.ts`, `packages/domain` (lista para facturar), `packages/capabilities/src/core/maestros/cuentas-sii*.ts`, `packages/ds/src/components/datos-sii.tsx` (+ `/ds`), ficha de cuenta.

## 6. Modelo de datos y migraciones
PR 1: **sin migración**. PR 2: sin migración prevista (la caché persistente queda pendiente); si se agrega, aditiva con la plantilla RLS y `SET LOCAL lock_timeout`.

## 7. Capacidades
| Id | Efecto | Cambio |
|---|---|---|
| `comercial.negocios.ganar` | irreversible, dryRun | Salida con `efectos` (cuenta, instalaciones, cotización, rechazadas, puestosPorOfrecer) |
| `core.cuentas.consultar_sii` | lectura | Nueva (PR 2): datos del SII y comparación campo a campo, marcados como externos |
| `core.cuentas.aplicar_sii` | escritura, dryRun | Nueva (PR 2): aplica solo los campos elegidos; vuelve a consultar al SII (nunca toma el valor del input) |
| `core.cuentas.facturable` | lectura | Nueva (PR 2): «Lista para facturar» y lo que falta, sin llamar al SII (indicador de la ficha) |
Las nuevas generan herramienta MCP; se actualiza la instantánea `herramientas-mcp.txt` y el inventario.

## 8. Interfaz y responsive
Hoja ganar (`Sheet`, completa en el teléfono): estados vista previa («Qué va a pasar», skeleton mientras llega), confirmando («Aplicando los cambios en Cuentas, Operaciones y CPQ…»), éxito (cliente activo y enlaces «Ver instalación …») y error con el texto del servidor. 375, 1024 y 1280 px. Ficha de cuenta (PR 2): «Consultar SII» junto al RUT; hoja `DatosSII` con «En la ficha» / «En el SII», badge Igual, Distinto o Vacío y `Segmentado` «Aplicar el del SII» / «Mantener lo mío»; indicador «Lista para facturar» o «Faltan N datos para facturar».

## 9. Seguridad y tenant
Los consumidores corren con el contexto de sistema del tenant del evento: toda lectura y escritura pasa por la RLS de ese tenant. Las capacidades conservan sus permisos (`comercial:negocios.manage`; `core:cuentas.manage` para aplicar). Ganar sigue siendo irreversible: un agente queda en aprobación humana y la vista previa de efectos no escribe. Los datos del SII son externos (`externo()`) y nunca habilitan una escritura irreversible. La API key del SII nunca sale por API, MCP ni logs.

## 10. Casos límite
Ampliación (una instalación ya activa): solo se activa la de prospecto. Instalación archivada: no se activa. Cuenta inactiva: vuelve a activa y conserva `cliente_desde`. Sin cotización: no hay aceptación ni puestos. Cotización vigente sin versión enviada: no se acepta ni se rechaza nada (no se pierde un borrador en curso). Negocio reabierto antes del despacho: el consumidor no hace nada. Reintento del outbox: sin cambios ni eventos duplicados.

## 11. Plan por bloques (un commit por bloque)
- **B1** `comercial:` plan de efectos y consumidor de activación (R18) con tests.
- **B2** `cpq:` consumidor de aceptación (R45) y evento `cpq.cotizacion.aceptada`; test contra Postgres.
- **B3** `comercial:` vista previa de efectos en `ganar` y hoja ganar (vista previa, confirmando, éxito, error).
- **B4** `docs:` brief y `ESTADO.md`.
- **B5–B8 (PR 2):** integración SII y proveedor no configurado; capacidades `consultar_sii` y `aplicar_sii` con MCP; `DatosSII` en el DS y `/ds`; ficha de cuenta e indicador.

## 12. Tests
`comercial-ganar-efectos.test.ts` (memoria): vista previa sin escribir, ampliación, consumidor con eventos e idempotente, negocio no ganado, elección de la versión. `comercial-ganar-db.test.ts` (Postgres real, rol sin BYPASSRLS): ganar → despacho → cuenta e instalaciones activas, vigente aceptada, abierta rechazada, reemplazada intacta, `cpq.cotizacion.aceptada` con 2 puestos, reintento sin duplicar y otra empresa intacta. e2e `comercial-ganar.spec.ts` a 375, 1024 y 1280.

## 13. Validación
`pnpm typecheck && pnpm lint && pnpm test && pnpm test:db && pnpm build`, `pnpm presupuesto` y los e2e propios.

## 14. Criterios de aceptación
1. Ganar deja la cuenta en `cliente_activo` (con `cliente_desde`) y las instalaciones vinculadas en prospecto o inactivas en `activa`, cada una con su evento.
2. La versión enviada de la cotización vigente queda `aceptada` y las demás abiertas del negocio `rechazada`; se emite `cpq.cotizacion.aceptada` con `puestosPorOfrecer`.
3. Repetir el despacho no cambia nada ni duplica eventos.
4. La vista previa de ganar (pantalla y `preview_comercial_negocios_ganar`) muestra esos efectos sin aplicarlos.
5. La hoja tiene vista previa, confirmando, éxito con enlaces y error con el texto del servidor, a 375, 1024 y 1280.
6. (PR 2) `consultar_sii` y `aplicar_sii` por pantalla y MCP; sin credencial, el proveedor «no configurado» lo dice; indicador «Lista para facturar».

## 15. Riesgos y rollback
Los consumidores corren después del commit de ganar (outbox): hay una ventana de segundos en que el negocio está ganado y la cuenta aún prospecto; el despacho inmediato (`despacharDiferido`) y el cron la cierran. Rollback: quitar los dos consumidores del registro (los estados ya aplicados se corrigen con `set_estado`). Sin migración en el PR 1.

## 16. Reporte de ejecución
Ver la descripción del PR y `ESTADO.md`.
