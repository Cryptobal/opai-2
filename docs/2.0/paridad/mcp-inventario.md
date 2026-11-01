# Inventario de paridad pantalla ↔ MCP

> Generado por `packages/capabilities/test/paridad-inventario.test.ts` (ADR-055). No editar a mano:
> si cambia una pantalla o una capacidad, el test falla hasta regenerarlo con `-u`.

Regla (Carlos, 28-oct-2026): el MCP expone **todas** las acciones de pantalla, incluida Plataforma.
La herramienta es la que ve una key con los scopes `*` y `platform` cuyo responsable es owner de
plataforma; una key solo con `*` ve todo salvo `platform_*`. Cada escritura tiene además su `preview_`.

**Resumen:** 367 pares pantalla→capacidad · 327 con herramienta · 40 excepciones justificadas · 0 faltantes.

## Pantalla → herramienta MCP

| Portal | Ruta o componente | Capacidad | Herramienta MCP | Estado |
| --- | --- | --- | --- | --- |
| — | `/api/agente` | `agente.plan.confirmar` | — | excepción |
| — | `/api/agente` | `agente.turno.preparar` | — | excepción |
| — | `/api/geo/mapa` | `core.geo.mapa` | — | excepción |
| — | `/firmar/[slug]/[token]` | `core.firmas.documento_url` | — | excepción |
| — | `/firmar/[slug]/[token]` | `core.firmas.firmar` | — | excepción |
| — | `/firmar/[slug]/[token]` | `core.firmas.rechazar` | — | excepción |
| — | `/firmar/[slug]/[token]` | `core.firmas.ver_firmante` | — | excepción |
| auth | `/invitacion/[slug]/[token]` | `core.invitations.accept` | — | excepción |
| auth | `/invitacion/[slug]/[token]` | `core.invitations.peek` | — | excepción |
| auth | `/invitacion/[slug]/[token]` | `core.invitations.request_new` | — | excepción |
| cliente | `/cliente` | `portal_cliente.resumen.leer` | `portal_cliente_resumen_leer` | existe |
| compartido | `app/_acciones` | `core.cargos.get` | `core_cargos_get` | existe |
| compartido | `app/_acciones` | `core.cuentas.get` | `core_cuentas_get` | existe |
| compartido | `app/_acciones` | `core.instalaciones.get` | `core_instalaciones_get` | existe |
| compartido | `app/_acciones` | `core.personas.get` | `core_personas_get` | existe |
| compartido | `app/_components` | `core.actividad.list` | `core_actividad_list` | existe |
| compartido | `app/_components` | `core.anexos.aprobar` | — | excepción |
| compartido | `app/_components` | `core.anexos.get` | `core_anexos_get` | existe |
| compartido | `app/_components` | `core.anexos.list` | `core_anexos_list` | existe |
| compartido | `app/_components` | `core.anexos.rechazar` | — | excepción |
| compartido | `app/_components` | `core.aprobaciones.list` | `core_aprobaciones_list` | existe |
| compartido | `app/_components` | `core.buscar` | `core_buscar` | existe |
| compartido | `app/_components` | `core.config.buscar` | `core_config_buscar` | existe |
| compartido | `app/_components` | `core.config.get` | `core_config_get` | existe |
| compartido | `app/_components` | `core.config.set` | `core_config_set` | existe |
| compartido | `app/_components` | `core.cumplimiento.consentimiento_registrar` | — | excepción |
| compartido | `app/_components` | `core.cumplimiento.consentimiento_revocar` | — | excepción |
| compartido | `app/_components` | `core.cumplimiento.consentimientos_listar` | `core_cumplimiento_consentimientos_listar` | existe |
| compartido | `app/_components` | `core.cumplimiento.solicitud_crear` | — | excepción |
| compartido | `app/_components` | `core.documento_tipos.list` | `core_documento_tipos_list` | existe |
| compartido | `app/_components` | `core.documentos.archive` | `core_documentos_archive` | existe |
| compartido | `app/_components` | `core.documentos.confirmar_subida` | `core_documentos_confirmar_subida` | existe |
| compartido | `app/_components` | `core.documentos.get` | `core_documentos_get` | existe |
| compartido | `app/_components` | `core.documentos.iniciar_subida` | `core_documentos_iniciar_subida` | existe |
| compartido | `app/_components` | `core.documentos.list` | `core_documentos_list` | existe |
| compartido | `app/_components` | `core.documentos.update` | `core_documentos_update` | existe |
| compartido | `app/_components` | `core.documentos.url_descarga` | `core_documentos_url_descarga` | existe |
| compartido | `app/_components` | `core.estructuras.anular` | `core_estructuras_anular` | existe |
| compartido | `app/_components` | `core.estructuras.create` | `core_estructuras_create` | existe |
| compartido | `app/_components` | `core.firmas.enviar` | `core_firmas_enviar` | existe |
| compartido | `app/_components` | `core.geo.autocompletar` | `core_geo_autocompletar` | existe |
| compartido | `app/_components` | `core.geo.detalle` | `core_geo_detalle` | existe |
| compartido | `app/_components` | `core.me` | `core_me` | existe |
| compartido | `app/_components` | `core.me.portal_inicio` | `core_me_portal_inicio` | existe |
| compartido | `app/_components` | `core.notificaciones.list` | `core_notificaciones_list` | existe |
| compartido | `app/_components` | `core.notificaciones.marcar_leida` | `core_notificaciones_marcar_leida` | existe |
| compartido | `app/_components` | `core.notificaciones.marcar_todas` | `core_notificaciones_marcar_todas` | existe |
| compartido | `app/_components` | `core.resumen.contadores` | `core_resumen_contadores` | existe |
| compartido | `app/(erp)/_componentes` | `core.actividad.list` | `core_actividad_list` | existe |
| compartido | `app/(erp)/_componentes` | `core.aprobaciones.list` | `core_aprobaciones_list` | existe |
| compartido | `app/(erp)/_componentes` | `core.inicio.pendientes` | `core_inicio_pendientes` | existe |
| compartido | `app/(erp)/_componentes` | `core.notificaciones.list` | `core_notificaciones_list` | existe |
| compartido | `app/(erp)/_componentes` | `core.notificaciones.marcar_todas` | `core_notificaciones_marcar_todas` | existe |
| compartido | `app/(erp)/_componentes` | `core.resumen.contadores` | `core_resumen_contadores` | existe |
| compartido | `app/(erp)/cargos/_componentes` | `core.cargos.create` | `core_cargos_create` | existe |
| compartido | `app/(erp)/cargos/_componentes` | `core.cargos.get` | `core_cargos_get` | existe |
| compartido | `app/(erp)/cargos/_componentes` | `core.cargos.list` | `core_cargos_list` | existe |
| compartido | `app/(erp)/cargos/_componentes` | `core.cargos.update` | `core_cargos_update` | existe |
| compartido | `app/(erp)/cargos/_componentes` | `core.estructuras.list` | `core_estructuras_list` | existe |
| compartido | `app/(erp)/configuracion/_centro` | `core.config.get` | `core_config_get` | existe |
| compartido | `app/(erp)/configuracion/_centro` | `core.config.schema` | `core_config_schema` | existe |
| compartido | `app/(erp)/configuracion/_centro` | `core.config.set` | `core_config_set` | existe |
| compartido | `app/(erp)/configuracion/_centro` | `core.modules.list` | `core_modules_list` | existe |
| compartido | `app/(erp)/configuracion/_centro` | `core.resumen.contadores` | `core_resumen_contadores` | existe |
| compartido | `app/(erp)/configuracion/_finanzas` | `finanzas.centros_costo.listar` | `finanzas_centros_costo_listar` | existe |
| compartido | `app/(erp)/configuracion/_finanzas` | `finanzas.plan.listar` | `finanzas_plan_listar` | existe |
| compartido | `app/(erp)/configuracion/_leads` | `comercial.canales.get` | `comercial_canales_get` | existe |
| compartido | `app/(erp)/configuracion/_leads` | `comercial.canales.update` | `comercial_canales_update` | existe |
| compartido | `app/(erp)/configuracion/_nomina` | `nomina.conceptos.actualizar` | `nomina_conceptos_actualizar` | existe |
| compartido | `app/(erp)/configuracion/_nomina` | `nomina.conceptos.crear` | `nomina_conceptos_crear` | existe |
| compartido | `app/(erp)/configuracion/_nomina` | `nomina.conceptos.listar` | `nomina_conceptos_listar` | existe |
| compartido | `app/(erp)/configuracion/_portal_cliente` | `core.cuentas.list` | `core_cuentas_list` | existe |
| compartido | `app/(erp)/configuracion/_portal_cliente` | `core.documento_tipos.list` | `core_documento_tipos_list` | existe |
| compartido | `app/(erp)/configuracion/_portal_cliente` | `core.instalaciones.list` | `core_instalaciones_list` | existe |
| compartido | `app/(erp)/configuracion/_portal_cliente` | `portal_cliente.accesos.actualizar` | `portal_cliente_accesos_actualizar` | existe |
| compartido | `app/(erp)/configuracion/_portal_cliente` | `portal_cliente.accesos.candidatos` | `portal_cliente_accesos_candidatos` | existe |
| compartido | `app/(erp)/configuracion/_portal_cliente` | `portal_cliente.accesos.listar` | `portal_cliente_accesos_listar` | existe |
| compartido | `app/(erp)/configuracion/_portal_cliente` | `portal_cliente.accesos.vincular` | `portal_cliente_accesos_vincular` | existe |
| compartido | `app/(erp)/configuracion/_portal_cliente` | `portal_cliente.config.actualizar` | `portal_cliente_config_actualizar` | existe |
| compartido | `app/(erp)/configuracion/_portal_cliente` | `portal_cliente.config.leer` | `portal_cliente_config_leer` | existe |
| compartido | `app/(erp)/configuracion/_rondas` | `rondas.incidentes_tipo.actualizar` | `rondas_incidentes_tipo_actualizar` | existe |
| compartido | `app/(erp)/configuracion/_rondas` | `rondas.incidentes_tipo.crear` | `rondas_incidentes_tipo_crear` | existe |
| compartido | `app/(erp)/configuracion/_rondas` | `rondas.incidentes_tipo.listar` | `rondas_incidentes_tipo_listar` | existe |
| compartido | `app/(erp)/configuracion/_tickets` | `tickets.tipos.actualizar` | `tickets_tipos_actualizar` | existe |
| compartido | `app/(erp)/configuracion/_tickets` | `tickets.tipos.crear` | `tickets_tipos_crear` | existe |
| compartido | `app/(erp)/configuracion/_tickets` | `tickets.tipos.listar` | `tickets_tipos_listar` | existe |
| compartido | `app/(erp)/configuracion/auditoria/_componentes` | `core.actividad.list` | `core_actividad_list` | existe |
| compartido | `app/(erp)/configuracion/comunicaciones/_componentes` | `core.notificacion_reglas.set` | `core_notificacion_reglas_set` | existe |
| compartido | `app/(erp)/configuracion/comunicaciones/_componentes` | `core.plantillas.enviar_prueba` | `core_plantillas_enviar_prueba` | existe |
| compartido | `app/(erp)/configuracion/comunicaciones/_componentes` | `core.plantillas.preview` | `core_plantillas_preview` | existe |
| compartido | `app/(erp)/configuracion/comunicaciones/_componentes` | `core.plantillas.update` | `core_plantillas_update` | existe |
| compartido | `app/(erp)/configuracion/consumos/_componentes` | `core.consumos.por_agente` | `core_consumos_por_agente` | existe |
| compartido | `app/(erp)/configuracion/consumos/_componentes` | `core.consumos.resumen` | `core_consumos_resumen` | existe |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.cumplimiento.dpa_aceptar` | — | excepción |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.cumplimiento.dpa_texto` | `core_cumplimiento_dpa_texto` | existe |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.cumplimiento.dpo_set` | — | excepción |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.cumplimiento.estado` | `core_cumplimiento_estado` | existe |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.cumplimiento.incidente_avanzar` | — | excepción |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.cumplimiento.incidente_notificar` | — | excepción |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.cumplimiento.incidente_registrar` | — | excepción |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.cumplimiento.incidentes_listar` | `core_cumplimiento_incidentes_listar` | existe |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.cumplimiento.rat` | `core_cumplimiento_rat` | existe |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.cumplimiento.solicitud_avanzar` | — | excepción |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.cumplimiento.solicitud_exportar` | — | excepción |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.cumplimiento.solicitud_obtener` | `core_cumplimiento_solicitud_obtener` | existe |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.cumplimiento.solicitud_resolver` | — | excepción |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.cumplimiento.solicitudes_listar` | `core_cumplimiento_solicitudes_listar` | existe |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.cumplimiento.titular_anonimizar` | — | excepción |
| compartido | `app/(erp)/configuracion/cumplimiento/_componentes` | `core.documentos.url_descarga` | `core_documentos_url_descarga` | existe |
| compartido | `app/(erp)/configuracion/integraciones/_componentes` | `core.integraciones.configurar` | — | excepción |
| compartido | `app/(erp)/configuracion/integraciones/_componentes` | `core.integraciones.probar` | `core_integraciones_probar` | existe |
| compartido | `app/(erp)/configuracion/integraciones/_componentes` | `core.integraciones.set_secreto` | — | excepción |
| compartido | `app/(erp)/configuracion/usuarios/_permisos` | `core.permisos.catalogo` | `core_permisos_catalogo` | existe |
| compartido | `app/(erp)/configuracion/usuarios/_permisos` | `core.roles.list` | `core_roles_list` | existe |
| compartido | `app/(erp)/contactos/_componentes` | `comercial.contactos.list` | `comercial_contactos_list` | existe |
| compartido | `app/(erp)/contactos/_componentes` | `core.contactos.get` | `core_contactos_get` | existe |
| compartido | `app/(erp)/cotizaciones/_componentes` | `comercial.negocios.list` | `comercial_negocios_list` | existe |
| compartido | `app/(erp)/cotizaciones/_componentes` | `cpq.cotizaciones.create` | `cpq_cotizaciones_create` | existe |
| compartido | `app/(erp)/cotizaciones/_componentes` | `cpq.cotizaciones.list` | `cpq_cotizaciones_list` | existe |
| compartido | `app/(erp)/cuentas/_componentes` | `core.contactos.create` | `core_contactos_create` | existe |
| compartido | `app/(erp)/cuentas/_componentes` | `core.contactos.update` | `core_contactos_update` | existe |
| compartido | `app/(erp)/cuentas/_componentes` | `core.cuentas.archive` | `core_cuentas_archive` | existe |
| compartido | `app/(erp)/cuentas/_componentes` | `core.cuentas.create` | `core_cuentas_create` | existe |
| compartido | `app/(erp)/cuentas/_componentes` | `core.cuentas.get` | `core_cuentas_get` | existe |
| compartido | `app/(erp)/cuentas/_componentes` | `core.cuentas.list` | `core_cuentas_list` | existe |
| compartido | `app/(erp)/cuentas/_componentes` | `core.cuentas.set_estado` | `core_cuentas_set_estado` | existe |
| compartido | `app/(erp)/cuentas/_componentes` | `core.cuentas.set_representantes` | `core_cuentas_set_representantes` | existe |
| compartido | `app/(erp)/cuentas/_componentes` | `core.cuentas.update` | `core_cuentas_update` | existe |
| compartido | `app/(erp)/documentos/firmas/_componentes` | `core.firmas.list` | `core_firmas_list` | existe |
| compartido | `app/(erp)/documentos/firmas/[id]/_componentes` | `core.firmas.cancelar` | `core_firmas_cancelar` | existe |
| compartido | `app/(erp)/documentos/firmas/[id]/_componentes` | `core.firmas.recordar` | `core_firmas_recordar` | existe |
| compartido | `app/(erp)/finanzas/compras/_componentes` | `finanzas.centros_costo.listar` | `finanzas_centros_costo_listar` | existe |
| compartido | `app/(erp)/finanzas/compras/_componentes` | `finanzas.compras.asignar_centro` | `finanzas_compras_asignar_centro` | existe |
| compartido | `app/(erp)/finanzas/compras/_componentes` | `finanzas.compras.listar` | `finanzas_compras_listar` | existe |
| compartido | `app/(erp)/finanzas/compras/_componentes` | `finanzas.compras.registrar` | `finanzas_compras_registrar` | existe |
| compartido | `app/(erp)/finanzas/compras/_componentes` | `finanzas.proveedores.listar` | `finanzas_proveedores_listar` | existe |
| compartido | `app/(erp)/finanzas/compras/proveedores/_componentes` | `finanzas.centros_costo.listar` | `finanzas_centros_costo_listar` | existe |
| compartido | `app/(erp)/finanzas/compras/proveedores/_componentes` | `finanzas.plan.listar` | `finanzas_plan_listar` | existe |
| compartido | `app/(erp)/finanzas/compras/proveedores/_componentes` | `finanzas.proveedores.actualizar` | `finanzas_proveedores_actualizar` | existe |
| compartido | `app/(erp)/finanzas/compras/proveedores/_componentes` | `finanzas.proveedores.crear` | `finanzas_proveedores_crear` | existe |
| compartido | `app/(erp)/finanzas/compras/proveedores/_componentes` | `finanzas.proveedores.listar` | `finanzas_proveedores_listar` | existe |
| compartido | `app/(erp)/finanzas/compras/proveedores/_componentes` | `finanzas.proveedores.obtener` | `finanzas_proveedores_obtener` | existe |
| compartido | `app/(erp)/finanzas/flujo/_componentes` | `finanzas.planilla.obtener` | `finanzas_planilla_obtener` | existe |
| compartido | `app/(erp)/finanzas/plan-de-cuentas/_componentes` | `finanzas.plan.actualizar` | `finanzas_plan_actualizar` | existe |
| compartido | `app/(erp)/finanzas/plan-de-cuentas/_componentes` | `finanzas.plan.crear` | `finanzas_plan_crear` | existe |
| compartido | `app/(erp)/finanzas/plan-de-cuentas/_componentes` | `finanzas.plan.inicializar` | `finanzas_plan_inicializar` | existe |
| compartido | `app/(erp)/finanzas/plan-de-cuentas/_componentes` | `finanzas.plan.listar` | `finanzas_plan_listar` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `core.config.get` | `core_config_get` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `core.cuentas.list` | `core_cuentas_list` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `core.instalaciones.archive` | `core_instalaciones_archive` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `core.instalaciones.get` | `core_instalaciones_get` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `core.instalaciones.list` | `core_instalaciones_list` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `core.instalaciones.set_estado` | `core_instalaciones_set_estado` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `core.instalaciones.update` | `core_instalaciones_update` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `core.puestos.create` | `core_puestos_create` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `core.puestos.set_estado` | `core_puestos_set_estado` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `core.puestos.update` | `core_puestos_update` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `core.supervisores.asignar` | `core_supervisores_asignar` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `core.supervisores.de_instalacion` | `core_supervisores_de_instalacion` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `core.supervisores.quitar` | `core_supervisores_quitar` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `rondas.etiquetas.pdf` | `rondas_etiquetas_pdf` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `rondas.plantillas.actualizar` | `rondas_plantillas_actualizar` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `rondas.plantillas.crear` | `rondas_plantillas_crear` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `rondas.plantillas.listar` | `rondas_plantillas_listar` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `rondas.programaciones.fijar` | `rondas_programaciones_fijar` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `rondas.programaciones.listar` | `rondas_programaciones_listar` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `rondas.programaciones.pausar` | `rondas_programaciones_pausar` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `rondas.puntos.actualizar` | `rondas_puntos_actualizar` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `rondas.puntos.archivar` | `rondas_puntos_archivar` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `rondas.puntos.crear` | `rondas_puntos_crear` | existe |
| compartido | `app/(erp)/instalaciones/_componentes` | `rondas.puntos.listar` | `rondas_puntos_listar` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `comercial.config.get` | `comercial_config_get` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `comercial.negocios.archivar` | `comercial_negocios_archivar` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `comercial.negocios.create` | `comercial_negocios_create` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `comercial.negocios.desvincular_instalacion` | `comercial_negocios_desvincular_instalacion` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `comercial.negocios.embudo` | `comercial_negocios_embudo` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `comercial.negocios.ganar` | `comercial_negocios_ganar` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `comercial.negocios.get` | `comercial_negocios_get` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `comercial.negocios.list` | `comercial_negocios_list` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `comercial.negocios.mover` | `comercial_negocios_mover` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `comercial.negocios.perder` | `comercial_negocios_perder` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `comercial.negocios.reabrir` | `comercial_negocios_reabrir` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `comercial.negocios.set_contactos` | `comercial_negocios_set_contactos` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `comercial.negocios.update` | `comercial_negocios_update` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `comercial.negocios.vincular_instalacion` | `comercial_negocios_vincular_instalacion` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `core.cuentas.get` | `core_cuentas_get` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `core.cuentas.list` | `core_cuentas_list` | existe |
| compartido | `app/(erp)/negocios/_componentes` | `core.instalaciones.list` | `core_instalaciones_list` | existe |
| compartido | `app/(erp)/negocios/_configuracion` | `comercial.config.actualizar_etapa` | `comercial_config_actualizar_etapa` | existe |
| compartido | `app/(erp)/negocios/_configuracion` | `comercial.config.crear_etapa` | `comercial_config_crear_etapa` | existe |
| compartido | `app/(erp)/negocios/_configuracion` | `comercial.config.get` | `comercial_config_get` | existe |
| compartido | `app/(erp)/negocios/_configuracion` | `comercial.config.guardar_catalogo` | `comercial_config_guardar_catalogo` | existe |
| compartido | `app/(erp)/negocios/_configuracion` | `comercial.config.reordenar_etapas` | `comercial_config_reordenar_etapas` | existe |
| compartido | `app/(erp)/nomina/_componentes` | `core.personas.list` | `core_personas_list` | existe |
| compartido | `app/(erp)/nomina/_componentes` | `nomina.anticipos.fijar_regla` | `nomina_anticipos_fijar_regla` | existe |
| compartido | `app/(erp)/nomina/_componentes` | `nomina.anticipos.generar` | `nomina_anticipos_generar` | existe |
| compartido | `app/(erp)/nomina/_componentes` | `nomina.novedades.anular` | `nomina_novedades_anular` | existe |
| compartido | `app/(erp)/nomina/_componentes` | `nomina.novedades.crear` | `nomina_novedades_crear` | existe |
| compartido | `app/(erp)/nomina/_componentes` | `nomina.obligaciones.actualizar` | `nomina_obligaciones_actualizar` | existe |
| compartido | `app/(erp)/nomina/_componentes` | `nomina.obligaciones.generar_calendario` | `nomina_obligaciones_generar_calendario` | existe |
| compartido | `app/(erp)/nomina/_componentes` | `nomina.periodos.abrir` | `nomina_periodos_abrir` | existe |
| compartido | `app/(erp)/nomina/_componentes` | `nomina.periodos.cambiar_estado` | `nomina_periodos_cambiar_estado` | existe |
| compartido | `app/(erp)/nomina/_componentes` | `nomina.periodos.listar` | `nomina_periodos_listar` | existe |
| compartido | `app/(erp)/nomina/_componentes` | `nomina.periodos.marcar_pagado` | `nomina_periodos_marcar_pagado` | existe |
| compartido | `app/(erp)/nomina/_componentes` | `nomina.prestamos.aplicar_cuotas` | `nomina_prestamos_aplicar_cuotas` | existe |
| compartido | `app/(erp)/nomina/_componentes` | `nomina.prestamos.cancelar` | `nomina_prestamos_cancelar` | existe |
| compartido | `app/(erp)/nomina/_componentes` | `nomina.prestamos.crear` | `nomina_prestamos_crear` | existe |
| compartido | `app/(erp)/pauta/_componentes` | `core.instalaciones.list` | `core_instalaciones_list` | existe |
| compartido | `app/(erp)/pauta/_componentes` | `pauta.excepciones.anular` | `pauta_excepciones_anular` | existe |
| compartido | `app/(erp)/pauta/_componentes` | `pauta.excepciones.crear` | `pauta_excepciones_crear` | existe |
| compartido | `app/(erp)/pauta/_componentes` | `pauta.historial.listar` | `pauta_historial_listar` | existe |
| compartido | `app/(erp)/pauta/_componentes` | `pauta.mes.leer` | `pauta_mes_leer` | existe |
| compartido | `app/(erp)/pauta/_componentes` | `pauta.ppc.listar` | `pauta_ppc_listar` | existe |
| compartido | `app/(erp)/pauta/_componentes` | `pauta.resumen.leer` | `pauta_resumen_leer` | existe |
| compartido | `app/(erp)/pauta/_componentes` | `pauta.series.fijar` | `pauta_series_fijar` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.cargos.list` | `core_cargos_list` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.documentos.pedir_renovacion` | `core_documentos_pedir_renovacion` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.estructuras.efectiva` | `core_estructuras_efectiva` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.instalaciones.list` | `core_instalaciones_list` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.personas.archive` | `core_personas_archive` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.personas.bloquear` | `core_personas_bloquear` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.personas.create` | `core_personas_create` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.personas.desbloquear` | `core_personas_desbloquear` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.personas.get` | `core_personas_get` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.personas.list` | `core_personas_list` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.personas.marcar_no_recontratar` | `core_personas_marcar_no_recontratar` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.personas.no_recontratar_ver` | `core_personas_no_recontratar_ver` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.personas.quitar_no_recontratar` | `core_personas_quitar_no_recontratar` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.personas.update` | `core_personas_update` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.personas.vincular_usuario` | `core_personas_vincular_usuario` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.puestos.list` | `core_puestos_list` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.users.list` | `core_users_list` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.vinculos.create` | `core_vinculos_create` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.vinculos.list` | `core_vinculos_list` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.vinculos.previsualizar` | `core_vinculos_previsualizar` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.vinculos.terminar` | `core_vinculos_terminar` | existe |
| compartido | `app/(erp)/personas/_componentes` | `core.vinculos.update` | `core_vinculos_update` | existe |
| compartido | `app/(erp)/solicitudes/_componentes` | `comercial.solicitudes.convertir` | `comercial_solicitudes_convertir` | existe |
| compartido | `app/(erp)/solicitudes/_componentes` | `comercial.solicitudes.create` | `comercial_solicitudes_create` | existe |
| compartido | `app/(erp)/solicitudes/_componentes` | `comercial.solicitudes.derivar` | `comercial_solicitudes_derivar` | existe |
| compartido | `app/(erp)/solicitudes/_componentes` | `comercial.solicitudes.descartar` | `comercial_solicitudes_descartar` | existe |
| compartido | `app/(erp)/solicitudes/_componentes` | `comercial.solicitudes.get` | `comercial_solicitudes_get` | existe |
| compartido | `app/(erp)/solicitudes/_componentes` | `comercial.solicitudes.list` | `comercial_solicitudes_list` | existe |
| compartido | `app/(erp)/solicitudes/_componentes` | `comercial.solicitudes.marcar_duplicada` | `comercial_solicitudes_marcar_duplicada` | existe |
| compartido | `app/(erp)/solicitudes/_componentes` | `comercial.solicitudes.reabrir` | `comercial_solicitudes_reabrir` | existe |
| compartido | `app/(erp)/solicitudes/_componentes` | `core.users.list` | `core_users_list` | existe |
| compartido | `app/(erp)/tickets/_componentes` | `tickets.tickets.crear` | `tickets_tickets_crear` | existe |
| compartido | `app/(erp)/tickets/_componentes` | `tickets.tickets.listar` | `tickets_tickets_listar` | existe |
| compartido | `app/(erp)/tickets/_componentes` | `tickets.tickets.obtener` | `tickets_tickets_obtener` | existe |
| compartido | `app/(erp)/tickets/_componentes` | `tickets.tipos.listar` | `tickets_tipos_listar` | existe |
| compartido | `app/(erp)/tickets/[id]/_componentes` | `tickets.tickets.aprobar` | `tickets_tickets_aprobar` | existe |
| compartido | `app/(erp)/tickets/[id]/_componentes` | `tickets.tickets.cambiar_estado` | `tickets_tickets_cambiar_estado` | existe |
| compartido | `app/(erp)/tickets/[id]/_componentes` | `tickets.tickets.comentar` | `tickets_tickets_comentar` | existe |
| compartido | `app/(erp)/tickets/[id]/_componentes` | `tickets.tickets.rechazar` | `tickets_tickets_rechazar` | existe |
| compartido | `app/(platform)/platform/ajustes/_componentes` | `platform.ajustes.set` | `platform_ajustes_set` | existe |
| compartido | `app/(platform)/platform/ajustes/_componentes` | `platform.precios.set` | `platform_precios_set` | existe |
| compartido | `app/(supervisor)/supervisor/_componentes` | `core.contactos.list` | `core_contactos_list` | existe |
| compartido | `app/(supervisor)/supervisor/_componentes` | `core.documentos.list` | `core_documentos_list` | existe |
| compartido | `app/(supervisor)/supervisor/_componentes` | `core.documentos.pedir_renovacion` | `core_documentos_pedir_renovacion` | existe |
| compartido | `app/(supervisor)/supervisor/_componentes` | `core.instalaciones.get` | `core_instalaciones_get` | existe |
| compartido | `app/(supervisor)/supervisor/_componentes` | `core.instalaciones.list` | `core_instalaciones_list` | existe |
| compartido | `app/(supervisor)/supervisor/_componentes` | `core.personas.get` | `core_personas_get` | existe |
| erp | `/cargos/[id]` | `core.cargos.set_activo` | `core_cargos_set_activo` | existe |
| erp | `/configuracion/agentes/[id]` | `core.apikeys.get` | `core_apikeys_get` | existe |
| erp | `/configuracion/agentes/[id]` | `core.apikeys.revoke` | — | excepción |
| erp | `/configuracion/agentes/[id]` | `core.apikeys.set_autonomia` | — | excepción |
| erp | `/configuracion/agentes/[id]` | `core.apikeys.update` | — | excepción |
| erp | `/configuracion/agentes/conectar` | `core.tenant.get` | `core_tenant_get` | existe |
| erp | `/configuracion/agentes` | `core.apikeys.create` | — | excepción |
| erp | `/configuracion/agentes` | `core.apikeys.list` | `core_apikeys_list` | existe |
| erp | `/configuracion/agentes` | `core.consumos.por_agente` | `core_consumos_por_agente` | existe |
| erp | `/configuracion/agentes` | `core.me` | `core_me` | existe |
| erp | `/configuracion/aprobaciones` | `core.aprobaciones.aprobar` | — | excepción |
| erp | `/configuracion/aprobaciones` | `core.aprobaciones.list` | `core_aprobaciones_list` | existe |
| erp | `/configuracion/aprobaciones` | `core.aprobaciones.rechazar` | — | excepción |
| erp | `/configuracion/aprobaciones` | `platform.aprobaciones.aprobar` | — | excepción |
| erp | `/configuracion/aprobaciones` | `platform.aprobaciones.rechazar` | — | excepción |
| erp | `/configuracion/calendario` | `core.calendario.actualizar` | `core_calendario_actualizar` | existe |
| erp | `/configuracion/calendario` | `core.calendario.archivar` | `core_calendario_archivar` | existe |
| erp | `/configuracion/calendario` | `core.calendario.crear_feriado` | `core_calendario_crear_feriado` | existe |
| erp | `/configuracion/calendario` | `core.calendario.listar` | `core_calendario_listar` | existe |
| erp | `/configuracion/comunicaciones/[evento]` | `core.comunicaciones.eventos` | `core_comunicaciones_eventos` | existe |
| erp | `/configuracion/comunicaciones/[evento]` | `core.plantillas.get` | `core_plantillas_get` | existe |
| erp | `/configuracion/comunicaciones` | `core.comunicaciones.eventos` | `core_comunicaciones_eventos` | existe |
| erp | `/configuracion/comunicaciones` | `core.notificacion_reglas.list` | `core_notificacion_reglas_list` | existe |
| erp | `/configuracion/cumplimiento/retencion` | `core.cumplimiento.retencion_politica` | `core_cumplimiento_retencion_politica` | existe |
| erp | `/configuracion/documentos` | `core.documento_tipos.create` | `core_documento_tipos_create` | existe |
| erp | `/configuracion/documentos` | `core.documento_tipos.list` | `core_documento_tipos_list` | existe |
| erp | `/configuracion/documentos` | `core.documento_tipos.update` | `core_documento_tipos_update` | existe |
| erp | `/configuracion/empresa` | `core.empresa.get` | `core_empresa_get` | existe |
| erp | `/configuracion/empresa` | `core.empresa.update` | `core_empresa_update` | existe |
| erp | `/configuracion/empresa` | `core.tenant.get` | `core_tenant_get` | existe |
| erp | `/configuracion/empresa` | `core.tenant.update` | `core_tenant_update` | existe |
| erp | `/configuracion/integraciones/[proveedor]` | `core.consumos.resumen` | `core_consumos_resumen` | existe |
| erp | `/configuracion/integraciones/[proveedor]` | `core.integraciones.get` | `core_integraciones_get` | existe |
| erp | `/configuracion/integraciones/[proveedor]` | `core.integraciones.list` | `core_integraciones_list` | existe |
| erp | `/configuracion/integraciones` | `core.integraciones.list` | `core_integraciones_list` | existe |
| erp | `/configuracion/marca` | `core.documento_tipos.list` | `core_documento_tipos_list` | existe |
| erp | `/configuracion/marca` | `core.marca.get` | `core_marca_get` | existe |
| erp | `/configuracion/marca` | `core.marca.update` | `core_marca_update` | existe |
| erp | `/configuracion/modulos` | `core.modules.list` | `core_modules_list` | existe |
| erp | `/configuracion/modulos` | `core.modules.solicitar` | `core_modules_solicitar` | existe |
| erp | `/configuracion/operaciones` | `core.funciones.create` | `core_funciones_create` | existe |
| erp | `/configuracion/operaciones` | `core.funciones.list` | `core_funciones_list` | existe |
| erp | `/configuracion/operaciones` | `core.funciones.set_activo` | `core_funciones_set_activo` | existe |
| erp | `/configuracion/operaciones` | `core.funciones.update` | `core_funciones_update` | existe |
| erp | `/configuracion/operaciones` | `core.patrones.create` | `core_patrones_create` | existe |
| erp | `/configuracion/operaciones` | `core.patrones.list` | `core_patrones_list` | existe |
| erp | `/configuracion/operaciones` | `core.patrones.set_activo` | `core_patrones_set_activo` | existe |
| erp | `/configuracion/operaciones` | `core.patrones.update` | `core_patrones_update` | existe |
| erp | `/configuracion/preferencias` | `core.config.set` | `core_config_set` | existe |
| erp | `/configuracion/usuarios/roles` | `core.roles.archive` | — | excepción |
| erp | `/configuracion/usuarios/roles` | `core.roles.create` | — | excepción |
| erp | `/configuracion/usuarios/roles` | `core.roles.update` | — | excepción |
| erp | `/configuracion/usuarios` | `core.excepciones.list` | `core_excepciones_list` | existe |
| erp | `/configuracion/usuarios` | `core.excepciones.set` | — | excepción |
| erp | `/configuracion/usuarios` | `core.instalaciones.list` | `core_instalaciones_list` | existe |
| erp | `/configuracion/usuarios` | `core.invitations.list` | `core_invitations_list` | existe |
| erp | `/configuracion/usuarios` | `core.roles.assign` | — | excepción |
| erp | `/configuracion/usuarios` | `core.supervisores.asignar` | `core_supervisores_asignar` | existe |
| erp | `/configuracion/usuarios` | `core.supervisores.list` | `core_supervisores_list` | existe |
| erp | `/configuracion/usuarios` | `core.supervisores.quitar` | `core_supervisores_quitar` | existe |
| erp | `/configuracion/usuarios` | `core.users.invite` | — | excepción |
| erp | `/configuracion/usuarios` | `core.users.list` | `core_users_list` | existe |
| erp | `/configuracion/usuarios` | `core.users.remove` | `core_users_remove` | existe |
| erp | `/configuracion/usuarios` | `core.users.update` | `core_users_update` | existe |
| erp | `/cotizaciones/nueva` | `comercial.negocios.get` | `comercial_negocios_get` | existe |
| erp | `/cuentas/[id]/contactos` | `core.contactos.list` | `core_contactos_list` | existe |
| erp | `/documentos/firmas/[id]` | `core.firmas.estado` | `core_firmas_estado` | existe |
| erp | `/instalaciones/[id]/puestos` | `core.cargos.list` | `core_cargos_list` | existe |
| erp | `/instalaciones/[id]/puestos` | `core.funciones.list` | `core_funciones_list` | existe |
| erp | `/instalaciones/[id]/puestos` | `core.patrones.list` | `core_patrones_list` | existe |
| erp | `/instalaciones/nueva` | `core.cuentas.list` | `core_cuentas_list` | existe |
| erp | `/instalaciones/nueva` | `core.instalaciones.create` | `core_instalaciones_create` | existe |
| erp | `/instalaciones/nueva` | `core.instalaciones.get` | `core_instalaciones_get` | existe |
| erp | `/instalaciones/nueva` | `core.instalaciones.list` | `core_instalaciones_list` | existe |
| erp | `/instalaciones/nueva` | `core.puestos.create` | `core_puestos_create` | existe |
| erp | `/nomina/calendario` | `nomina.obligaciones.listar` | `nomina_obligaciones_listar` | existe |
| erp | `/nomina/novedades` | `nomina.anticipos.reglas_listar` | `nomina_anticipos_reglas_listar` | existe |
| erp | `/nomina/novedades` | `nomina.novedades.listar` | `nomina_novedades_listar` | existe |
| erp | `/nomina/novedades` | `nomina.prestamos.listar` | `nomina_prestamos_listar` | existe |
| erp | `/personas/vencimientos` | `core.documentos.matriz` | `core_documentos_matriz` | existe |
| platform | `/platform/ajustes` | `platform.ajustes.get` | `platform_ajustes_get` | existe |
| platform | `/platform/ajustes` | `platform.precios.list` | `platform_precios_list` | existe |
| platform | `/platform/consumos` | `platform.consumos.summary` | `platform_consumos_summary` | existe |
| platform | `/platform/tenants/[id]/integraciones` | `platform.integraciones.estado` | `platform_integraciones_estado` | existe |
| platform | `/platform/tenants/[id]` | `platform.admins.invite` | `platform_admins_invite` | existe |
| platform | `/platform/tenants/[id]` | `platform.modules.set` | `platform_modules_set` | existe |
| platform | `/platform/tenants/[id]` | `platform.tenants.get` | `platform_tenants_get` | existe |
| platform | `/platform/tenants/[id]` | `platform.tenants.panel` | `platform_tenants_panel` | existe |
| platform | `/platform/tenants/[id]` | `platform.tenants.set_estado` | `platform_tenants_set_estado` | existe |
| platform | `/platform/tenants/[id]` | `platform.trabajos.list` | `platform_trabajos_list` | existe |
| platform | `/platform/tenants/nuevo` | `platform.tenants.create` | `platform_tenants_create` | existe |
| platform | `/platform/trabajos` | `platform.tenants.list` | `platform_tenants_list` | existe |
| platform | `/platform/trabajos` | `platform.trabajos.list` | `platform_trabajos_list` | existe |
| platform | `/platform` | `platform.tenants.list` | `platform_tenants_list` | existe |
| servidor | `lib/existe-ruta.ts` | `core.apikeys.get` | `core_apikeys_get` | existe |
| servidor | `lib/existe-ruta.ts` | `core.cargos.get` | `core_cargos_get` | existe |
| servidor | `lib/existe-ruta.ts` | `core.comunicaciones.eventos` | `core_comunicaciones_eventos` | existe |
| servidor | `lib/existe-ruta.ts` | `core.cuentas.get` | `core_cuentas_get` | existe |
| servidor | `lib/existe-ruta.ts` | `core.instalaciones.get` | `core_instalaciones_get` | existe |
| servidor | `lib/existe-ruta.ts` | `core.integraciones.get` | `core_integraciones_get` | existe |
| servidor | `lib/existe-ruta.ts` | `core.personas.get` | `core_personas_get` | existe |
| servidor | `lib/mcp.ts` | `core.config.schema` | `core_config_schema` | existe |
| servidor | `lib/panel-sueldo.ts` | `core.estructuras.panel` | `core_estructuras_panel` | existe |
| supervisor | `/supervisor/personas/[id]` | `core.documento_tipos.list` | `core_documento_tipos_list` | existe |
| supervisor | `/supervisor` | `core.documentos.matriz` | `core_documentos_matriz` | existe |

## Entradas de servidor sin id literal (acciones y rutas)

| Entrada | Cómo llega a una capacidad o por qué no aplica |
| --- | --- |
| `app/_acciones/auth.ts#accionCambiarPassword` | Identidad: cambia la contraseña propia; un agente nunca toca credenciales (ADR-032). |
| `app/_acciones/auth.ts#accionEntrar` | Identidad: login con contraseña (Better Auth), solo personas. |
| `app/_acciones/auth.ts#accionGoogle` | Identidad: login con Google, solo personas. |
| `app/_acciones/auth.ts#accionPedirRecuperacion` | Identidad: recuperar contraseña, pública y con rate limit cerrado. |
| `app/_acciones/auth.ts#accionRestablecer` | Identidad: restablece la contraseña con el token del correo. |
| `app/_acciones/auth.ts#accionSalir` | Identidad: cierra la sesión del navegador. |
| `app/_acciones/capacidad.ts#cambiarTenant` | Sesión humana: elige la empresa de la cookie; una key ya pertenece a una empresa. |
| `app/_acciones/capacidad.ts#ejecutarCapacidad` | Pasarela de la UI: ejecuta cualquier capacidad no interna (su herramienta MCP es la de esa capacidad). |
| `app/_acciones/mfa.ts#accionConfirmarMfa` | Identidad: confirma el enrolamiento del segundo factor. |
| `app/_acciones/mfa.ts#accionDesactivarMfa` | Identidad: desactiva el segundo factor propio. |
| `app/_acciones/mfa.ts#accionIniciarMfa` | Identidad: enrola el segundo factor propio. |
| `app/_acciones/mfa.ts#accionVerificar` | Identidad: segundo factor de la sesión humana. |
| `app/_acciones/validar-fichas-nav.ts#revisarFichasNav` | Igual que validarFichasNav: solo capacidades .get con alcance, ya expuestas por MCP. |
| `app/_acciones/validar-fichas-nav.ts#validarFichasNav` | Lee fichas fijadas con core.{cuentas,instalaciones,personas,cargos}.get (herramientas MCP existentes). |
| `app/(auth)/invitacion/[slug]/[token]/acciones.ts#aceptarInvitacion` | Identidad: core.invitations.accept (interna con motivo): nadie acepta invitaciones por otro. |
| `app/(auth)/invitacion/[slug]/[token]/acciones.ts#pedirNuevaInvitacion` | Identidad: core.invitations.request_new (interna con motivo), sin sesión. |
| `app/(auth)/invitacion/[slug]/[token]/acciones.ts#registrarYAceptar` | Identidad: crea la cuenta propia y acepta la invitación. |
| `app/(auth)/invitacion/[slug]/[token]/acciones.ts#verInvitacion` | Identidad: core.invitations.peek (interna con motivo): el token del enlace es la credencial. |
| `app/api/agente/route.ts` | Agente interno (ADR-049): agente.turno.preparar/agente.plan.confirmar (solo personas, con motivo); un agente externo usa el MCP. |
| `app/api/auth/[...all]/route.ts` | Better Auth (sesión, OAuth y verificación de correo). |
| `app/api/cron/programador/route.ts` | Cron (CRON_SECRET): encola trabajos; no es una acción de pantalla (ADR-029). |
| `app/api/cron/trabajos/route.ts` | Cron (CRON_SECRET): ejecuta la cola de trabajos (ADR-029). |
| `app/api/csp-report/route.ts` | Reportes CSP del navegador; solo logs categóricos. |
| `app/api/existe/route.ts` | Infraestructura del proxy (404 real con Cache Components) usando las mismas capacidades .get que la página. |
| `app/api/geo/mapa/route.ts` | Proxy de imagen de core.geo.mapa (interna con motivo en EXCEPCIONES_PARIDAD): una imagen no sirve a un agente. |
| `app/api/health/route.ts` | Salud del despliegue, sin datos. |
| `app/api/marca/[slug]/[asset]/route.ts` | URL pública de logos de la marca (ADR-028) para correos y PDF; la marca se lee y cambia con core.marca.get/update por MCP. |
| `app/api/mcp/[[...transport]]/route.ts` | Servidor MCP (Authorization: Bearer). |
| `app/api/mcp/k/[key]/[[...transport]]/route.ts` | Servidor MCP con la key en la URL: deprecado (410 Gone salvo MCP_KEY_EN_URL_HASTA). |
| `app/api/v1/[...capability]/route.ts` | API v1: ejecuta la capacidad de la URL con las mismas reglas que el MCP. |
| `app/firmar/[slug]/[token]/acciones.ts#firmarPorEnlace` | Firma: core.firmas.firmar (interna con motivo): nadie firma por otro con su enlace (firma.md R19). |
| `app/firmar/[slug]/[token]/acciones.ts#rechazarPorEnlace` | Firma: core.firmas.rechazar (interna con motivo): nadie rechaza por otro con su enlace (firma.md R9). |
| `app/firmar/[slug]/[token]/acciones.ts#urlDocumentoPorEnlace` | Firma: core.firmas.documento_url (interna con motivo): el enlace personal es la credencial, igual que ver_firmante (firma.md R5). |
| `app/firmar/[slug]/[token]/acciones.ts#verFirma` | Firma: core.firmas.ver_firmante (interna con motivo): el enlace personal es la credencial (firma.md §5). |

## Excepciones justificadas (sin herramienta MCP)

| Capacidad | Motivo |
| --- | --- |
| `agente.plan.confirmar` | Solo personas: confirmar o rechazar un plan debe ser una decisión humana, nunca una herramienta del modelo. |
| `agente.turno.preparar` | Solo personas: la sesión humana delega su identidad al agente interno; una key no inicia otro agente. |
| `core.anexos.aprobar` | Solo personas: aprobar el anexo de contrato materializa un documento irreversible, un acto humano responsable (Brief 07b PR 4, ADR-032). |
| `core.anexos.rechazar` | Solo personas: rechazar el anexo de contrato es una decisión humana responsable (Brief 07b PR 4, ADR-032). |
| `core.apikeys.create` | Solo personas: una key no se crea keys ni ve secretos (ADR-032). |
| `core.apikeys.revoke` | Solo personas: gobierno de keys y credenciales (ADR-032). |
| `core.apikeys.set_autonomia` | Solo personas: un agente no se da autonomía a sí mismo (ADR-032). |
| `core.apikeys.update` | Solo personas: cambiar alcances de una key es gobernar agentes (ADR-032). |
| `core.aprobaciones.aprobar` | Solo personas: lo irreversible lo aprueba un humano (ADR-032). |
| `core.aprobaciones.rechazar` | Solo personas: la decisión sobre lo irreversible es humana (ADR-032). |
| `core.cumplimiento.consentimiento_registrar` | Solo personas: registrar el consentimiento de un titular es un acto responsable del tenant (Ley 21.719, §16.2). |
| `core.cumplimiento.consentimiento_revocar` | Solo personas: dejar constancia de la revocación de un consentimiento es un acto responsable (Ley 21.719). |
| `core.cumplimiento.dpa_aceptar` | Solo personas: aceptar el DPA por la empresa es un acto humano responsable (Ley 21.719, ADR-034). |
| `core.cumplimiento.dpo_set` | Solo personas: designar al delegado de protección de datos (DPO) gobierna el cumplimiento (Ley 21.719). |
| `core.cumplimiento.incidente_avanzar` | Solo personas: avanzar la atención de un incidente gobierna el cumplimiento (Ley 21.719). |
| `core.cumplimiento.incidente_notificar` | Solo personas: dejar constancia del aviso de una brecha a la Agencia o a los titulares es un acto humano responsable (Ley 21.719, §16.5). |
| `core.cumplimiento.incidente_registrar` | Solo personas: registrar un incidente o brecha es un acto humano responsable, no un detector automático (Ley 21.719, §16.5). |
| `core.cumplimiento.solicitud_avanzar` | Solo personas: avanzar una solicitud del titular gobierna el cumplimiento y prueba la atención en plazo (Ley 21.719). |
| `core.cumplimiento.solicitud_crear` | Solo personas: atender una solicitud del titular (ARCO+) es un acto humano responsable (Ley 21.719, ADR-034). |
| `core.cumplimiento.solicitud_exportar` | Solo personas: generar la exportación de datos de un titular (acceso/portabilidad) es un acto humano responsable (Ley 21.719). |
| `core.cumplimiento.solicitud_resolver` | Solo personas: resolver o rechazar una solicitud del titular es una decisión humana responsable (Ley 21.719). |
| `core.cumplimiento.titular_anonimizar` | Solo personas: anonimizar a un titular es irreversible y es la única purga forzada; la decide una persona responsable (Ley 21.719, §16.4). |
| `core.excepciones.set` | Solo personas: conceder o denegar permisos puntuales es gobierno de acceso (ADR-034). |
| `core.firmas.documento_url` | Interna: igual que ver_firmante, el enlace personal es la credencial antes de existir sesión (firma.md R5, A2 de la corrección PR 2). |
| `core.firmas.firma_automatica_autorizar` | Solo personas: autorizar la firma automática del representante solo puede hacerlo él (firma.md §10, R16). |
| `core.firmas.firma_automatica_revocar` | Solo personas: revocar la firma automática del representante es un acto suyo (firma.md §10, R16). |
| `core.firmas.firmante_empresa_set` | Solo personas: define quién firma por la empresa (representante legal); gobierna la identidad de firma, no una key (firma.md §10, R16). |
| `core.firmas.firmar` | Interna y solo personas: el enlace personal es la credencial (como al aceptar una invitación) y un agente nunca firma por una persona (firma.md R19, §10). |
| `core.firmas.rechazar` | Interna y solo personas: rechazar es un acto personal del firmante con su enlace como credencial; un agente nunca rechaza por nadie (firma.md R9, R19, §10). |
| `core.firmas.ver_firmante` | Interna: se mira antes de existir sesión con el enlace personal como credencial, igual que core.invitations.peek (firma.md §5). |
| `core.geo.mapa` | Interna: entrega la imagen del mapa al proxy `/api/geo/mapa` con la clave del tenant; una imagen no sirve a un agente y la clave nunca sale. |
| `core.integraciones.configurar` | Solo personas: credenciales del tenant; nunca salen ni se cambian por API ni MCP (ADR-027). |
| `core.integraciones.set_secreto` | Solo personas: secretos cifrados del tenant; nunca salen ni se cambian por API ni MCP (ADR-027). |
| `core.invitations.accept` | Interna: crea la membresía de quien acepta el enlace; un agente no acepta invitaciones por nadie. |
| `core.invitations.peek` | Interna: se ejecuta antes de existir sesión (el token del enlace es la credencial). |
| `core.invitations.request_new` | Interna: la pide quien aún no tiene sesión (token vencido o usado). |
| `core.roles.archive` | Solo personas: archivar un rol es gobierno de acceso; un agente no lo hace (ADR-034). |
| `core.roles.assign` | Solo personas: asignar un rol a un usuario gobierna su acceso (ADR-034). |
| `core.roles.create` | Solo personas: gobierna el acceso; un agente no se crea roles ni se concede permisos (ADR-034). |
| `core.roles.update` | Solo personas: cambiar los permisos de un rol es gobernar el acceso (ADR-034). |
| `core.users.invite` | Solo personas: invitar asigna un rol y gobierna el acceso (encargo PR #70). |
| `core.users.restablecer_mfa` | Solo personas: quitar el segundo factor de otra cuenta lo decide un owner con sesión (CAR-54). |
| `platform.aprobaciones.aprobar` | Solo personas: lo irreversible de plataforma lo aprueba un humano (ADR-032, CAR-36). |
| `platform.aprobaciones.rechazar` | Solo personas: la decisión sobre lo irreversible de plataforma es humana (ADR-032, CAR-36). |
| `platform.usuarios.borrar` | Solo personas: borrar una identidad es irreversible y lo decide Plataforma con sesión (CAR-45). |
| `platform.usuarios.restablecer_mfa` | Solo personas: quitar el segundo factor de una cuenta lo decide Plataforma con sesión (CAR-54). |

## Solo personas: camino humano (CAR-52)

Por MCP y API key están reservadas a personas (`soloPersonas`, ADR-034): el agente recibe FORBIDDEN.
Cada una tiene una pantalla que la invoca o un encargo con fecha. «API v1 con sesión» marca las que
`/api/v1` ejecuta con la sesión de una persona en el portal ERP fijado en servidor (CAR-37).

| Capacidad | Camino humano | API v1 con sesión | MCP |
| --- | --- | --- | --- |
| `agente.plan.confirmar` | `/api/agente` | no | reservada a personas |
| `agente.turno.preparar` | `/api/agente` | no | reservada a personas |
| `core.anexos.aprobar` | `app/_components` | no | reservada a personas |
| `core.anexos.rechazar` | `app/_components` | no | reservada a personas |
| `core.apikeys.create` | `/configuracion/agentes` | no | reservada a personas |
| `core.apikeys.revoke` | `/configuracion/agentes/[id]` | no | reservada a personas |
| `core.apikeys.set_autonomia` | `/configuracion/agentes/[id]` | no | reservada a personas |
| `core.apikeys.update` | `/configuracion/agentes/[id]` | no | reservada a personas |
| `core.aprobaciones.aprobar` | `/configuracion/aprobaciones` | no | reservada a personas |
| `core.aprobaciones.rechazar` | `/configuracion/aprobaciones` | no | reservada a personas |
| `core.cumplimiento.consentimiento_registrar` | `app/_components` | no | reservada a personas |
| `core.cumplimiento.consentimiento_revocar` | `app/_components` | no | reservada a personas |
| `core.cumplimiento.dpa_aceptar` | `app/(erp)/configuracion/cumplimiento/_componentes` | no | reservada a personas |
| `core.cumplimiento.dpo_set` | `app/(erp)/configuracion/cumplimiento/_componentes` | no | reservada a personas |
| `core.cumplimiento.incidente_avanzar` | `app/(erp)/configuracion/cumplimiento/_componentes` | no | reservada a personas |
| `core.cumplimiento.incidente_notificar` | `app/(erp)/configuracion/cumplimiento/_componentes` | no | reservada a personas |
| `core.cumplimiento.incidente_registrar` | `app/(erp)/configuracion/cumplimiento/_componentes` | no | reservada a personas |
| `core.cumplimiento.solicitud_avanzar` | `app/(erp)/configuracion/cumplimiento/_componentes` | no | reservada a personas |
| `core.cumplimiento.solicitud_crear` | `app/_components` | no | reservada a personas |
| `core.cumplimiento.solicitud_exportar` | `app/(erp)/configuracion/cumplimiento/_componentes` | no | reservada a personas |
| `core.cumplimiento.solicitud_resolver` | `app/(erp)/configuracion/cumplimiento/_componentes` | no | reservada a personas |
| `core.cumplimiento.titular_anonimizar` | `app/(erp)/configuracion/cumplimiento/_componentes` | no | reservada a personas |
| `core.excepciones.set` | `/configuracion/usuarios` | sí (portal ERP) | reservada a personas |
| `core.firmas.firma_automatica_autorizar` | sin pantalla todavía · CAR-82 · desde 2026-10-29 | no | reservada a personas |
| `core.firmas.firma_automatica_revocar` | sin pantalla todavía · CAR-82 · desde 2026-10-29 | no | reservada a personas |
| `core.firmas.firmante_empresa_set` | sin pantalla todavía · CAR-82 · desde 2026-10-29 | no | reservada a personas |
| `core.firmas.firmar` | `/firmar/[slug]/[token]` | no | reservada a personas |
| `core.firmas.rechazar` | `/firmar/[slug]/[token]` | no | reservada a personas |
| `core.integraciones.configurar` | `app/(erp)/configuracion/integraciones/_componentes` | no | reservada a personas |
| `core.integraciones.set_secreto` | `app/(erp)/configuracion/integraciones/_componentes` | no | reservada a personas |
| `core.roles.archive` | `/configuracion/usuarios/roles` | sí (portal ERP) | reservada a personas |
| `core.roles.assign` | `/configuracion/usuarios` | sí (portal ERP) | reservada a personas |
| `core.roles.create` | `/configuracion/usuarios/roles` | sí (portal ERP) | reservada a personas |
| `core.roles.update` | `/configuracion/usuarios/roles` | sí (portal ERP) | reservada a personas |
| `core.users.invite` | `/configuracion/usuarios` | no | reservada a personas |
| `core.users.restablecer_mfa` | sin pantalla todavía · CAR-54 · desde 2026-10-29 | no | reservada a personas |
| `platform.aprobaciones.aprobar` | `/configuracion/aprobaciones` | no | reservada a personas |
| `platform.aprobaciones.rechazar` | `/configuracion/aprobaciones` | no | reservada a personas |
| `platform.usuarios.borrar` | sin pantalla todavía · CAR-45 · desde 2026-10-29 | no | reservada a personas |
| `platform.usuarios.restablecer_mfa` | sin pantalla todavía · CAR-54 · desde 2026-10-29 | no | reservada a personas |

## Capacidades solo por API y MCP (ninguna pantalla las invoca con id literal)

- `agente.historial.list`
- `agente.modelos.list`
- `core.actividades.completar`
- `core.actividades.create`
- `core.actividades.delete`
- `core.actividades.tareas`
- `core.actividades.timeline`
- `core.actividades.update`
- `core.anexos.generar`
- `core.aprobaciones.get`
- `core.audit.list`
- `core.bitacora.verificar`
- `core.consumos.por_recurso`
- `core.contactos.archive`
- `core.contactos.cuentas`
- `core.contactos.desvincular`
- `core.contactos.set_roles`
- `core.contactos.vincular`
- `core.cuentas.contactos`
- `core.documentos.desvincular`
- `core.documentos.vencimientos`
- `core.documentos.vincular`
- `core.estructuras.get`
- `core.etiquetas.asignar`
- `core.etiquetas.create`
- `core.etiquetas.de_entidad`
- `core.etiquetas.delete`
- `core.etiquetas.list`
- `core.etiquetas.quitar`
- `core.etiquetas.update`
- `core.firmas.politica_get`
- `core.firmas.politica_set`
- `core.firmas.verificar`
- `core.funciones.get`
- `core.geo.geocodificar`
- `core.ia.probar`
- `core.invitations.revoke`
- `core.patrones.get`
- `core.ping`
- `core.puestos.get`
- `core.usage.summary`
- `cpq.cotizaciones.get`
- `finanzas.ajustes.actualizar`
- `finanzas.ajustes.obtener`
- `finanzas.celdas.cumplir`
- `finanzas.celdas.fijar`
- `finanzas.celdas.mover`
- `finanzas.cierres.listar`
- `finanzas.cierres.reabrir`
- `finanzas.cierres.sellar`
- `finanzas.compras.importar`
- `finanzas.filas.actualizar`
- `finanzas.filas.crear`
- `finanzas.filas.listar`
- `nomina.novedades.cargar`
- `platform.auditoria.estado`
- `platform.auditoria.list`
- `platform.bitacora.estado`
- `platform.eventos.list`
- `platform.tenants.update`
- `platform.trabajos.cancelar`
- `platform.trabajos.reintentar`
- `platform.usage.summary`
- `platform.users.list`
- `platform.users.set_role`
- `portal_cliente.mi_acceso`
- `rondas.puntos.reemplazar_etiqueta`
- `tickets.tickets.reasignar`
