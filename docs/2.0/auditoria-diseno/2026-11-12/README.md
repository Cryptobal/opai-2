# Auditoría de diseño Hilo · 12-nov-2026

**Encargo:** Sesión Diseño, CAR-334 · **Reglas:** [DISENO-hilo.md](../../DISENO-hilo.md) · **Empresa:** `qa-e2e` (ficticia; nunca Gard) · **Vista previa:** PR #584, commit `ae08450` · **Anchos:** 1440 y 390 px · **Marco:** Hilo en el ERP; Cliente, Guardia y Terreno aún usan el clásico (etapa H5).

Las capturas están en esta carpeta por portal (`erp/`, `cliente/`, `guardia/`, `terreno/`, `publico/`), en WebP, recortadas a 5.000 px de alto. `informe.json` trae las mediciones automáticas de cada pantalla (R1 primarios, R2 acciones repetidas, R5 fechas, R9 área táctil, R10 desborde, R11 axe, errores de consola). La regeneran el spec `apps/web/e2e/auditoria-diseno.spec.ts` y el workflow `auditoria-diseno` (etiqueta del PR).

## Resumen

| | |
|---|---|
| Rutas recorridas | 169 · 306 mediciones (pantalla × ancho) |
| Capturas | 276 |
| Desbordes horizontales, textos en inglés, errores de consola, HTTP ≥ 400 | 0 |
| Vistas con más de un botón principal (R1) | 33 |
| Vistas con acciones repetidas (R2) | 27 |
| Violaciones serias de axe (R11) | 10 vistas |
| Fichas `[id]` sin registro en `qa-e2e` | 34 (ver CAR-372) |

## Hallazgos (Linear, proyecto «21 · Diseño y experiencia»)

| Issue | Prioridad | Tipo | Qué |
|---|---|---|---|
| CAR-347 | Alta | Transversal (corregido en PR #590) | Guardia sin sesión caía en el ingreso con correo; `/cliente/login` decía «Próximamente» |
| CAR-365 | Alta | Personas | La ficha de cargo da error en escritorio |
| CAR-366 | Alta | Núcleo | Comunicaciones › evento no abre en 75 s; tabla apretada en el teléfono |
| CAR-372 | Alta (auditoría) | Datos de prueba | `qa-e2e` sin instalaciones, negocios ni PIN: Guardia y Terreno sin revisar por dentro |
| CAR-360 | Media | Transversal | Dos primarios para «crear» (estado vacío y fichas con vista dividida) |
| CAR-361 | Media | Transversal | Avisos informativos en azul dentro de Hilo |
| CAR-362 | Media | Transversal | Secciones en tarjetas con borde («líneas, no tarjetas») |
| CAR-363 | Media | Transversal | En el teléfono la cabecera dice el área y la página otro título |
| CAR-367 | Media | Núcleo | Integración con 6 «Guardar» principales; título cortado |
| CAR-368 | Media | Comercial, Rendiciones, Personas | Fechas fuera del formato chileno (campos nativos, `2026-11-12`) |
| CAR-369 | Media | Núcleo, Operaciones | Índigo del agente en novedades y patrones |
| CAR-370 | Media | Finanzas, Remuneraciones | Dos primarios para emitir; pestañas en píldora |
| CAR-364 | Baja | Transversal | Zonas con scroll sin foco de teclado; etiqueta faltante en Importar |
| CAR-371 | Baja | Comercial | Cuatro botones arriba en Negocios (teléfono); pestañas cortadas |

## Experiencia en tareas clave

Medición de clics y pantallas (antes y después) para emitir una factura, cotizar, marcar asistencia y hacer una ronda: **pendiente**. En `qa-e2e` no hay negocio, instalación, persona con PIN ni equipo emparejado para recorrer esas tareas de punta a punta (CAR-372). Se mide en la próxima corrida, con los datos ficticios sembrados en la rama de la vista previa.

## Índice por portal y módulo

### ERP (marco Hilo)

| Módulo | Ruta | 1440 | 390 | Observaciones automáticas |
|---|---|---|---|---|
| agente | `/agente/historial` | [ver](erp/agente__historial-1440.webp) | [ver](erp/agente__historial-390.webp) |  |
| asistencia | `/asistencia` | [ver](erp/asistencia-1440.webp) | [ver](erp/asistencia-390.webp) |  |
| bandeja | `/bandeja` | [ver](erp/bandeja-1440.webp) | [ver](erp/bandeja-390.webp) |  |
| cargos | `/cargos` | [ver](erp/cargos-1440.webp) | [ver](erp/cargos-390.webp) |  |
| cargos | `/cargos/[id]` | [ver](erp/cargos___id-1440.webp) | [ver](erp/cargos___id-390.webp) | R1: 2 primarios |
| configuracion | `/configuracion` | [ver](erp/configuracion-1440.webp) | [ver](erp/configuracion-390.webp) |  |
| configuracion | `/configuracion/agentes` | [ver](erp/configuracion__agentes-1440.webp) | [ver](erp/configuracion__agentes-390.webp) |  |
| configuracion | `/configuracion/agentes/[id]` | — | — | sin registro para abrir; sin registro para abrir |
| configuracion | `/configuracion/agentes/conectar` | [ver](erp/configuracion__agentes__conectar-1440.webp) | [ver](erp/configuracion__agentes__conectar-390.webp) | R2: Copiar ×2; R11: scrollable-region-focusable; R2: Copiar ×2; R11: scrollable-region-focusable |
| configuracion | `/configuracion/api-keys` | [ver](erp/configuracion__api-keys-1440.webp) | [ver](erp/configuracion__api-keys-390.webp) | redirigió a /configuracion/agentes; redirigió a /configuracion/agentes |
| configuracion | `/configuracion/aprobaciones` | [ver](erp/configuracion__aprobaciones-1440.webp) | [ver](erp/configuracion__aprobaciones-390.webp) |  |
| configuracion | `/configuracion/auditoria` | [ver](erp/configuracion__auditoria-1440.webp) | [ver](erp/configuracion__auditoria-390.webp) |  |
| configuracion | `/configuracion/calendario` | [ver](erp/configuracion__calendario-1440.webp) | [ver](erp/configuracion__calendario-390.webp) | R11: scrollable-region-focusable; R11: scrollable-region-focusable |
| configuracion | `/configuracion/comunicaciones` | [ver](erp/configuracion__comunicaciones-1440.webp) | [ver](erp/configuracion__comunicaciones-390.webp) | R2: Correo: activo ×19, Correo: apagado ×14; R2: Correo: activo ×19, Correo: apagado ×14 |
| configuracion | `/configuracion/comunicaciones/[evento]` | [ver](erp/configuracion__comunicaciones___evento-1440.webp) | [ver](erp/configuracion__comunicaciones___evento-390.webp) | falló: Error: tope de 75000 ms; falló: Error: tope de 75000 ms; R9: 4 <44 px |
| configuracion | `/configuracion/consumos` | [ver](erp/configuracion__consumos-1440.webp) | [ver](erp/configuracion__consumos-390.webp) | R11: scrollable-region-focusable |
| configuracion | `/configuracion/correos-clientes` | [ver](erp/configuracion__correos-clientes-1440.webp) | [ver](erp/configuracion__correos-clientes-390.webp) |  |
| configuracion | `/configuracion/cumplimiento` | [ver](erp/configuracion__cumplimiento-1440.webp) | [ver](erp/configuracion__cumplimiento-390.webp) |  |
| configuracion | `/configuracion/cumplimiento/incidentes` | [ver](erp/configuracion__cumplimiento__incidentes-1440.webp) | [ver](erp/configuracion__cumplimiento__incidentes-390.webp) |  |
| configuracion | `/configuracion/cumplimiento/retencion` | [ver](erp/configuracion__cumplimiento__retencion-1440.webp) | [ver](erp/configuracion__cumplimiento__retencion-390.webp) |  |
| configuracion | `/configuracion/cumplimiento/solicitudes` | [ver](erp/configuracion__cumplimiento__solicitudes-1440.webp) | [ver](erp/configuracion__cumplimiento__solicitudes-390.webp) |  |
| configuracion | `/configuracion/documentos` | [ver](erp/configuracion__documentos-1440.webp) | [ver](erp/configuracion__documentos-390.webp) |  |
| configuracion | `/configuracion/empresa` | [ver](erp/configuracion__empresa-1440.webp) | [ver](erp/configuracion__empresa-390.webp) |  |
| configuracion | `/configuracion/grupo/[id]` | [ver](erp/configuracion__grupo___id-1440.webp) | [ver](erp/configuracion__grupo___id-390.webp) |  |
| configuracion | `/configuracion/grupo/agentes/agente-interno` | [ver](erp/configuracion__grupo__agentes__agente-interno-1440.webp) | [ver](erp/configuracion__grupo__agentes__agente-interno-390.webp) |  |
| configuracion | `/configuracion/importar` | [ver](erp/configuracion__importar-1440.webp) | [ver](erp/configuracion__importar-390.webp) | R9: 1 <44 px; R11: label |
| configuracion | `/configuracion/integraciones` | [ver](erp/configuracion__integraciones-1440.webp) | [ver](erp/configuracion__integraciones-390.webp) |  |
| configuracion | `/configuracion/integraciones/[proveedor]` | [ver](erp/configuracion__integraciones___proveedor-1440.webp) | [ver](erp/configuracion__integraciones___proveedor-390.webp) | R1: 6 primarios; R2: Mostrar ×5, Guardar ×5; R1: 6 primarios; R2: Mostrar ×5, Guardar ×5 |
| configuracion | `/configuracion/integraciones/slack` | [ver](erp/configuracion__integraciones__slack-1440.webp) | [ver](erp/configuracion__integraciones__slack-390.webp) |  |
| configuracion | `/configuracion/marca` | [ver](erp/configuracion__marca-1440.webp) | [ver](erp/configuracion__marca-390.webp) |  |
| configuracion | `/configuracion/modulo/[id]` | — | — | sin registro para abrir; sin registro para abrir |
| configuracion | `/configuracion/modulos` | [ver](erp/configuracion__modulos-1440.webp) | [ver](erp/configuracion__modulos-390.webp) | R11: scrollable-region-focusable |
| configuracion | `/configuracion/no-encontrado` | [ver](erp/configuracion__no-encontrado-1440.webp) | [ver](erp/configuracion__no-encontrado-390.webp) |  |
| configuracion | `/configuracion/operaciones` | [ver](erp/configuracion__operaciones-1440.webp) | [ver](erp/configuracion__operaciones-390.webp) |  |
| configuracion | `/configuracion/preferencias` | [ver](erp/configuracion__preferencias-1440.webp) | [ver](erp/configuracion__preferencias-390.webp) | redirigió a /mi-cuenta/preferencias; redirigió a /mi-cuenta/preferencias |
| configuracion | `/configuracion/remuneraciones` | [ver](erp/configuracion__remuneraciones-1440.webp) | [ver](erp/configuracion__remuneraciones-390.webp) | R2: Ver detalle ×11; R2: Ver detalle ×11 |
| configuracion | `/configuracion/usuarios` | [ver](erp/configuracion__usuarios-1440.webp) | [ver](erp/configuracion__usuarios-390.webp) |  |
| configuracion | `/configuracion/usuarios/grupos` | [ver](erp/configuracion__usuarios__grupos-1440.webp) | [ver](erp/configuracion__usuarios__grupos-390.webp) | R1: 2 primarios; R2: Nuevo grupo ×2; R1: 2 primarios; R2: Nuevo grupo ×2 |
| configuracion | `/configuracion/usuarios/roles` | [ver](erp/configuracion__usuarios__roles-1440.webp) | [ver](erp/configuracion__usuarios__roles-390.webp) | R1: 2 primarios; R2: Nuevo rol ×2; R1: 2 primarios; R2: Nuevo rol ×2 |
| contactos | `/contactos` | [ver](erp/contactos-1440.webp) | [ver](erp/contactos-390.webp) |  |
| contactos | `/contactos/[id]` | [ver](erp/contactos___id-1440.webp) | [ver](erp/contactos___id-390.webp) | R1: 2 primarios; R1: 2 primarios |
| cotizaciones | `/cotizaciones` | [ver](erp/cotizaciones-1440.webp) | [ver](erp/cotizaciones-390.webp) | R1: 2 primarios; R2: Nueva cotización ×2 |
| cotizaciones | `/cotizaciones/[id]` | — | — | sin registro para abrir; sin registro para abrir |
| cotizaciones | `/cotizaciones/[id]/propuesta-tecnica` | — | — | sin registro para abrir; sin registro para abrir |
| cotizaciones | `/cotizaciones/nueva` | [ver](erp/cotizaciones__nueva-1440.webp) | [ver](erp/cotizaciones__nueva-390.webp) |  |
| cpq | `/cpq/biblioteca` | [ver](erp/cpq__biblioteca-1440.webp) | [ver](erp/cpq__biblioteca-390.webp) |  |
| cuentas | `/cuentas` | [ver](erp/cuentas-1440.webp) | [ver](erp/cuentas-390.webp) |  |
| cuentas | `/cuentas/[id]` | [ver](erp/cuentas___id-1440.webp) | [ver](erp/cuentas___id-390.webp) | R1: 2 primarios |
| cuentas | `/cuentas/[id]/actividad` | [ver](erp/cuentas___id___actividad-1440.webp) | [ver](erp/cuentas___id___actividad-390.webp) | R1: 3 primarios |
| cuentas | `/cuentas/[id]/contactos` | [ver](erp/cuentas___id___contactos-1440.webp) | [ver](erp/cuentas___id___contactos-390.webp) | R1: 3 primarios |
| cuentas | `/cuentas/[id]/documentos` | [ver](erp/cuentas___id___documentos-1440.webp) | [ver](erp/cuentas___id___documentos-390.webp) | R1: 4 primarios; R2: Subir documento ×2; R1: 2 primarios; R2: Subir documento ×2 |
| cuentas | `/cuentas/[id]/generar-documento` | [ver](erp/cuentas___id___generar-documento-1440.webp) | [ver](erp/cuentas___id___generar-documento-390.webp) |  |
| cuentas | `/cuentas/[id]/instalaciones` | [ver](erp/cuentas___id___instalaciones-1440.webp) | [ver](erp/cuentas___id___instalaciones-390.webp) | R1: 3 primarios |
| cuentas | `/cuentas/[id]/negocios` | [ver](erp/cuentas___id___negocios-1440.webp) | [ver](erp/cuentas___id___negocios-390.webp) | R1: 2 primarios |
| cuentas | `/cuentas/[id]/portal` | [ver](erp/cuentas___id___portal-1440.webp) | [ver](erp/cuentas___id___portal-390.webp) | R1: 3 primarios |
| desempeno | `/desempeno` | [ver](erp/desempeno-1440.webp) | [ver](erp/desempeno-390.webp) |  |
| desempeno | `/desempeno/cargos/[id]` | [ver](erp/desempeno__cargos___id-1440.webp) | [ver](erp/desempeno__cargos___id-390.webp) |  |
| desempeno | `/desempeno/indicadores` | [ver](erp/desempeno__indicadores-1440.webp) | [ver](erp/desempeno__indicadores-390.webp) |  |
| desempeno | `/desempeno/personas/[id]` | — | — | sin registro para abrir; sin registro para abrir |
| documentos | `/documentos` | [ver](erp/documentos-1440.webp) | [ver](erp/documentos-390.webp) | R1: 2 primarios; R2: Subir documento ×2; R1: 2 primarios; R2: Subir documento ×2 |
| documentos | `/documentos/firmas` | [ver](erp/documentos__firmas-1440.webp) | [ver](erp/documentos__firmas-390.webp) |  |
| documentos | `/documentos/firmas/[id]` | — | — | sin registro para abrir; sin registro para abrir |
| documentos | `/documentos/plantillas` | [ver](erp/documentos__plantillas-1440.webp) | [ver](erp/documentos__plantillas-390.webp) |  |
| documentos | `/documentos/plantillas/[id]` | [ver](erp/documentos__plantillas___id-1440.webp) | [ver](erp/documentos__plantillas___id-390.webp) | R11: scrollable-region-focusable |
| documentos | `/documentos/vencimientos` | [ver](erp/documentos__vencimientos-1440.webp) | [ver](erp/documentos__vencimientos-390.webp) |  |
| finanzas | `/finanzas` | [ver](erp/finanzas-1440.webp) | [ver](erp/finanzas-390.webp) |  |
| finanzas | `/finanzas/bancos` | [ver](erp/finanzas__bancos-1440.webp) | [ver](erp/finanzas__bancos-390.webp) |  |
| finanzas | `/finanzas/bancos/reglas` | [ver](erp/finanzas__bancos__reglas-1440.webp) | [ver](erp/finanzas__bancos__reglas-390.webp) | R1: 2 primarios; R2: Nueva regla ×2; R1: 2 primarios; R2: Nueva regla ×2 |
| finanzas | `/finanzas/cobranza` | [ver](erp/finanzas__cobranza-1440.webp) | [ver](erp/finanzas__cobranza-390.webp) |  |
| finanzas | `/finanzas/cobranza/[cuentaId]` | [ver](erp/finanzas__cobranza___cuentaId-1440.webp) | [ver](erp/finanzas__cobranza___cuentaId-390.webp) |  |
| finanzas | `/finanzas/compras` | [ver](erp/finanzas__compras-1440.webp) | [ver](erp/finanzas__compras-390.webp) |  |
| finanzas | `/finanzas/compras/proveedores` | [ver](erp/finanzas__compras__proveedores-1440.webp) | [ver](erp/finanzas__compras__proveedores-390.webp) |  |
| finanzas | `/finanzas/compras/proveedores/[id]` | — | — | sin registro para abrir; sin registro para abrir |
| finanzas | `/finanzas/configuracion-dte` | [ver](erp/finanzas__configuracion-dte-1440.webp) | [ver](erp/finanzas__configuracion-dte-390.webp) |  |
| finanzas | `/finanzas/flujo` | [ver](erp/finanzas__flujo-1440.webp) | [ver](erp/finanzas__flujo-390.webp) | R9: 12 <44 px |
| finanzas | `/finanzas/folios` | [ver](erp/finanzas__folios-1440.webp) | [ver](erp/finanzas__folios-390.webp) |  |
| finanzas | `/finanzas/plan-de-cuentas` | [ver](erp/finanzas__plan-de-cuentas-1440.webp) | [ver](erp/finanzas__plan-de-cuentas-390.webp) | redirigió a /configuracion/modulo/finanzas; redirigió a /configuracion/modulo/finanzas |
| finanzas | `/finanzas/ventas` | [ver](erp/finanzas__ventas-1440.webp) | [ver](erp/finanzas__ventas-390.webp) |  |
| finanzas | `/finanzas/ventas/[id]` | [ver](erp/finanzas__ventas___id-1440.webp) | [ver](erp/finanzas__ventas___id-390.webp) | R1: 2 primarios |
| finanzas | `/finanzas/ventas/nuevo` | [ver](erp/finanzas__ventas__nuevo-1440.webp) | [ver](erp/finanzas__ventas__nuevo-390.webp) |  |
| finanzas | `/finanzas/ventas/programacion` | [ver](erp/finanzas__ventas__programacion-1440.webp) | [ver](erp/finanzas__ventas__programacion-390.webp) |  |
| finanzas | `/finanzas/ventas/programacion/[id]` | — | — | sin registro para abrir; sin registro para abrir |
| finanzas | `/finanzas/ventas/programacion/[id]/editar` | — | — | sin registro para abrir; sin registro para abrir |
| finanzas | `/finanzas/ventas/programacion/cierre` | [ver](erp/finanzas__ventas__programacion__cierre-1440.webp) | [ver](erp/finanzas__ventas__programacion__cierre-390.webp) |  |
| finanzas | `/finanzas/ventas/programacion/nueva` | [ver](erp/finanzas__ventas__programacion__nueva-1440.webp) | [ver](erp/finanzas__ventas__programacion__nueva-390.webp) | R2: Abrir calendario ×2; R2: Abrir calendario ×2 |
| inicio | `/` | [ver](erp/inicio-1440.webp) | [ver](erp/inicio-390.webp) |  |
| instalaciones | `/instalaciones` | [ver](erp/instalaciones-1440.webp) | [ver](erp/instalaciones-390.webp) | R1: 2 primarios; R2: Nueva ×2; R1: 2 primarios; R2: Nueva ×2 |
| instalaciones | `/instalaciones/[id]` | — | — | sin registro para abrir; sin registro para abrir |
| instalaciones | `/instalaciones/[id]/actividad` | — | — | sin registro para abrir; sin registro para abrir |
| instalaciones | `/instalaciones/[id]/dispositivos` | — | — | sin registro para abrir; sin registro para abrir |
| instalaciones | `/instalaciones/[id]/documentos` | — | — | sin registro para abrir; sin registro para abrir |
| instalaciones | `/instalaciones/[id]/generar-documento` | — | — | sin registro para abrir; sin registro para abrir |
| instalaciones | `/instalaciones/[id]/negocios` | — | — | sin registro para abrir; sin registro para abrir |
| instalaciones | `/instalaciones/[id]/puestos` | — | — | sin registro para abrir; sin registro para abrir |
| instalaciones | `/instalaciones/[id]/rondas` | — | — | sin registro para abrir; sin registro para abrir |
| instalaciones | `/instalaciones/[id]/sueldo` | — | — | sin registro para abrir; sin registro para abrir |
| instalaciones | `/instalaciones/nueva` | [ver](erp/instalaciones__nueva-1440.webp) | [ver](erp/instalaciones__nueva-390.webp) | R2: Abrir calendario ×2; R2: Abrir calendario ×2 |
| mi-cuenta | `/mi-cuenta` | [ver](erp/mi-cuenta-1440.webp) | [ver](erp/mi-cuenta-390.webp) |  |
| mi-cuenta | `/mi-cuenta/preferencias` | [ver](erp/mi-cuenta__preferencias-1440.webp) | [ver](erp/mi-cuenta__preferencias-390.webp) |  |
| negocios | `/negocios` | [ver](erp/negocios-1440.webp) | [ver](erp/negocios-390.webp) | R11: scrollable-region-focusable; R11: scrollable-region-focusable |
| negocios | `/negocios/[id]` | — | — | sin registro para abrir; sin registro para abrir |
| negocios | `/negocios/[id]/actividad` | — | — | sin registro para abrir; sin registro para abrir |
| negocios | `/negocios/[id]/cotizaciones` | — | — | sin registro para abrir; sin registro para abrir |
| negocios | `/negocios/[id]/documentos` | — | — | sin registro para abrir; sin registro para abrir |
| negocios | `/negocios/[id]/seguimiento` | — | — | sin registro para abrir; sin registro para abrir |
| negocios | `/negocios/reportes` | [ver](erp/negocios__reportes-1440.webp) | [ver](erp/negocios__reportes-390.webp) |  |
| negocios | `/negocios/seguimiento` | [ver](erp/negocios__seguimiento-1440.webp) | [ver](erp/negocios__seguimiento-390.webp) |  |
| novedades | `/novedades` | [ver](erp/novedades-1440.webp) | [ver](erp/novedades-390.webp) | R2: Marcar como leída ×3 |
| pauta | `/pauta` | [ver](erp/pauta-1440.webp) | [ver](erp/pauta-390.webp) |  |
| personas | `/personas` | [ver](erp/personas-1440.webp) | [ver](erp/personas-390.webp) |  |
| personas | `/personas/[id]` | [ver](erp/personas___id-1440.webp) | [ver](erp/personas___id-390.webp) | R1: 2 primarios |
| personas | `/personas/[id]/actividad` | [ver](erp/personas___id___actividad-1440.webp) | [ver](erp/personas___id___actividad-390.webp) | R1: 2 primarios |
| personas | `/personas/[id]/anexos` | [ver](erp/personas___id___anexos-1440.webp) | [ver](erp/personas___id___anexos-390.webp) |  |
| personas | `/personas/[id]/anexos/[anexoId]` | — | — | sin registro para abrir; sin registro para abrir |
| personas | `/personas/[id]/documentos` | [ver](erp/personas___id___documentos-1440.webp) | [ver](erp/personas___id___documentos-390.webp) | R1: 3 primarios |
| personas | `/personas/[id]/generar-documento` | [ver](erp/personas___id___generar-documento-1440.webp) | [ver](erp/personas___id___generar-documento-390.webp) |  |
| personas | `/personas/[id]/laboral` | [ver](erp/personas___id___laboral-1440.webp) | [ver](erp/personas___id___laboral-390.webp) | R1: 2 primarios |
| personas | `/personas/[id]/privacidad` | [ver](erp/personas___id___privacidad-1440.webp) | [ver](erp/personas___id___privacidad-390.webp) | R1: 2 primarios |
| personas | `/personas/[id]/sueldo` | [ver](erp/personas___id___sueldo-1440.webp) | [ver](erp/personas___id___sueldo-390.webp) | R1: 3 primarios; R5: 2026-11-12; R5: 2026-11-12 |
| personas | `/personas/vencimientos` | [ver](erp/personas__vencimientos-1440.webp) | [ver](erp/personas__vencimientos-390.webp) |  |
| remuneraciones | `/remuneraciones` | [ver](erp/remuneraciones-1440.webp) | [ver](erp/remuneraciones-390.webp) |  |
| remuneraciones | `/remuneraciones/[id]` | — | — | sin registro para abrir; sin registro para abrir |
| remuneraciones | `/remuneraciones/calendario` | [ver](erp/remuneraciones__calendario-1440.webp) | [ver](erp/remuneraciones__calendario-390.webp) |  |
| remuneraciones | `/remuneraciones/novedades` | [ver](erp/remuneraciones__novedades-1440.webp) | [ver](erp/remuneraciones__novedades-390.webp) |  |
| rendiciones | `/rendiciones` | [ver](erp/rendiciones-1440.webp) | [ver](erp/rendiciones-390.webp) |  |
| rendiciones | `/rendiciones/[id]` | — | — | sin registro para abrir; sin registro para abrir |
| rendiciones | `/rendiciones/[id]/corregir` | — | — | sin registro para abrir; sin registro para abrir |
| rendiciones | `/rendiciones/aprobadas` | [ver](erp/rendiciones__aprobadas-1440.webp) | [ver](erp/rendiciones__aprobadas-390.webp) |  |
| rendiciones | `/rendiciones/bandeja` | [ver](erp/rendiciones__bandeja-1440.webp) | [ver](erp/rendiciones__bandeja-390.webp) |  |
| rendiciones | `/rendiciones/bandeja/[id]` | — | — | sin registro para abrir; sin registro para abrir |
| rendiciones | `/rendiciones/devueltas` | [ver](erp/rendiciones__devueltas-1440.webp) | [ver](erp/rendiciones__devueltas-390.webp) |  |
| rendiciones | `/rendiciones/enviadas` | [ver](erp/rendiciones__enviadas-1440.webp) | [ver](erp/rendiciones__enviadas-390.webp) |  |
| rendiciones | `/rendiciones/lotes` | [ver](erp/rendiciones__lotes-1440.webp) | [ver](erp/rendiciones__lotes-390.webp) |  |
| rendiciones | `/rendiciones/lotes/[id]` | — | — | sin registro para abrir; sin registro para abrir |
| rendiciones | `/rendiciones/nueva` | [ver](erp/rendiciones__nueva-1440.webp) | [ver](erp/rendiciones__nueva-390.webp) |  |
| rendiciones | `/rendiciones/nueva/compra` | [ver](erp/rendiciones__nueva__compra-1440.webp) | [ver](erp/rendiciones__nueva__compra-390.webp) |  |
| rendiciones | `/rendiciones/nueva/kilometraje` | [ver](erp/rendiciones__nueva__kilometraje-1440.webp) | [ver](erp/rendiciones__nueva__kilometraje-390.webp) |  |
| rendiciones | `/rendiciones/pagadas` | [ver](erp/rendiciones__pagadas-1440.webp) | [ver](erp/rendiciones__pagadas-390.webp) |  |
| rendiciones | `/rendiciones/rechazadas` | [ver](erp/rendiciones__rechazadas-1440.webp) | [ver](erp/rendiciones__rechazadas-390.webp) |  |
| solicitudes | `/solicitudes` | [ver](erp/solicitudes-1440.webp) | [ver](erp/solicitudes-390.webp) | R1: 2 primarios; R1: 2 primarios; R2: Registrar solicitud ×2 |
| solicitudes | `/solicitudes/[id]` | — | — | sin registro para abrir; sin registro para abrir |
| tareas | `/tareas` | [ver](erp/tareas-1440.webp) | [ver](erp/tareas-390.webp) |  |
| tickets | `/tickets` | [ver](erp/tickets-1440.webp) | [ver](erp/tickets-390.webp) |  |
| tickets | `/tickets/[id]` | — | — | sin registro para abrir; sin registro para abrir |

### Portal Cliente

| Módulo | Ruta | 1440 | 390 | Observaciones automáticas |
|---|---|---|---|---|
| cotizaciones | `/cliente/cotizaciones` | [ver](cliente/cliente__cotizaciones-1440.webp) | [ver](cliente/cliente__cotizaciones-390.webp) | redirigió a /login; redirigió a /login |
| inicio | `/cliente` | [ver](cliente/cliente-1440.webp) | [ver](cliente/cliente-390.webp) | redirigió a /login; redirigió a /login |
| novedades | `/cliente/novedades` | [ver](cliente/cliente__novedades-1440.webp) | [ver](cliente/cliente__novedades-390.webp) | redirigió a /login; redirigió a /login |

### Portal Guardia (Trabajador)

| Módulo | Ruta | 1440 | 390 | Observaciones automáticas |
|---|---|---|---|---|
| cambiar-pin | `/trabajador/cambiar-pin` | [ver](guardia/trabajador__cambiar-pin-1440.webp) | [ver](guardia/trabajador__cambiar-pin-390.webp) | redirigió a /login; redirigió a /login |
| inicio | `/trabajador` | [ver](guardia/trabajador-1440.webp) | [ver](guardia/trabajador-390.webp) | redirigió a /login; redirigió a /login |
| marcar | `/trabajador/marcar` | [ver](guardia/trabajador__marcar-1440.webp) | [ver](guardia/trabajador__marcar-390.webp) | redirigió a /login; redirigió a /login |
| mas | `/trabajador/mas` | [ver](guardia/trabajador__mas-1440.webp) | [ver](guardia/trabajador__mas-390.webp) | redirigió a /login; redirigió a /login |
| mi-rostro | `/trabajador/mi-rostro` | [ver](guardia/trabajador__mi-rostro-1440.webp) | [ver](guardia/trabajador__mi-rostro-390.webp) | redirigió a /login; redirigió a /login |
| mis-datos | `/trabajador/mis-datos` | [ver](guardia/trabajador__mis-datos-1440.webp) | [ver](guardia/trabajador__mis-datos-390.webp) | redirigió a /login; redirigió a /login |
| notificaciones | `/trabajador/notificaciones` | [ver](guardia/trabajador__notificaciones-1440.webp) | [ver](guardia/trabajador__notificaciones-390.webp) | redirigió a /login; redirigió a /login |
| novedades | `/trabajador/novedades` | [ver](guardia/trabajador__novedades-1440.webp) | [ver](guardia/trabajador__novedades-390.webp) | redirigió a /login; redirigió a /login |
| privacidad | `/trabajador/privacidad` | [ver](guardia/trabajador__privacidad-1440.webp) | [ver](guardia/trabajador__privacidad-390.webp) | redirigió a /login; redirigió a /login |

### Terreno

| Módulo | Ruta | 1440 | 390 | Observaciones automáticas |
|---|---|---|---|---|
| cola | `/terreno/cola` | [ver](terreno/terreno__cola-1440.webp) | [ver](terreno/terreno__cola-390.webp) | redirigió a /login; redirigió a /login |
| inicio | `/terreno` | [ver](terreno/terreno-1440.webp) | [ver](terreno/terreno-390.webp) | redirigió a /login; redirigió a /login |
| marcar | `/terreno/marcar` | [ver](terreno/terreno__marcar-1440.webp) | [ver](terreno/terreno__marcar-390.webp) | redirigió a /login; redirigió a /login |
| novedades | `/terreno/novedades` | [ver](terreno/terreno__novedades-1440.webp) | [ver](terreno/terreno__novedades-390.webp) | redirigió a /login; redirigió a /login |
| porteria | `/terreno/porteria` | [ver](terreno/terreno__porteria-1440.webp) | [ver](terreno/terreno__porteria-390.webp) | redirigió a /login; redirigió a /login |
| rondas | `/terreno/rondas` | [ver](terreno/terreno__rondas-1440.webp) | [ver](terreno/terreno__rondas-390.webp) | redirigió a /login; redirigió a /login |

### Ingresos públicos

| Módulo | Ruta | 1440 | 390 | Observaciones automáticas |
|---|---|---|---|---|
| emparejar | `/terreno/emparejar` | [ver](publico/terreno__emparejar-1440.webp) | [ver](publico/terreno__emparejar-390.webp) |  |
| login | `/cliente/login` | [ver](publico/cliente__login-1440.webp) | [ver](publico/cliente__login-390.webp) |  |
| login | `/login` | [ver](publico/login-1440.webp) | [ver](publico/login-390.webp) |  |
| login | `/trabajador/login` | [ver](publico/trabajador__login-1440.webp) | [ver](publico/trabajador__login-390.webp) |  |
| recuperar | `/recuperar` | [ver](publico/recuperar-1440.webp) | [ver](publico/recuperar-390.webp) |  |
| sin-conexion | `/sin-conexion` | [ver](publico/sin-conexion-1440.webp) | [ver](publico/sin-conexion-390.webp) |  |
| sin-conexion | `/terreno/sin-conexion` | [ver](publico/terreno__sin-conexion-1440.webp) | [ver](publico/terreno__sin-conexion-390.webp) |  |

