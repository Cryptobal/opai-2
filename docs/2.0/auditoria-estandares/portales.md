# Portales — auditoría contra Connecteam · Deputy (trabajador) y ServiceTitan · HubSpot (cliente)

**Recomendación: completar.** La base de acceso es correcta. A los portales les falta contenido.

## Qué hace hoy

- **Portal del trabajador** (`apps/web/app/(trabajador)/`): inicio, marcar, mis datos, privacidad, notificaciones, cambiar PIN, mi rostro y novedades. Capacidades `portal_trabajador.mis_datos.*`, `arco.*`, `preferencias_notificacion.*`, `privacidad.obtener`.
- **Portal del cliente** (`apps/web/app/(cliente)/`): inicio, cotizaciones (lista y detalle) y novedades. Accesos con alcance completo o limitado para prospectos (`AccesoCliente`, `AccesoPropuesta`, `schema/portal-cliente.prisma`); capacidades `portal_cliente.*` y `cpq.portal_cotizaciones.*`.
- **Portal del supervisor** (`apps/web/app/(supervisor)/`): rendiciones completas, personas e instalaciones a cargo.
- **Acceso por portal** en la membresía, con sesión y alcance aplicados en servidor (`PaginaPortal`, ADR-022, ADR-033).
- La barra del agente en todos los portales es decisión de Carlos del 11-nov.

## Qué hace el referente

Trabajador (Connecteam, Deputy): mis turnos, mis horas, mis documentos y liquidaciones, pedir permisos y cambios de turno, avisos. Cliente (portales de ServiceTitan y HubSpot): ver el servicio prestado, informes, incidentes, documentos, facturas y pedir algo.

## Brechas

| # | Brecha | Evidencia | Gravedad | Recomendación |
|---|---|---|---|---|
| R-1 | **El trabajador no ve sus turnos ni sus documentos, y no puede pedir nada.** El portal permite marcar y ver sus datos. No hay «mis turnos», «mis documentos» (contrato, anexos, liquidaciones) ni solicitudes (permiso, cambio de turno). | Rutas de `(trabajador)`; sin capacidades de turnos ni documentos en `portal_trabajador.*` | Alta | Completar: empezar por «mis turnos» y «mis documentos», que ya existen en Pauta y Documentos. Orden: decisión de Carlos |
| R-2 | **El cliente solo ve cotizaciones.** No hay informes de rondas, novedades de su instalación, facturas ni tickets. | Rutas de `(cliente)`; `portal_cliente.resumen` | Alta | Completar por partes; qué va primero es decisión de Carlos |
| R-3 | **El supervisor no tiene su día en el portal.** Tiene rendiciones, personas e instalaciones; no se encontró pauta del día, rondas ni asistencia de sus instalaciones en rutas propias (puede llegar por la ruta comodín). | Rutas de `(supervisor)`; por verificar | Media, por verificar | Verificar en pantalla con la Sesión Diseño |

## Qué se mantiene tal cual

El modelo de acceso por portal, el alcance en la consulta, el acceso limitado del prospecto y las cotizaciones dentro del Portal Cliente.
