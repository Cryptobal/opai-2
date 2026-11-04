# Alcance · Rendiciones — para revisar una sola vez

Fuentes: `extraccion/rendiciones.md` (código de 1.0, 115 reglas) y el diseño aprobado v2 (`diseño/export-rendiciones`, 8 pantallas). Rendiciones se vende sola (ADR-048): funciona con y sin Finanzas.

## 1. Qué pasa de 1.0 a 2.0
| En 1.0 hoy | En 2.0 |
|---|---|
| Rendición de compra y de kilometraje | Las dos, con las pantallas 02 y 03 del diseño |
| Kilometraje por consumo (km/l, precio del litro, recargo 10 %, peaje) con Google Routes | Igual cálculo, con los parámetros en Configuración › Módulos › Rendiciones y la ruta por el servicio de geolocalización del núcleo |
| Dos aprobadores fijos; basta cualquiera con permiso, aunque sea el mismo solicitante | Bandeja del aprobador (04) con aprobador asignado; **el solicitante nunca aprueba ni paga lo suyo** |
| Pago al crear el pago; nómina solo Santander | Lotes de pago (06); la rendición pasa a «Pagada» al confirmar el lote; nómina Santander primero |
| Cuenta de destino leída al exportar, sin copia | Cuenta de la Ficha de persona, **copiada al lote** al crearlo; aviso «Sin datos bancarios en la ficha» |
| Centro de costo por rendición | Instalaciones activas + «Administración / Oficina central», validadas del mismo tenant |
| Código `REN-n` global y sin bloqueo | Código por empresa, con bloqueo, sin huecos repetidos |
| Reporte | Reporte (07) con filtros y exportación a Excel (en 1.0 el botón apuntaba a una ruta inexistente) |

## 2. Qué NO entra en este bloque
- Extracción por IA de la boleta y rendir desde el portal del guardia: **no existen en 1.0**; van en un bloque posterior (R4), si lo apruebas.
- Asiento contable y flujo de caja por rendición: dependen de Contabilidad (C1); el módulo emite el evento `rendiciones.pagada` para enganchar después.
- Anticipos / fondos por rendir y descuento por liquidación de sueldo.
- No se portan los campos sin uso de 1.0 (topes, `requireTollImage`, `accountCode`) ni el estado `IN_APPROVAL`.

## 3. Mejoras que se suman
Borrar adjuntos solo en borrador; detección de boleta duplicada (proveedor + folio + monto) con aviso; reenvío tras rechazo sin chocar con el índice de aprobaciones; todo con `dryRun`, auditoría y herramienta MCP.

## 4. Defaults que tomo (di «no» a cualquiera y lo cambio)
1. Pueden rendir los usuarios del ERP con permiso; guardias y supervisores sin usuario, en R4.
2. Un solo nivel de aprobación por rendición; el aprobador sale de la configuración. Niveles por monto, en R3.
3. Estado «Devuelta» distinto de «Rechazada» (la devuelta se corrige y reenvía).
4. Sin respaldo no se envía, salvo la opción «sin respaldo» con motivo, que el tenant puede apagar.
5. Plazo máximo para rendir: configurable, sin tope por defecto; fecha futura no permitida.
6. Una rendición pagada solo se revierte con un lote de reversa, por quien tenga el permiso de pagos.

## 5. Lo que necesito de ti (solo negocio)
a) Quién puede rendir (punto 1). b) Niveles de aprobación (punto 2). c) Si el kilometraje se paga por consumo, como en 1.0, o por tarifa por km. d) Si «Pagada» se marca al generar el lote o al confirmar el banco.
