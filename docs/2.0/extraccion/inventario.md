# Extracción de OPAI 1.0 — Inventario

**Fecha:** 14-nov-2026 · **Autor:** Claude («Sesión Inventario») · **Proyecto Linear:** 07 · Inventario (P-CAR-11) · **Lo usa:** [`modulos/inventario.md`](../modulos/inventario.md)

## Fuentes y límites

- **Código de 1.0 (`Cryptobal/opai`):** esta sesión no tuvo acceso de lectura al repositorio de 1.0 (permiso denegado al adjuntarlo). No se leyó código.
- **Línea base de paridad** ([`paridad/linea-base-1.0.md`](../paridad/linea-base-1.0.md), 24-oct-2026): 1.0 tiene `(app)/ops/inventario`, `api/ops/inventario` y el schema `inventory` con **15 modelos**. En esa fecha quedó como «no copiar» (backlog, ADR-030).
- **Contrato público del MCP de 1.0** (descripciones y esquemas de las herramientas `list_devices`, `preview_create_device`, `update_device`, `list_phone_lines`, `preview_create_phone_line`, `preview_assign_phone_line`). Se leyó solo el contrato, **sin llamar a las herramientas ni leer datos de Gard**.
- **Linear:** Carlos creó el proyecto «07 · Inventario» el 10-nov-2026 con cuatro tickets (CAR-235 a CAR-238) para la Versión 1.0: el módulo sale del backlog.

Lo que no se pudo verificar queda marcado **(sin verificar)**. Si la Sesión de Paridad o Carlos encuentran otra regla en el código de 1.0, se agrega aquí y en la especificación.

## Qué hace 1.0

### Activos (`inventory.assets`, sin verificar en detalle)

- Existe una entidad «activo de inventario» con id propio: la línea telefónica puede apuntar a un `assetId` «de esta empresa».
- Los campos del activo, sus tipos y sus estados no se pudieron leer **(sin verificar)**.

### Líneas telefónicas (`inventory.phone_lines`)

- Campos: número (obligatorio, se normaliza a `+569` y 8 dígitos), operador (obligatorio, en minúsculas: movistar, entel, claro, wom, otro), etiqueta interna, tipo de plan, notas (máx. 2.000), activo vinculado opcional.
- Estados: `active`, `suspended`, `cancelled`. Pasar a `cancelled` **cierra la asignación vigente**.
- **Asignación con historial:** una línea se asigna a **una instalación o a un usuario**, nunca a los dos. Mover la línea cierra la asignación vigente y abre otra en una sola transacción, con notas.
- Listado con filtros: instalación (asignación vigente), estado, número (al menos 4 dígitos), texto y «sin asignación».

### Teléfonos corporativos (`Device`, datos de MDM)

- Alta con id MDM obligatorio y único por empresa; resto opcional: usuario MDM, modelo, versión de Android, último contacto, cuenta Google, ICCID (19 o 20 dígitos), IMEI 1 y 2 (15 dígitos; un Luhn inválido solo advierte), número de serie, batería, operador, notas, puesto operativo.
- Estados: `ACTIVE`, `DOWN`, `RETIRED`.
- El teléfono **se enlaza a una línea**; el número y la instalación del teléfono **salen de la asignación vigente de esa línea** (los campos `numero` e `installation_id` del equipo quedaron deprecados). A lo más un equipo activo por línea.
- Si la línea tiene instalación vigente, el puesto del equipo debe ser de esa instalación.
- Toda escritura tiene vista previa con token de un solo uso (5 minutos) y deja auditoría.

### Ropa y uniformes

- La línea base no muestra un catálogo de ropa en 1.0 **(sin verificar)**. Las tallas de uniforme viven en la ficha de la persona (`OpsPersona`, ver [`extraccion/maestros.md`](maestros.md)) y el uniforme también aparece como costo en CPQ (cambios por año, [`extraccion/comercial-y-cpq.md`](comercial-y-cpq.md) §3.8).
- En 2.0 las tallas ya son **una por prenda del uniforme de la empresa** (CAR-408, Sesión Personas y Documentos): kit por vertical o propio de la empresa.

## Qué pasa a 2.0, qué no y qué se mejora

| Tema | En 1.0 | En 2.0 |
|---|---|---|
| Tipos | Entidades fijas por clase (línea, teléfono, activo) | **Catálogo de tipos configurable** por empresa, en dos categorías: **activo** (se controla por unidad) y **ropa** (se controla por existencias y talla) |
| Campos propios | Fijos en el código (IMEI, ICCID…) | Cada tipo de activo declara sus **campos propios** (texto, número, fecha, con obligatorio). «Teléfono» y «Línea telefónica» vienen sugeridos con IMEI, número y operador |
| Línea telefónica | Entidad aparte con su asignación | Un **activo de tipo «Línea telefónica»**, con la misma asignación que cualquier activo (CAR-236/238) |
| Asignación | Línea a instalación o a usuario | Activo a **persona o instalación** (no a usuario), con historial; ropa entregada a una persona descuenta existencias (CAR-238) |
| Datos técnicos de MDM | Batería, Android, último contacto | **No pasan** en v1: vienen de una integración MDM que no existe en 2.0. Queda en backlog |
| Ropa | Solo tallas en la ficha | Tipos de ropa ligados a las **prendas del uniforme** de Personas, con existencias por talla (CAR-237) |
| Vista previa | Token propio de 5 minutos | `dryRun` / `preview_…` del registro de capacidades (ADR-004), con idempotencia y auditoría estándar |
| Venta | Incluido en 1.0 | **Módulo vendible aparte**, activable por empresa; se cobra por instalación activa |

## No copiar

- Vincular activos a **usuarios** del sistema: en 2.0 se asigna a la **persona** (el guardia no siempre tiene usuario).
- Campos técnicos de un proveedor MDM en el modelo del activo.
- Listas de operadores fijas en el código: son valores de un campo propio del tipo.
