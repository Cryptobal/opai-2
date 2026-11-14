# Inventario — Hoja de alcance y especificación

**Estado:** en revisión (decidida por la Sesión Inventario con autonomía, ADR-114; Carlos la revisa en el issue «Decide Carlos» CAR-487) · **Fase:** Versión 1.0 · **Insumos:** [`extraccion/inventario.md`](../extraccion/inventario.md), ADR-116 · **Autor:** Claude («Sesión Inventario») · **Linear:** 07 · Inventario (CAR-235 a CAR-238)

## 1. Objetivo

Saber qué tiene la empresa (teléfonos, radios, linternas, ropa del uniforme), dónde está y quién lo tiene, sin planillas. Se vende aparte y se activa por empresa.

Se nota que funciona cuando: (1) cada guardia nuevo recibe su uniforme registrado en OPAI; (2) al salir una persona se sabe qué tiene que devolver.

## 2. Hoja de alcance (una página)

**Pasa de 1.0, mejorado**

- Activos con historial de asignación (teléfonos y líneas en 1.0) → cualquier tipo de activo, asignado a una **persona o una instalación**.
- Línea telefónica → es un tipo de activo más, con sus campos (número, operador, plan).
- Vista previa antes de escribir y auditoría.

**No pasa**

- Datos técnicos de MDM (batería, versión de Android, último contacto): backlog, cuando exista una integración MDM.
- Asignar a usuarios del sistema: se asigna a personas.

**Se suma**

- **Catálogo de tipos configurable** (CAR-235): la empresa define sus tipos en dos categorías, **activo** (se controla por unidad, con número de serie o código) y **ropa** (se controla por existencias y talla). Cada tipo de activo tiene **campos propios**.
- **Tipos sugeridos por rubro**: con un clic se cargan los tipos típicos de la vertical (seguridad: teléfono, línea telefónica, radio, linterna, chaleco antibalas; ropa: las prendas del uniforme).
- **Ropa ligada al uniforme de Personas** (CAR-237 con CAR-408): un tipo de ropa puede apuntar a una prenda del kit del uniforme; al entregar, se propone la talla de la ficha de la persona.
- **Existencias por talla** de cada tipo de ropa (CAR-237).
- **Entrega y devolución** a persona o instalación, con historial; la ropa entregada descuenta existencias (CAR-238).
- **Módulo vendible**: entrada propia en el catálogo de cobro, por instalación activa.

## 3. Entidades y relaciones

| Entidad | Qué es | Se relaciona con | Dónde vive |
|---|---|---|---|
| Tipo | Categoría configurable: «Teléfono», «Radio», «Camisa» | Activos, existencias | `inventario.tipos` (CAR-235) |
| Activo | Una unidad física con código o serie | Tipo; asignación vigente | `inventario.activos` (CAR-236) |
| Existencia | Cantidad disponible de un tipo de ropa en una talla | Tipo | `inventario.existencias` (CAR-237) |
| Asignación | Quién tiene un activo, o qué ropa se entregó a quién, desde cuándo y hasta cuándo | Activo o tipo de ropa; persona o instalación del núcleo | `inventario.asignaciones` (CAR-238) |

## 4. Pantallas

| Pantalla | Ruta | Patrón | Menú |
|---|---|---|---|
| Tipos | `/inventario` (ficha en `/inventario/tipos/<id>`) | Lista + ficha a la derecha (como Cargos) y hoja para crear o editar | Área **Operaciones** › Inventario, pestaña «Tipos» |
| Activos | `/inventario/activos` | Lista + ficha | Pestaña «Activos» (CAR-236) |
| Ropa | `/inventario/ropa` | Lista de tipos de ropa con existencias por talla | Pestaña «Ropa» (CAR-237) |
| Asignaciones | En la ficha del activo, en la ropa y en la ficha de la persona y de la instalación | Tarjeta | CAR-238 |

Mismo diseño que el resto de OPAI (diseño nuevo, ADR-109). No hay diseño aprobado propio del módulo: se usa el de Cargos (catálogo con lista y ficha) como el más cercano.

## 5. Campos del tipo (CAR-235)

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| Nombre | Texto | Sí | 2 a 80 caracteres, único por empresa (sin distinguir mayúsculas ni tildes) |
| Categoría | Activo o ropa | Sí | No cambia después de crear |
| Descripción | Texto | No | Hasta 300 |
| Campos propios (activo) | Lista | No | Hasta 12; cada uno con etiqueta (2 a 40), tipo (texto, número, fecha) y obligatorio; etiquetas sin repetir |
| Prenda del uniforme (ropa) | Clave de la prenda | No | Texto corto; la asignación propone la talla de la ficha |
| Tallas (ropa) | Lista | Sí en ropa | 1 a 20 tallas, sin repetir, hasta 10 caracteres cada una |
| Activo | Sí/no | — | Un tipo inactivo no se ofrece para nuevos activos ni entregas |

## 6. Reglas de negocio

- **R1.** El nombre del tipo es único por empresa, sin distinguir mayúsculas, tildes ni espacios extremos.
- **R2.** La categoría no cambia después de crear el tipo.
- **R3.** Un tipo de ropa tiene al menos una talla; un tipo de activo no tiene tallas.
- **R4.** Los campos propios solo existen en tipos de activo; cada uno tiene una clave estable derivada de la etiqueta al crearlo.
- **R5.** Un tipo nunca se borra: se desactiva (los activos y entregas lo referencian).
- **R6.** «Cargar tipos sugeridos» solo agrega los que faltan por nombre; nunca cambia los existentes. Es idempotente.
- **R7.** Toda escritura tiene vista previa (`dryRun`, MCP `preview_…`), clave de idempotencia y auditoría.
- **R8.** Las tallas se guardan sin espacios y en mayúsculas («x l» → «XL»): son la clave de las existencias (CAR-237). La clave de un campo nuevo nunca repite una clave en uso.
- **R9.** Las reglas R10 en adelante se agregan con CAR-236 a CAR-238 (activos, existencias y asignaciones).

## 7. Permisos

| Acción | owner / admin | gerente | supervisor | lector | Agente |
|---|---|---|---|---|---|
| Ver tipos, activos y existencias (`inventario:read`) | Sí | Sí | Sí | Sí | Con scope `inventario` |
| Configurar tipos (`inventario:tipos.manage`) | Sí | No | No | No | Con scope; vista previa primero |
| Gestionar activos, existencias y asignaciones (`inventario:gestionar`, CAR-236) | Sí | Sí | No | No | Con scope |

Alcance de filas: el catálogo de tipos es de toda la empresa. El alcance por instalación del supervisor se aplica a asignaciones (CAR-238).

## 8. Eventos

`inventario.tipo.creado`, `inventario.tipo.actualizado`. Silencio por defecto (ADR-020): nadie recibe avisos.

## 9. Referente

No hay capa de inventario en [`REFERENTES-saas.md`](../REFERENTES-saas.md). Se sigue **Rippling (inventario de equipos asignados a empleados)** para la asignación a la persona con historial y la devolución al salir, y **Snipe-IT** para el catálogo: categorías con campos propios por tipo, activos por unidad y artículos por existencias. Se aparta en que la ropa se controla por talla ligada al uniforme de Personas (regla del rubro).

## Historial

- 14-nov-2026: primera versión (Sesión Inventario).
