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

## 4. Decisiones de Carlos (4-nov-2026)
1. Pueden rendir solo usuarios del ERP con permiso; guardias y supervisores sin usuario, en un bloque posterior.
2. Un solo nivel de aprobación con aprobador asignado; el solicitante nunca aprueba ni paga lo suyo. Niveles por monto, después.
3. «Pagada» se marca al **confirmar el lote de pago**, no al generarlo.
4. **Kilometraje configurable por empresa**: cada empresa elige en Configuración › Módulos › Rendiciones el método de cálculo (por consumo, por tarifa por km o monto fijo por tramo) y fija sus propias variables (rendimiento km/l, precio del litro, recargo, tarifa por km, peaje). La fórmula la evalúa `packages/domain` como configuración versionada (ADR-021), nunca código por empresa.

## 5. Defaults que tomo (avísame si alguno no te sirve)
Estado «Devuelta» distinto de «Rechazada»; sin respaldo solo con motivo y apagable por empresa; fecha futura no permitida; reversa de una rendición pagada solo con lote de reversa y permiso de pagos.

## 6. Plan por bloques
R1 modelo, rendición de compra, aprobación y «Mis rendiciones» · R2 kilometraje configurable · R3 lotes de pago y nómina Santander · R4 reporte, exportación y configuración · R5 pulido y traspaso a Contabilidad (evento `rendiciones.pagada`).
