# BRIEF DE IMPLEMENTACIÓN — 31 Bot operativo en Comercial y Finanzas

Rama `brief/car-bot-operativo`. Encargo de Carlos (4-nov-2026): Finanzas y Comercial al 100 % y el bot Grokbot operando sobre el MCP de OPAI 2.0 en vez del de 1.0. Manual para el bot: [`agentes/operar-grokbot.md`](../agentes/operar-grokbot.md).

## 1. Objetivo

Que Grokbot, que hoy opera 100 % sobre el MCP de OPAI 1.0, pueda hacer lo mismo en Comercial y Finanzas sobre el MCP de OPAI 2.0. Para eso: (a) inventariar qué herramientas de 1.0 existen, faltan o no se portan; (b) cerrar las brechas de alto valor que no exigen migración ni pantalla; (c) documentar cómo se conecta el bot y qué permisos mínimos necesita; (d) dejar registradas las brechas que sí exigen diseño, migración o pantalla.

## 2. Estado actual (verificado)

Verificado en `main` `4f7af06` (#269), 4-nov-2026.

- 1.0 expone **217 herramientas distintas** (sin contar las 45 variantes `preview_`), definidas en `src/lib/ai/help-chat-*.ts` y asignadas a los toolsets `ops` y `finance` en `src/lib/ai/mcp-toolsets.ts` (solo lectura del repo de 1.0).
- 2.0 expone 533 pares pantalla→capacidad con 479 herramientas (inventario de paridad, 0 faltantes pantalla→MCP) y las instantáneas `herramientas-mcp.txt`.
- Comercial ya tiene negocios, embudo, solicitudes con canal agente (GrowthBot, [operar-comercial](../agentes/operar-comercial.md)), seguimiento y actividades. Finanzas ya tiene libro de ventas y compras, emisión DTE, nota de crédito, cesión, programaciones recurrentes, cobranza, flujo de caja y lectura de bancos. CPQ cubre cotizaciones, líneas, márgenes, propuesta y envío.
- No existían: informes de cierre y de pérdidas, alertas de negocios, resultado por mes, búsqueda de ventas por RUT / cesión / monto y los indicadores UF y UTM por MCP.
- PR abiertos revisados con REST para no duplicar: #246 (corrección del flujo de caja), #265 (explorador de Documentos), #270 (apertura desde 1.0), #247, #241, #240 y #168. Ninguno crea las capacidades de este brief. La otra sesión que trabaja Bancos y conciliación (Web4Leads) no se toca.

## 3. Alcance

**Incluido**

- Inventario completo 1.0 → 2.0 (sección 4).
- Seis capacidades de solo lectura nuevas, con su herramienta MCP (sección 7).
- Manual `operar-grokbot.md` con su escenario de prueba (ADR-034).
- Instantánea de herramientas, inventario de paridad y `ESTADO.md` al día.

**Excluido (documentado como pendiente, sección 4.2)**

- Todo lo que exige migración o pantalla nueva.
- Bancos, conciliación y factoring (`modules/finanzas/capacidades/bancos/`, `apps/web/app/(erp)/finanzas/bancos/`): otra sesión.
- Operaciones, personas y portales: fuera del encargo (Comercial y Finanzas).
- Crear o usar la API key del bot: la crea Carlos.

## 4. Inventario de brechas 1.0 → 2.0

### 4.1 Resumen

| Estado | Herramientas de 1.0 | Qué significa |
|---|---:|---|
| Existe | 86 | Hay capacidad equivalente en 2.0 (nombre en la tabla) |
| Existe parcial | 13 | Cubre una parte; la tabla dice cuál |
| Nuevo en este PR | 7 | Brecha de alto valor cerrada por este brief |
| Falta · alta | 4 | Vale la pena; exige diseño, migración o pantalla |
| Falta · media | 12 | Vale la pena; sin urgencia |
| Falta · baja | 6 | Se resuelve con otra herramienta o no justifica el costo |
| Diferido (bancos) | 12 | Depende de la sesión de Bancos y conciliación |
| No se porta | 45 | Módulos que 2.0 no trae (cámaras, dispositivos, líneas, correo, Slack, reseñas, licitaciones, puntaje de leads) |
| Fuera de alcance | 32 | Operaciones y personas: no son Comercial ni Finanzas (se anota el equivalente si existe) |
| **Total** | **217** | Las 7 «nuevas» son herramientas de 1.0 cubiertas por 6 capacidades nuevas |

De las 217, en **Comercial y Finanzas (CRM, CPQ, facturación, cobranza, cesión, flujo, bancos, reportes)** el bot queda cubierto en lo esencial: lectura completa, escritura con vista previa y aprobación humana de lo irreversible.

### 4.2 Tabla 1.0 → 2.0

Los nombres de 2.0 son los de la herramienta MCP (`.` de la capacidad pasa a `_`); cada escritura tiene además su `preview_`. Los equivalentes se verificaron contra `herramientas-mcp.txt`.

| Herramientas de 1.0 | Estado | Equivalente en 2.0 | Nota |
| --- | --- | --- | --- |
| `get_user_context` | Existe | `core_me` |  |
| `get_tenant_summary` | Existe | `core_tenant_get`, `core_resumen_contadores` |  |
| `get_uf_utm` | Nuevo en este PR | `core_indicadores_uf_utm` | UF en centavos y UTM; no inventa valores |
| `get_pending_rendiciones` | Falta · media | — | Rendiciones no existe en 2.0 (auditoría CAR-163, PR #241) |
| `search_all`, `resolve_entity` | Existe parcial | `core_buscar` | Cubre cuentas, instalaciones, personas y contactos; no negocios, cotizaciones ni DTE (usar sus listas con q) |
| `search_accounts` | Existe | `core_cuentas_list` |  |
| `get_account_detail` | Existe | `core_cuentas_get` |  |
| `list_account_documents`, `get_entity_documents` | Existe | `core_documentos_list` |  |
| `search_contacts` | Existe | `core_contactos_list` |  |
| `search_installations` | Existe | `core_instalaciones_list` |  |
| `search_deals` | Existe | `comercial_negocios_list` |  |
| `get_deal` | Existe | `comercial_negocios_get` |  |
| `get_deal_pipeline` | Existe | `comercial_negocios_embudo` |  |
| `get_deal_notes`, `list_deal_meetings`, `get_deal_communications` | Existe | `core_actividades_timeline` |  |
| `list_deal_tasks`, `get_my_reminders` | Existe | `core_actividades_tareas` |  |
| `add_deal_note`, `add_deal_meeting`, `log_deal_contact`, `create_reminder` | Existe | `core_actividades_create` | Tipo nota, reunión, llamada, correo o tarea |
| `complete_reminder` | Existe | `core_actividades_completar` |  |
| `create_deal_checklist` | Falta · baja | — | Se reemplaza creando varias tareas con core_actividades_create |
| `list_deals_to_correct`, `list_negotiation_alerts` | Nuevo en este PR | `comercial_negocios_alertas` | Sin monto, sin fecha de cierre, cierre vencido y sin actividad |
| `get_lost_deals_by_reason` | Nuevo en este PR | `comercial_informes_perdidos_por_motivo` |  |
| `get_crm_close_report` | Nuevo en este PR | `comercial_informes_cierre` | Ganados y perdidos por mes, responsable u origen |
| `get_lead_channel_report` | Falta · media | — | Embudo solicitud a negocio por canal; los datos están (solicitudes y canales), falta el informe |
| `list_leads_sla` | Falta · media | — | SLA de primer contacto de solicitudes; sin informe |
| `search_leads` | Existe | `comercial_solicitudes_list` |  |
| `get_lead` | Existe | `comercial_solicitudes_get` |  |
| `create_lead` | Existe | `comercial_solicitudes_create` | Canal agente |
| `create_lead_from_email`, `create_crm_from_email` | Falta · media | — | Depende del buzón de correo, que 2.0 no trae; entra por comercial_solicitudes_create |
| `update_lead` | Existe | `comercial_solicitudes_enriquecer` |  |
| `approve_lead`, `convert_lead` | Existe | `comercial_solicitudes_convertir` | Con aprobación humana |
| `reject_lead` | Existe | `comercial_solicitudes_descartar` |  |
| `delete_lead` | No se porta | — | 2.0 archiva y descarta; no borra solicitudes |
| `set_lead_score_weights`, `set_lead_ack` | No se porta | — | Puntaje y acuse de leads: 2.0 no los trae |
| `create_account` | Existe | `core_cuentas_create` |  |
| `update_account` | Existe | `core_cuentas_update` |  |
| `create_contact` | Existe | `core_contactos_create` |  |
| `update_contact` | Existe | `core_contactos_update` |  |
| `create_deal` | Existe | `comercial_negocios_create` |  |
| `update_deal`, `set_deal_bot_owner`, `get_deal_bot_owner` | Existe | `comercial_negocios_update` | Incluye responsable |
| `set_deal_status` | Existe | `comercial_negocios_mover`, `comercial_negocios_ganar`, `comercial_negocios_perder`, `comercial_negocios_reabrir` | El estado sale de la etapa |
| `delete_deal` | Existe parcial | `comercial_negocios_archivar` | 2.0 archiva, no borra |
| `create_installation` | Existe | `core_instalaciones_create` |  |
| `update_installation` | Existe | `core_instalaciones_update` |  |
| `bulk_update_installations` | Falta · baja | — | Se hace una a una con core_instalaciones_update |
| `set_installation_supervisor` | Existe | `core_supervisores_asignar` |  |
| `list_account_review_requests`, `set_review_request_status`, `draft_success_case` | No se porta | — | Reseñas Google y casos de éxito: fuera de 2.0 por ahora |
| `search_emails`, `search_emails_semantic`, `count_emails`, `get_email_thread`, `summarize_email_thread`, `read_email_attachments`, `mailbox_coverage` | No se porta | — | 2.0 no trae buzón de correo para el bot (el correo entrante alimenta solo el seguimiento comercial) |
| `slack_channel_context` | No se porta | — | Slack como módulo está en backlog |
| `add_history_event`, `get_history_event`, `list_history`, `history_digest` | Existe parcial | `core_actividad_list`, `core_audit_list` | El historial 1.0 se reparte entre actividades y auditoría |
| `create_file_upload_url`, `stage_file_upload`, `attach_file_to_entity` | Existe | `core_documentos_iniciar_subida`, `core_documentos_confirmar_subida`, `core_documentos_vincular` | Subida firmada en dos pasos |
| `read_document` | Falta · media | — | Leer el texto de un documento subido; hoy solo hay core_documentos_url_descarga |
| `search_quotes` | Existe | `cpq_cotizaciones_list` |  |
| `get_quote_detail` | Existe | `cpq_cotizaciones_get`, `cpq_cotizaciones_ficha` |  |
| `get_quote_share_link` | Falta · media | — | Enlace al portal con PIN; el envío conjunto cubre el correo |
| `list_cpq_roles` | Existe | `core_cargos_list` | Los roles de CPQ son cargos |
| `create_quote` | Existe | `cpq_cotizaciones_create` |  |
| `clone_quote` | Existe | `cpq_cotizaciones_clonar` |  |
| `update_quote`, `update_quote_parameters` | Existe | `cpq_versiones_parametros` |  |
| `update_quote_margin` | Existe | `cpq_versiones_margen`, `cpq_secciones_margen` |  |
| `update_quote_status` | Existe | `cpq_cotizaciones_marcar_lista`, `cpq_cotizaciones_solicitar_aprobacion` |  |
| `add_quote_position` | Existe | `cpq_lineas_crear` |  |
| `update_quote_position` | Existe | `cpq_lineas_actualizar` |  |
| `remove_quote_position` | Existe | `cpq_lineas_quitar` |  |
| `manage_quote_lines`, `manage_quote_extras`, `manage_quote_includes` | Existe | `cpq_lineas_crear`, `cpq_lineas_actualizar`, `cpq_lineas_reordenar` |  |
| `delete_quote` | Falta · baja | — | 2.0 no borra cotizaciones; se retira la aprobación o se deja sin enviar |
| `get_quote_proposal` | Existe | `cpq_propuestas_tecnica_get` |  |
| `propuesta_editar_seccion` | Existe | `cpq_propuestas_tecnica_update` |  |
| `send_quote_proposal` | Existe | `cpq_envios_propuesta_solicitar`, `cpq_envios_propuesta_aprobar` | Irreversible: aprobación humana |
| `export_quote_proposal_pdf` | Existe | `cpq_cotizaciones_preview_pdf`, `cpq_propuestas_tecnica_preview_pdf` |  |
| `licitacion_aplicar_cambio`, `licitacion_aplicar_indice`, `licitacion_estado`, `licitacion_generar_secciones`, `licitacion_regenerar_seccion`, `link_external_tender`, `list_external_tenders`, `get_external_tender` | No se porta | — | Licitaciones llega en una fase posterior del ROADMAP (aún no existe el módulo) |
| `get_finance_summary`, `get_finance_dashboard_kpis` | Existe parcial | `finanzas_hoy_resumen`, `finanzas_reportes_resultados`, `finanzas_cobranza_resumen` | Resumen del día más resultado por mes |
| `flow_cashflow_overview` | Existe | `finanzas_planilla_obtener` | Planilla de flujo de caja |
| `get_sales_report` | Existe parcial | `finanzas_ventas_libro_resumen`, `finanzas_reportes_resultados` | Ventas del libro y resultado por mes |
| `get_income_statement` | Nuevo en este PR | `finanzas_reportes_resultados` | Resultado operacional sin IVA; no es contable |
| `get_balance_sheet` | Falta · media | — | Requiere asientos contables, que 2.0 no trae |
| `get_profitability` | Falta · alta | — | Rentabilidad por instalación y cliente: exige imputar costos a instalación (hoy solo centro de costo en compras); diseño pendiente |
| `search_dtes` | Nuevo en este PR | `finanzas_ventas_buscar`, `finanzas_compras_listar` | Ventas por RUT, folio, cesión, fechas y montos; compras con sus filtros |
| `get_dte_detail` | Existe | `finanzas_ventas_obtener` |  |
| `search_received_dtes` | Existe | `finanzas_compras_listar` |  |
| `update_dte_cost_center` | Existe parcial | `finanzas_compras_asignar_centro` | Solo documentos recibidos; los emitidos no llevan centro de costo |
| `shift_cashflow_item` | Existe | `finanzas_celdas_mover` |  |
| `list_bank_movements` | Existe | `finanzas_movimientos_bancarios_listar` |  |
| `list_flow_rows` | Existe | `finanzas_filas_listar` |  |
| `import_bank_movements` | Existe | `finanzas_cartolas_importar` |  |
| `get_bank_movement`, `get_bank_triage_summary`, `get_bank_reconciliation_status`, `compare_bank_statement`, `reconcile_bank_balance`, `resolve_bank_duplicates`, `classify_bank_to_flow_row`, `authorize_bank_movements` | Diferido (bancos) | — | Bancos: otra sesión (entrada automática con Web4Leads) trabaja esa zona |
| `auto_reconcile_factoring`, `match_bank_to_factoring`, `link_bank_to_cession`, `list_factoring_batch` | Diferido (bancos) | — | Conciliación de factoring: depende de bancos y conciliación (otra sesión) |
| `list_cession_operations` | Existe | `finanzas_cesiones_listar` |  |
| `cede_dtes` | Existe | `finanzas_ventas_cesion_simular`, `finanzas_ventas_cesion_ceder` | Cesión irreversible: aprobación humana |
| `list_factoring_companies`, `create_factoring_company` | Falta · baja | — | Catálogo de factorings: 2.0 usa el adaptador de cesión del tenant |
| `search_invoice_drafts` | Existe | `finanzas_ventas_buscar` | estadoDte = borrador |
| `create_invoice_draft` | Existe | `finanzas_ventas_crear_borrador` |  |
| `update_invoice_draft_lines`, `update_invoice_draft_recipients`, `update_invoice_draft_refs` | Falta · alta | — | Editar líneas, destinatarios y referencias de un borrador: no hay capacidad; requiere diseño de la edición |
| `emit_invoice_draft` | Existe | `finanzas_ventas_emitir` | Irreversible: aprobación humana |
| `discard_invoice_draft` | Falta · media | — | Descartar un borrador: no hay capacidad |
| `resend_invoice_draft_document` | Existe | `finanzas_ventas_enviar_cliente` |  |
| `create_credit_note_draft`, `emit_credit_note` | Existe | `finanzas_ventas_emitir_nota_credito` |  |
| `create_debit_note_draft`, `emit_debit_note` | Falta · media | — | Nota de débito (56): 2.0 emite solo 33, 34 y 61 |
| `search_recurring_invoices` | Existe | `finanzas_ventas_programacion_listar`, `finanzas_ventas_programacion_obtener` |  |
| `create_recurring_invoice` | Existe | `finanzas_ventas_programacion_crear` |  |
| `update_recurring_invoice_body`, `update_recurring_invoice_recipients`, `update_recurring_invoice_refs`, `update_recurring_invoice_schedule` | Existe | `finanzas_ventas_programacion_actualizar`, `finanzas_ventas_programacion_cambiar_estado` |  |
| `mark_billing_doc_sent` | Falta · baja | — | Marcar manualmente un documento como enviado |
| `get_billing_month_close` | Falta · media | — | Cierre del mes de facturación (qué falta emitir); partes en finanzas_hoy_resumen |
| `get_billing_email_subjects`, `update_billing_email_subjects` | Existe parcial | `core_plantillas_get`, `core_plantillas_update` | Asuntos de correo de cobranza como plantillas |
| `list_billing_followups`, `get_billing_followup` | Existe | `finanzas_cobranza_resumen`, `finanzas_cobranza_deudor` |  |
| `set_billing_followup_status` | Existe | `finanzas_cobranza_registrar_gestion`, `finanzas_cobranza_pausar` |  |
| `create_ticket` | Fuera de alcance | `tickets_tickets_crear` |  |
| `comment_ticket` | Fuera de alcance | `tickets_tickets_comentar` |  |
| `transition_ticket`, `take_ticket` | Fuera de alcance | `tickets_tickets_cambiar_estado` |  |
| `reassign_ticket` | Fuera de alcance | `tickets_tickets_reasignar` |  |
| `get_my_tickets`, `get_tickets_summary` | Fuera de alcance | `tickets_tickets_obtener`, `tickets_tickets_listar` |  |
| `change_ticket_priority` | Fuera de alcance | — | Cambiar prioridad: sin herramienta propia |
| `create_ronda`, `update_ronda`, `set_ronda_schedule`, `toggle_ronda` | Fuera de alcance | `rondas_plantillas_crear`, `rondas_programaciones_fijar` |  |
| `list_rondas`, `get_rondas_status` | Fuera de alcance | `rondas_plantillas_listar` |  |
| `apply_ops_pauta` | Fuera de alcance | `pauta_mes_leer`, `pauta_series_fijar` |  |
| `create_ops_puesto`, `update_ops_puesto`, `list_ops_puestos` | Fuera de alcance | `core_puestos_create`, `core_puestos_update`, `core_puestos_list` |  |
| `upsert_guardia_persona`, `get_guardia_detail`, `search_guardias` | Fuera de alcance | `core_personas_create`, `core_personas_update`, `core_personas_get`, `core_personas_list` |  |
| `assign_guardia`, `list_guardia_assignments` | Fuera de alcance | `core_vinculos_create`, `core_vinculos_list` |  |
| `list_salary_structures`, `upsert_salary_structure` | Fuera de alcance | `core_estructuras_list`, `core_estructuras_create` |  |
| `list_guardia_documents` | Fuera de alcance | `core_documentos_list` |  |
| `get_daily_absences`, `get_daily_attendance`, `get_extra_shifts`, `get_guardias_metrics` | Fuera de alcance | `pauta_resumen_leer` |  |
| `get_portal_adoption`, `list_portal_ranking` | Fuera de alcance | `portal_cliente_resumen_leer` |  |
| `create_camera`, `update_camera`, `delete_camera`, `get_camera`, `list_cameras`, `list_camera_brands`, `create_camera_layout`, `update_camera_layout`, `delete_camera_layout`, `list_camera_layouts`, `test_camera_connection`, `ptz_camera`, `create_device`, `update_device`, `get_device`, `list_devices`, `create_phone_line`, `update_phone_line`, `get_phone_line`, `list_phone_lines`, `assign_phone_line`, `get_panic_alerts`, `get_supervision_visits` | No se porta | — | Cámaras, dispositivos, líneas telefónicas, alertas de pánico y visitas de supervisión: backlog de 2.0 (sin demanda) |

### 4.3 Brechas pendientes por prioridad

**Alta**

1. **Editar un borrador de factura** (`update_invoice_draft_lines`, `_recipients`, `_refs`). No hay capacidad; hoy se corrige descartando y creando otro. Exige definir qué se puede editar tras la vista previa y cómo se revalida el cálculo de montos. Sin migración. Es la brecha más pedida para la facturación del bot.
2. **Rentabilidad** (`get_profitability`). Necesita imputar costos a instalación y cliente; hoy las compras solo llevan centro de costo. Probable migración y diseño.

**Media**

3. Descartar un borrador de factura (`discard_invoice_draft`): capacidad de escritura sin migración.
4. Nota de débito (56): 2.0 emite 33, 34 y 61.
5. Informe de embudo por canal (`get_lead_channel_report`) y SLA de solicitudes (`list_leads_sla`): lecturas sin migración sobre solicitudes y canales.
6. Cierre del mes de facturación (`get_billing_month_close`): lectura sin migración sobre programaciones y corridas.
7. Enlace de cotización con PIN para WhatsApp (`get_quote_share_link`): hoy el envío conjunto cubre el correo.
8. Leer el texto de un documento subido (`read_document`).
9. Balance (`get_balance_sheet`): requiere asientos contables, que 2.0 no tiene.
10. Rendiciones pendientes (`get_pending_rendiciones`): el módulo no existe (auditoría CAR-163, PR #241).
11. Búsqueda global que incluya negocios, cotizaciones y DTE: ampliar `core_buscar` toca la paleta ⌘K, que es pantalla.

**Diferido a la sesión de Bancos**: detalle, triage y estado de conciliación de movimientos, comparar cartola, cuadrar saldo, duplicados, clasificar, autorizar, y la conciliación y vínculo de factoring.

## 5. Archivos

| Ruta | Función | Acción |
|---|---|---|
| `packages/capabilities/src/comercial/informes-calculo.ts` | Cálculo puro (monto mensual, porcentaje, alertas) | Archivo nuevo |
| `packages/capabilities/src/comercial/informes-perdidos.ts` | `comercial.informes.perdidos_por_motivo` | Archivo nuevo |
| `packages/capabilities/src/comercial/informes-cierre.ts` | `comercial.informes.cierre` | Archivo nuevo |
| `packages/capabilities/src/comercial/negocios-alertas.ts` | `comercial.negocios.alertas` | Archivo nuevo |
| `packages/capabilities/src/comercial/index.ts` | Registro | Editar |
| `packages/capabilities/src/finanzas/resultados-calculo.ts` | Cálculo puro del resultado por mes | Archivo nuevo |
| `packages/capabilities/src/finanzas/reportes-resultados.ts` | `finanzas.reportes.resultados` | Archivo nuevo |
| `packages/capabilities/src/finanzas/ventas-buscar.ts` | `finanzas.ventas.buscar` | Archivo nuevo |
| `packages/capabilities/src/finanzas/index.ts` | Registro | Editar |
| `packages/capabilities/src/core/indicadores-uf-utm.ts` | `core.indicadores.uf_utm` | Archivo nuevo |
| `packages/capabilities/src/core/index.ts` | Registro | Editar |
| `packages/capabilities/src/manuales/operar-grokbot.ts`, `index.ts` | Copia del manual servida por MCP (`opai://manuales/operar-grokbot`) | Archivo nuevo y editar |
| `docs/2.0/agentes/operar-grokbot.md`, `agentes/README.md` | Manual | Archivo nuevo y editar |
| `packages/capabilities/test/*.test.ts` | Pruebas de cada capacidad y del manual | Archivos nuevos |
| `packages/capabilities/test/__snapshots__/herramientas-mcp.txt`, `docs/2.0/paridad/mcp-inventario.md` | Instantánea e inventario | Regenerar |
| `docs/2.0/ESTADO.md` | Estado | Editar |

## 6. Modelo de datos y migraciones

Ninguna. Todas las capacidades leen tablas existentes (`comercial.negocios`, `comercial.motivos_perdida`, `core.actividades`, `finanzas.documentos_emitidos`, `finanzas.documentos_recibidos`, `core.indicadores_legales`) por `ctx.db` (RLS por tenant). Los indicadores UF y UTM son globales y solo de lectura.

## 7. Capacidades

| Capacidad (herramienta MCP) | Permiso | Efecto | dryRun |
|---|---|---|---|
| `comercial.informes.perdidos_por_motivo` | `comercial:negocios.read` | lectura | no |
| `comercial.informes.cierre` | `comercial:negocios.read` | lectura | no |
| `comercial.negocios.alertas` | `comercial:negocios.read` (inactividad exige además `core:actividades.read`) | lectura | no |
| `finanzas.reportes.resultados` | `finanzas:read` | lectura | no |
| `finanzas.ventas.buscar` | `finanzas:read` | lectura | no |
| `core.indicadores.uf_utm` | cualquier sesión autenticada (datos públicos del SII) | lectura | no |

Son lecturas: no tienen `preview_` ni requieren `idempotencyKey`. Reglas de cálculo:

- **Montos de negocio:** valor mensual de la cotización vigente o, si no hay, el estimado; CLP enteros. Porcentajes enteros 0–100 (no son dinero).
- **Resultado por mes:** ventas por fecha de emisión sin borradores y compras por fecha de recepción, ambas **sin IVA** (neto más exento); la nota de crédito resta y la de débito suma. Rango de 1 a 24 meses. No es un estado de resultados contable.
- **Alertas:** monto 0 en etapa que exige monto, falta de fecha de cierre en etapa que la exige, cierre estimado anterior a hoy y días sin actividad (por defecto 14, sin contar tareas). Sin permiso de actividades no se evalúa la inactividad y la respuesta lo dice.
- **UF y UTM:** la UF va en centavos de CLP y se toma del día exacto; si falta, devuelve la última anterior con `exacta: false`. Nunca inventa un valor.

## 8. Interfaz y responsive

No aplica: sin pantallas nuevas. Cada capacidad nueva no tiene pantalla propia; el gate de paridad exige pantalla→MCP, no al revés.

## 9. Seguridad y tenant

- El tenant sale de la sesión o de la key; las consultas pasan por `ctx.db` (RLS). Nada de SQL crudo.
- Los informes agregados no revelan negocios ni personas (`auditarLectura` vacío). Las alertas y el ranking registran en la auditoría de lecturas solo los IDs revelados.
- La inactividad usa `filtrarVisibles` (alcance por filas, ADR-022): una actividad fuera del alcance del actor no cuenta.
- Los nombres de responsable y origen se consultan solo por los IDs que aparecen en el informe, nunca la lista completa de usuarios.
- Texto de terceros (títulos, glosas, notas) se trata como dato; ninguna capacidad nueva escribe.
- Key del bot: tipo `servicio`, sin `*` ni `platform`, con presupuesto y vencimiento; el manual explica los permisos mínimos y que las acciones irreversibles quedan en aprobación humana.

## 10. Casos límite

- Sin negocios perdidos en el rango: `totalPerdidos` 0 y lista vacía. Perdidos sin motivo: fila «Sin motivo registrado».
- Rango de informes con `desde` mayor que `hasta`: el resultado queda vacío. En el resultado por mes, un rango invertido o de más de 24 meses responde `UNPROCESSABLE`.
- Meses sin documentos aparecen en cero (la serie es continua).
- Cuenta o proveedor eliminado: el ranking muestra «—» en vez de fallar.
- `finanzas.ventas.buscar` con RUT y cuenta que no coinciden: lista vacía. RUT con puntos o espacios: se normaliza.
- UF sin publicar: `uf: null` o `exacta: false`; UTM del mes anterior marcada `exacta: false`.
- Embudo con más de 500 negocios abiertos: las alertas miran los 500 más antiguos (igual que el tablero).

## 11. Plan por bloques (un commit por bloque)

1. `comercial:` informes y alertas de negocios para agentes.
2. `finanzas:` resultado por mes y búsqueda avanzada de ventas para agentes.
3. `core:` indicadores UF y UTM del día para agentes.
4. `docs:` brief 31, manual `operar-grokbot` y su escenario de prueba (ADR-034).
5. `docs:` `ESTADO.md` y cierre.

## 12. Tests obligatorios

- Cálculo puro: monto mensual, porcentaje, días entre fechas, alertas con y sin permiso de actividades, meses entre períodos (cruce de año), NC que resta, ranking estable.
- Cada capacidad contra el contexto de prueba: agrupaciones, rangos, filtros, permiso (`FORBIDDEN`), entrada inválida (`INVALID_INPUT`), rangos inválidos (`UNPROCESSABLE`), salida válida.
- Escenario del manual (`test/manuales/operar-grokbot.test.ts`): la copia servida por MCP es idéntica al documento; toda herramienta nombrada existe en la instantánea; recorre la secuencia (contexto, indicadores, alertas, informes, resultado, búsqueda, escritura con vista previa e idempotencia, y lo irreversible en aprobación).
- Paridad: instantánea de herramientas e inventario regenerados.

## 13. Validación

`pnpm install`, `pnpm typecheck && pnpm lint && pnpm test`. `pnpm test:db` no se corre: no se toca base ni RLS, y no hay `DATABASE_URL_TEST` en este entorno. Tras desplegar: `OPAI_MCP_KEY=<key> pnpm mcp:verificar` y `tools/list` en `main` con las seis herramientas nuevas.

## 14. Criterios de aceptación

- [ ] Tabla 1.0 → 2.0 completa (217 herramientas) con brechas priorizadas.
- [ ] Seis herramientas MCP nuevas visibles en `tools/list` en `main`; gate de paridad en verde.
- [ ] Sin migración, sin pantallas, sin cambios en Bancos ni en `.github/workflows/`.
- [ ] Manual `operar-grokbot.md` publicado como recurso MCP, con escenario de prueba en `pnpm test`.
- [ ] `typecheck`, `lint` y `test` en verde; archivos de hasta 150 líneas; sin `any`.
- [ ] `ESTADO.md` con lo que entró, lo pendiente y el riesgo.

## 15. Riesgos y rollback

- **Resultado por mes no es contabilidad.** Un bot podría presentarlo como estado de resultados. Mitigación: la descripción de la capacidad y el manual lo dicen; `get_balance_sheet` queda como brecha.
- **Rendimiento:** `finanzas.reportes.resultados` lee los documentos del rango (hasta 24 meses) y los suma en memoria. Para el volumen actual de Gard es aceptable; si crece, pasa a `groupBy` por mes.
- **Alertas y actividades:** el cálculo de inactividad depende de que las actividades estén vinculadas al negocio. Negocios sin actividades registradas usan su fecha de creación.
- **Revisión de la key del bot** (CAR-56): una key mal permisada es el mayor riesgo; el manual pide tipo `servicio`, permisos mínimos, presupuesto y vencimiento.
- **Rollback:** revertir el PR; no hay migraciones ni datos escritos.

## 16. Reporte de ejecución

Ver la descripción del PR y `ESTADO.md`.

## 17. Resumen ejecutivo para Carlos

Se inventariaron las 217 herramientas del MCP de 1.0: 86 ya existen en 2.0, 13 existen parcialmente, 7 se cerraron en este PR (informes de cierre y pérdidas, alertas de negocios, resultado por mes, búsqueda de ventas por RUT y cesión, UF y UTM) y las brechas que quedan están priorizadas. Para Gard: el bot puede operar Comercial y Finanzas sobre 2.0 con una key de servicio de permisos mínimos; lo irreversible (emitir, enviar al SII, ceder, ganar, enviar propuesta) queda en aprobación humana. Decide Carlos: crear la key (tipo servicio, scopes `core`, `comercial`, `cpq`, `finanzas`, presupuesto y vencimiento) y si la edición de borradores de factura es lo siguiente. Sigue: editar y descartar borradores, nota de débito y los informes de canal y SLA.
