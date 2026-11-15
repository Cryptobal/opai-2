# Comercial (CRM y CPQ) — auditoría contra HubSpot · Salesforce · Pipedrive

**Recomendación: mantener.** No hay motivo para rehacer Comercial. El modelo de datos y el flujo ya siguen al referente. Quedan cuatro mejoras medias.

## Qué hace hoy

- **Objetos estándar con asociaciones**: cuenta, contacto, negocio, solicitud, cotización y actividad. Un contacto puede estar en varias cuentas (`ContactoCuenta`, `schema/crm.prisma`) y un negocio tener varios contactos e instalaciones (`NegocioContacto`, `NegocioInstalacion`, `schema/comercial.prisma`).
- **Embudo con etapas configurables**: orden, tipo (abierta, ganada, perdida), probabilidad y campos exigidos al entrar (`Etapa.exige`). Capacidades `comercial.config.*` y `comercial.negocios.mover`.
- **Tablero por etapa** en pantalla: `apps/web/app/(erp)/negocios/_componentes/tablero/`; capacidad `comercial.negocios.embudo`.
- **Motivo de pérdida** obligatorio y con informe (`MotivoPerdida`, `comercial.informes.perdidos_por_motivo`); ganar, perder y reabrir como acciones propias con historial (`HistorialEtapa`).
- **Línea de tiempo única** de actividades y tareas (`core.actividades.timeline`) y **correos del cliente archivados** en la ficha (`CorreoCliente`, `BuzonCorreo`).
- **Entrada de solicitudes** por formulario web y correo, con detección de duplicadas y conversión a negocio o cotización (`comercial.solicitudes.*`).
- **Seguimiento automático por planes** con pasos y versiones (`PlanSeguimiento`, `comercial.seguimientos.*`).
- **Cotización (CPQ)** con versiones, secciones, líneas, aprobación por margen (`CpqAprobacion`), envío y propuesta técnica, visible en el Portal Cliente (`schema/cpq.prisma`, `modules/cpq/`).
- **Informes** de tablero (con monto ponderado), cierre y pérdidas: `packages/capabilities/src/comercial/informes-*.ts`.
- **Importación** con vista previa, permiso propio y reversión por lote (`core.importar.*`, `comercial.importar_1_0`).
- **Etiquetas** y exportación a Excel (`comercial.negocios.exportar`).

## Qué hace el referente

HubSpot y Salesforce: objetos asociados, embudos con reglas por etapa, propiedades a medida, captura automática de actividad, cotización con aprobación, pronóstico, vistas guardadas y fusión de duplicados. Pipedrive: el tablero como vista principal.

## Brechas

| # | Brecha | Evidencia | Gravedad | Recomendación |
|---|---|---|---|---|
| C-1 | **Propiedades a medida.** Los campos de cuenta, contacto y negocio salen de un catálogo en código (`packages/domain/src/campos/catalogo-*.ts`); una empresa no puede agregar un campo propio. | `core.campos.catalogo`, `core.campos.valores` | Media | Ajustar: campos definidos por empresa sobre el mismo catálogo |
| C-2 | **Vistas guardadas.** Los filtros viven en la dirección de la página; no se encontró guardar una vista ni compartirla. | Sin capacidades `*.vistas.*` | Media | Ajustar: patrón del Núcleo para todas las listas, no solo Comercial |
| C-3 | **Fusión de duplicados.** Se detectan solicitudes duplicadas, pero no se encontró fusionar dos cuentas o dos contactos. | `comercial.solicitudes.buscar_duplicadas`; sin capacidades de fusión | Media | Ajustar: fusión con vista previa y reversión |
| C-4 | **Un solo embudo.** El modelo admite más de uno (`Embudo.porDefecto`), pero el segundo solo se puede crear por siembra: las capacidades `comercial.config.*` manejan las etapas del embudo por defecto. | `packages/capabilities/src/comercial/`, `packages/db/src/catalogo-comercial.ts` | Media | Ajustar cuando entre la segunda vertical |

## Qué se mantiene tal cual

Todo lo descrito arriba. El ciclo solicitud → negocio → cotización → aprobación → envío → ganar es el del referente, y además corre igual por MCP.

## Si se rehiciera

No se recomienda. Se perderían la importación de Gard ya hecha, el seguimiento por planes y la integración con CPQ y Portal Cliente, sin ganar nada que las cuatro mejoras no entreguen.
