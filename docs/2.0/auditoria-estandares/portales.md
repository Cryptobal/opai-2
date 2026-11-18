# Portales — auditoría contra Connecteam · Deputy (trabajador) y ServiceTitan · HubSpot (cliente)

**Recomendación: completar.** La base de acceso es correcta. A los portales les falta contenido.

## Qué hace hoy

- **Portal del trabajador** (`apps/web/app/(trabajador)/`): inicio, marcar, mis datos, privacidad, notificaciones, cambiar PIN y mi rostro (más las novedades del producto). Capacidades `portal_trabajador.mis_datos.*`, `arco.*`, `preferencias_notificacion.*`, `privacidad.obtener`.
- **Portal del cliente** (`apps/web/app/(cliente)/`): inicio y cotizaciones (lista y detalle), más las novedades del producto. El inicio (`portal_cliente.resumen.leer`) ya trae una tarjeta por instalación con secciones de cobertura, rondas y novedades, todas «pendiente»: el andamiaje y la configuración por cuenta existen, sin datos conectados (`SECCIONES_CON_DATOS` vacío en `packages/domain/src/portal-cliente.ts`). Accesos con alcance completo o limitado para prospectos (`AccesoCliente`, `AccesoPropuesta`, `schema/portal-cliente.prisma`); capacidades `portal_cliente.*` y `cpq.portal_cotizaciones.*`.
- **Portal del supervisor** (`apps/web/app/(supervisor)/`): rendiciones completas, personas e instalaciones a cargo.
- **Acceso por portal** en la membresía, con sesión y alcance aplicados en servidor (`PaginaPortal`, ADR-022, ADR-033).
- La barra del agente en todos los portales es decisión de Carlos del 11-nov.

## Qué hace el referente

Trabajador (Connecteam, Deputy): mis turnos, mis horas, mis documentos y liquidaciones, pedir permisos y cambios de turno, avisos. Cliente (portales de ServiceTitan y HubSpot): ver el servicio prestado, informes, incidentes, documentos, facturas y pedir algo.

## Brechas

| # | Brecha | Evidencia | Gravedad | Recomendación |
|---|---|---|---|---|
| R-1 | **El trabajador no ve sus turnos ni sus documentos, y no puede pedir nada.** El portal permite marcar y ver sus datos. No hay «mis turnos», «mis documentos» (contrato, anexos, liquidaciones) ni solicitudes (permiso, cambio de turno). | Rutas de `(trabajador)`; la ruta comodín responde 404. Hay capacidades ya habilitadas para este portal sin pantalla allí (`asistencia.dias.listar`, `asistencia.correcciones.responder`, `core.firmas.firmar`) | Alta | Completar: empezar por «mis turnos» y «mis documentos», que ya existen en Pauta y Documentos. Orden: decisión de Carlos |
| R-2 | **El cliente solo ve cotizaciones.** Las secciones de servicio de su instalación están dibujadas pero vacías; no hay facturas ni tickets. | Rutas de `(cliente)`; `portal_cliente.resumen.leer`; `packages/domain/src/portal-cliente.ts` | Alta | Completar por partes; qué va primero es decisión de Carlos |
| R-3 | **El supervisor no tiene su día en el portal.** Tiene rendiciones, personas e instalaciones; no tiene pauta del día, rondas ni asistencia de sus instalaciones; el único módulo con navegación en este portal es Rendiciones. | Rutas de `(supervisor)`; la ruta comodín responde 404 | Media | Completar junto con R-1: llevar al portal lo que el supervisor ya puede ver en el ERP |

## Estado al 16-nov-2026

Repaso semanal contra `main` en `886e262` (CAR-586). Las dos altas avanzaron: la del trabajador quedó a un paso y la del cliente está en PR.

| # | Estado | Qué cambió y dónde se comprueba |
|---|---|---|
| R-1 | Parcial | Integrado: «Mi pauta» (CAR-462, #813: `portal_trabajador.mis_turnos.listar`) y «Mis documentos» (CAR-463, #820: `portal_trabajador.mis_documentos.listar` y `descargar`, con visibilidad que falla cerrada). Falta pedir permisos y vacaciones, y su aprobación por la jefatura (CAR-464 y CAR-508; #846 y #851, abiertos) |
| R-2 | En curso | En `main` el cliente sigue viendo cotizaciones y el resumen. Carlos ya decidió qué ve (CAR-514). En PR, todos abiertos: cobertura (#827), rondas (#833), novedades (#838 y #860), facturas (#863), tickets (#881) y accesos (#941 a #943) |
| R-3 | Abierta | Sin cambios |

## Qué se mantiene tal cual

El modelo de acceso por portal, el alcance en la consulta, el acceso limitado del prospecto y las cotizaciones dentro del Portal Cliente.
