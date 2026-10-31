# Finanzas · Compras y contabilidad — Especificación funcional

**Estado:** borrador para el PR 1 (lo ya decidido por Carlos el 30-oct-2026 se aplica; lo propuesto queda marcado) · **Fase:** 5 (Finanzas) · **Insumos:** `alcance-finanzas.md` §10–§13 y `extraccion-finanzas.md` §8–§10 (fuera del repo, anexos del encargo), diseño aprobado `docs/2.0/diseño/export-finanzas-compras/` (v1), ADR-016, ADR-022, ADR-027, ADR-029, ADR-055 · **Autor:** Claude · **Tarea:** CAR-98 (parte Finanzas)

> Esta especificación cubre el módulo completo y marca qué entra en el PR 1. Los PR 2 y 3 la completan; se aprueban aparte. La hoja de alcance (1.0 como piso) está en el [Brief 23](../briefs/BRIEF-23-finanzas-compras.md).

## 1. Objetivo

Que la empresa sepa **qué compró, a quién, para qué centro de costo y si ya lo pagó**, y que su contabilidad (estado de resultados y balance) salga de lo ya clasificado en vez de armarse a mano. Se nota que funciona cuando los documentos recibidos dejan de quedar sin centro de costo (en 1.0, septiembre: 76 de 76 sin centro) y cuando el balance cuadra siempre (en 1.0 no cuadra).

## 2. Entidades

| Entidad | Qué es | Se relaciona con | Vive en |
|---|---|---|---|
| Cuenta contable | Cuenta del plan de cuentas del tenant: código, tipo, naturaleza, grupo corriente / no corriente, si exige centro de costo, rol contable (`claveSistema`) | Padre (jerarquía); proveedor (cuentas por defecto) | `finanzas` |
| Centro de costo | Una instalación o el general «Administración / Oficina central» | Instalación (núcleo); proveedor; documento recibido | `finanzas` (la fila nace al usarse; la lista sale de las instalaciones) |
| Proveedor | Quien emite los documentos que recibimos: RUT, razón social, plazo de pago, cuenta de gasto y por pagar y centro por defecto | Documentos recibidos | `finanzas` |
| Documento recibido | Línea del libro de compras: DTE 33, 34, 56 o 61 con folio, fechas, montos y centro de costo | Proveedor; centro de costo | `finanzas` |

PR 2 y 3 agregan: movimientos bancarios y conciliación (CAR-97 Banca, CAR-91 Flujo de caja), reglas, períodos, asientos y líneas.

## 3. Pantallas (PR 1)

| Pantalla | Ruta | Patrón | Entrada |
|---|---|---|---|
| 01 Libro de compras | `/finanzas/compras` | Lista | Finanzas › Compras |
| 02 Proveedores (lista y ficha) | `/finanzas/compras/proveedores` y `/[id]` | Lista; ficha | Pestaña de Compras |
| 06 Plan de cuentas | `/finanzas/plan-de-cuentas` | Lista en árbol | Finanzas › Plan de cuentas |
| Configuración › Módulos › Finanzas | `/configuracion/modulos/finanzas` | Secciones del núcleo | Configuración (ADR-018) |

Pendientes de PR posteriores: 03 Conciliación, 04 Editor de reglas, 05 Reglas sugeridas, 07 Asientos y períodos, 08 EERR y balance. **No se construyen** las variantes B sin decidir: umbral de 3 casos (05) y apertura asistida (07B).

## 4. Campos y validaciones

- **Cuenta:** código numérico con puntos (`1.1.05`), único por tenant; nombre 2–120; tipo ∈ activo, pasivo, patrimonio, ingreso, costo, gasto; naturaleza ∈ deudora, acreedora (por defecto la habitual del tipo); grupo ∈ corriente, no corriente, solo en activo y pasivo.
- **Proveedor:** RUT con dígito verificador, único por tenant; plazo de pago 0–365 días (por defecto el ajuste del tenant, 30).
- **Documento recibido:** tipo ∈ 33, 34, 56, 61; folio entero; único por (proveedor, tipo, folio); montos en CLP enteros, 0 a 2.000.000.000; **total = neto + exento + IVA + otros impuestos**. Las notas de crédito (61) se guardan en positivo y **restan** en los totales.

## 5. Reglas de negocio

- **R1.** Los centros de costo son las instalaciones más «Administración / Oficina central» (decisión de Carlos, 30-oct-2026). Un tenant tiene a lo sumo un centro general.
- **R2.** El plan de cuentas se carga desde la plantilla chilena base al activar el módulo y se edita libremente. Cargarla de nuevo no cambia nada.
- **R3.** Las cuentas con rol contable se validan por su rol, no por su nombre: deudores por venta, IVA crédito, PPM y caja/bancos son **activo corriente**; proveedores, IVA débito, remuneraciones e impuestos por pagar son **pasivo corriente**. Guardar una cuenta en otro grupo se rechaza (en 1.0, deudores por venta e IVA débito estaban en el grupo no corriente y el balance no cuadraba).
- **R4.** Solo activos y pasivos llevan grupo. Un activo o pasivo de movimiento sin grupo se rechaza. Una naturaleza distinta de la habitual es un aviso, no un error (contra-cuentas).
- **R5.** El centro de costo de una compra es **obligatorio o sugerido**: si falta, la pantalla muestra «Sin centro de costo» con la sugerencia (primero el defecto del proveedor, después el centro de su última compra). La sugerencia **nunca se asigna sola**. Las reglas de clasificación como origen de sugerencia llegan con el PR 2.
- **R6.** La asignación en lote muestra una vista previa (cuántas cambian, cuántas ya lo tienen, cuántas tienen otro centro) y por defecto **no pisa** un centro ya asignado.
- **R7.** El **estado de pago sale de la conciliación**, no se marca a mano (decisión de Carlos). Hasta que exista la conciliación, el libro muestra «Sin conciliar» en todos los documentos.
- **R8.** El plazo para aceptar o reclamar un DTE recibido es de 8 días corridos desde la recepción (Ley 19.983; **por verificar con el contador**). El libro muestra el plazo; aceptar o reclamar ante el SII queda **pendiente** del adaptador RCV.
- **R9.** La importación en lote es idempotente (clave proveedor + tipo + folio): repetirla no duplica; las filas con error se informan sin frenar las demás.
- **R10.** Los saldos de 1.0 no se copian: al corte se carga un asiento de apertura revisado (PR 3).
- **R11.** Ningún dato de ejemplo de pantallas, tests o seeds usa personas ni clientes reales (se usa «Atlas Seguridad SpA», «Planta Quilicura», «Bodega Lampa», «Torre Apoquindo»).

## 6. Estados

El documento recibido tiene estado de recepción (`pendiente_revision`, `aceptado`, `reclamado`). En el PR 1 todo nace `pendiente_revision` y no hay transición: cambiarlo ante el SII exige credenciales del tenant y el adaptador RCV (PR posterior).

## 7. Permisos por rol

| Acción | owner | admin | gerente | supervisor | viewer | Agente (scope) |
|---|---|---|---|---|---|---|
| Ver compras, proveedores, plan y centros (`finanzas:read`) | sí | sí | **no** | **no** | **no** | `finanzas` |
| Registrar, importar y asignar centro (`finanzas:compras.manage`) | sí | sí | no | no | no | `finanzas` |
| Crear y editar proveedores (`finanzas:proveedores.manage`) | sí | sí | no | no | no | `finanzas` |
| Cargar y editar el plan (`finanzas:plan.manage`) | sí | sí | no | no | no | `finanzas` |

Finanzas es bloqueo financiero (ADR-016): los roles nuevos nacen sin acceso. Sin alcance de filas: los roles con acceso ven todo el tenant. Ninguna acción del PR 1 es irreversible, así que ninguna exige aprobación humana a un agente.

## 8. Eventos

`finanzas.plan.inicializado`, `finanzas.plan.cuenta_creada`, `finanzas.plan.cuenta_actualizada`, `finanzas.proveedor.creado`, `finanzas.proveedor.actualizado`, `finanzas.compra.registrada`, `finanzas.compras.importadas`, `finanzas.compras.centro_asignado`. Silencio por defecto (ADR-020): no hay plantillas de comunicación.

## 9. Herramientas MCP (PR 1)

Lecturas: `finanzas_plan_listar`, `finanzas_centros_costo_listar`, `finanzas_proveedores_listar`, `finanzas_proveedores_obtener`, `finanzas_compras_listar` (con `sinCentroCosto` y la sugerencia). Escrituras, cada una con `preview_…` y `idempotency_key`: `finanzas_plan_inicializar`, `finanzas_plan_crear`, `finanzas_plan_actualizar`, `finanzas_proveedores_crear`, `finanzas_proveedores_actualizar`, `finanzas_compras_registrar`, `finanzas_compras_importar`, `finanzas_compras_asignar_centro`. Plataforma no interviene.

## 10. Configuración

Configuración › Módulos › Finanzas (Configuración 2.0): el PR 1 registra la sección con lo ya diseñado —**plan de cuentas** y **centros de costo**— y el ajuste `plazo_pago_defecto_dias`. El diseño de las demás pantallas de ajustes (umbral de reglas sugeridas, entre otras) falta y no se inventa.

## 11. Fuera de alcance del PR 1 y por qué

- Recepción automática por RCV, aceptar/reclamar y F29: requieren credenciales del tenant ante el SII; el adaptador queda en un PR posterior.
- Conciliación, reglas y estado de pago derivado: dependen de Banca (CAR-97) y Flujo de caja (CAR-91), que no están en `main`.
- Asientos automáticos, períodos, EERR y balance: PR 2 y PR 3.
- Variantes B (umbral de 3 casos y apertura asistida): sin decisión de Carlos.
- Lecturas auditadas (NÚCLEO-H): un proveedor persona natural (honorarios) trae RUT, correo y teléfono, así que `proveedores.listar`, `proveedores.obtener` y `compras.listar` auditan los ids de proveedores revelados. El plan de cuentas y los centros de costo son catálogos y no se auditan.
