/**
 * Capacidades `core.*` que NO producen herramienta MCP para un owner con scope "*" (paridad UI↔MCP,
 * ADR-004 y ADR-034 §4). Todo lo demás que no sea `platform.*` debe aparecer en `tools/list`: si
 * falta, es un bug de paridad. El test verifica que esta lista coincida exactamente con las
 * capacidades `interna` o `soloPersonas` del registro (sin entradas obsoletas ni faltantes).
 */
export const EXCEPCIONES_PARIDAD: Readonly<Record<string, string>> = {
  "agente.turno.preparar":
    "Solo personas: la sesión humana delega su identidad al agente interno; una key no inicia otro agente.",
  "agente.plan.confirmar":
    "Solo personas: confirmar o rechazar un plan debe ser una decisión humana, nunca una herramienta del modelo.",
  "core.users.invite":
    "Solo personas: invitar asigna un rol y gobierna el acceso (encargo PR #70).",
  "core.invitations.peek":
    "Interna: se ejecuta antes de existir sesión (el token del enlace es la credencial).",
  "core.geo.mapa":
    "Interna: entrega la imagen del mapa al proxy `/api/geo/mapa` con la clave del tenant; una imagen no sirve a un agente y la clave nunca sale.",
  "core.invitations.accept":
    "Interna: crea la membresía de quien acepta el enlace; un agente no acepta invitaciones por nadie.",
  "core.invitations.request_new":
    "Interna: la pide quien aún no tiene sesión (token vencido o usado).",
  "core.apikeys.create": "Solo personas: una key no se crea keys ni ve secretos (ADR-032).",
  "core.apikeys.revoke": "Solo personas: gobierno de keys y credenciales (ADR-032).",
  "core.apikeys.update":
    "Solo personas: cambiar alcances de una key es gobernar agentes (ADR-032).",
  "core.apikeys.set_autonomia": "Solo personas: un agente no se da autonomía a sí mismo (ADR-032).",
  "core.integraciones.configurar":
    "Solo personas: credenciales del tenant; nunca salen ni se cambian por API ni MCP (ADR-027).",
  "core.integraciones.set_secreto":
    "Solo personas: secretos cifrados del tenant; nunca salen ni se cambian por API ni MCP (ADR-027).",
  "finanzas.folios.cargar_caf":
    "Solo personas: el XML del CAF incluye la llave privada; un agente no lo encola en aprobaciones (CAR-143).",
  "core.integraciones.guardar_certificado_dte":
    "Solo personas: certificado .pfx cifrado del tenant; nunca sale ni se cambia por API ni MCP (ADR-027, CAR-149).",
  "rendiciones.lotes.nomina_descargar":
    "Solo personas: el archivo de la nómina Santander contiene cuentas bancarias de personas (Ley 21.719); lo baja una persona con sesión por /api/rendiciones/lotes/[id]/nomina y no sale por MCP. El agente ve el lote con rendiciones.lotes.obtener y lo genera con rendiciones.lotes.generar_nomina, que no devuelve cuentas (CAR-208).",
  "core.personas.pago_aprobar_cambio":
    "Solo personas: cambia la cuenta bancaria de pago de una persona; lo aprueba un humano y no una key de otro administrador (ADR-032, CAR-225 C-01).",
  "core.personas.pago_rechazar_cambio":
    "Solo personas: la decisión sobre la cuenta bancaria de pago de una persona es humana (ADR-032, CAR-225 C-01).",
  "core.aprobaciones.aprobar": "Solo personas: lo irreversible lo aprueba un humano (ADR-032).",
  "core.aprobaciones.rechazar":
    "Solo personas: la decisión sobre lo irreversible es humana (ADR-032).",
  "platform.aprobaciones.aprobar":
    "Solo personas: lo irreversible de plataforma lo aprueba un humano (ADR-032, CAR-36).",
  "platform.aprobaciones.rechazar":
    "Solo personas: la decisión sobre lo irreversible de plataforma es humana (ADR-032, CAR-36).",
  "platform.indicadores.resolver":
    "Solo personas: aprobar un indicador legal cambia el cálculo de todas las empresas y lo decide un humano (ADR-032, CAR-193).",
  "core.users.restablecer_mfa":
    "Solo personas: quitar el segundo factor de otra cuenta lo decide un owner con sesión (CAR-54).",
  "platform.usuarios.restablecer_mfa":
    "Solo personas: quitar el segundo factor de una cuenta lo decide Plataforma con sesión (CAR-54).",
  "platform.usuarios.borrar":
    "Solo personas: borrar una identidad es irreversible y lo decide Plataforma con sesión (CAR-45).",
  "core.cumplimiento.dpa_aceptar":
    "Solo personas: aceptar el DPA por la empresa es un acto humano responsable (Ley 21.719, ADR-034).",
  "core.cumplimiento.dpo_set":
    "Solo personas: designar al delegado de protección de datos (DPO) gobierna el cumplimiento (Ley 21.719).",
  "core.cumplimiento.consentimiento_registrar":
    "Solo personas: registrar el consentimiento de un titular es un acto responsable del tenant (Ley 21.719, §16.2).",
  "core.cumplimiento.consentimiento_revocar":
    "Solo personas: dejar constancia de la revocación de un consentimiento es un acto responsable (Ley 21.719).",
  "core.cumplimiento.solicitud_crear":
    "Solo personas: atender una solicitud del titular (ARCO+) es un acto humano responsable (Ley 21.719, ADR-034).",
  "core.cumplimiento.solicitud_avanzar":
    "Solo personas: avanzar una solicitud del titular gobierna el cumplimiento y prueba la atención en plazo (Ley 21.719).",
  "core.cumplimiento.solicitud_resolver":
    "Solo personas: resolver o rechazar una solicitud del titular es una decisión humana responsable (Ley 21.719).",
  "core.cumplimiento.solicitud_exportar":
    "Solo personas: generar la exportación de datos de un titular (acceso/portabilidad) es un acto humano responsable (Ley 21.719).",
  "core.cumplimiento.incidente_registrar":
    "Solo personas: registrar un incidente o brecha es un acto humano responsable, no un detector automático (Ley 21.719, §16.5).",
  "core.cumplimiento.incidente_avanzar":
    "Solo personas: avanzar la atención de un incidente gobierna el cumplimiento (Ley 21.719).",
  "core.cumplimiento.titular_anonimizar":
    "Solo personas: anonimizar a un titular es irreversible y es la única purga forzada; la decide una persona responsable (Ley 21.719, §16.4).",
  "core.cumplimiento.incidente_notificar":
    "Solo personas: dejar constancia del aviso de una brecha a la Agencia o a los titulares es un acto humano responsable (Ley 21.719, §16.5).",
  "core.roles.create":
    "Solo personas: gobierna el acceso; un agente no se crea roles ni se concede permisos (ADR-034).",
  "core.roles.update":
    "Solo personas: cambiar los permisos de un rol es gobernar el acceso (ADR-034).",
  "core.roles.archive":
    "Solo personas: archivar un rol es gobierno de acceso; un agente no lo hace (ADR-034).",
  "core.roles.assign": "Solo personas: asignar un rol a un usuario gobierna su acceso (ADR-034).",
  "core.excepciones.set":
    "Solo personas: conceder o denegar permisos puntuales es gobierno de acceso (ADR-034).",
  "core.firmas.firmante_empresa_set":
    "Solo personas: define quién firma por la empresa (representante legal); gobierna la identidad de firma, no una key (firma.md §10, R16).",
  "core.firmas.firma_automatica_autorizar":
    "Solo personas: autorizar la firma automática del representante solo puede hacerlo él (firma.md §10, R16).",
  "core.firmas.firma_automatica_revocar":
    "Solo personas: revocar la firma automática del representante es un acto suyo (firma.md §10, R16).",
  "core.firmas.firmar":
    "Interna y solo personas: el enlace personal es la credencial (como al aceptar una invitación) y un agente nunca firma por una persona (firma.md R19, §10).",
  "core.firmas.rechazar":
    "Interna y solo personas: rechazar es un acto personal del firmante con su enlace como credencial; un agente nunca rechaza por nadie (firma.md R9, R19, §10).",
  "core.firmas.ver_firmante":
    "Interna: se mira antes de existir sesión con el enlace personal como credencial, igual que core.invitations.peek (firma.md §5).",
  "core.firmas.documento_url":
    "Interna: igual que ver_firmante, el enlace personal es la credencial antes de existir sesión (firma.md R5, A2 de la corrección PR 2).",
  "core.anexos.aprobar":
    "Solo personas: aprobar el anexo de contrato materializa un documento irreversible, un acto humano responsable (Brief 07b PR 4, ADR-032).",
  "core.anexos.rechazar":
    "Solo personas: rechazar el anexo de contrato es una decisión humana responsable (Brief 07b PR 4, ADR-032).",
  "cpq.compartir.ver":
    "Interna: la abre el cliente en /p/<slug>/<token> sin sesión, con el enlace revocable y con vencimiento como credencial; los agentes gestionan el enlace con cpq.compartir.crear y revocar.",
  "cpq.cotizaciones.aprobar":
    "Solo personas: es el control humano sobre lo que propone un agente (margen CPQ).",
  "cpq.cotizaciones.rechazar_aprobacion":
    "Solo personas: es el control humano sobre lo que propone un agente (margen CPQ).",
  "cpq.cotizaciones.enviar":
    "Interna legacy (CAR-144): el envío con regla A4 de márgenes va por cpq.envios_propuesta.solicitar en la ficha; se mantiene para tests y compatibilidad.",
  "core.remuneraciones.confirmar":
    "Solo personas: confirmar un valor legal del tenant es un acto humano responsable; deja constancia de quién confirmó (CAR-142, ADR-034).",
  "core.remuneraciones.confirmar_mutual":
    "Solo personas: registrar la mutual adicional del tenant es un acto humano responsable (CAR-142, ADR-034).",
  "comercial.importar_1_0":
    "Solo personas: carga masiva desde un export JSON de 1.0; gobierno de datos del tenant (CAR-25).",
  "finanzas.apertura.importar":
    "Solo personas: carga de apertura contable y de cobranza desde 1.0 (saldos, facturas y folios); gobierno de datos del tenant (CAR-168).",
  "finanzas.apertura.revertir":
    "Solo personas: deshace una carga de apertura desde 1.0; gobierno de datos del tenant (CAR-168).",
  "comercial.solicitudes.recibir_formulario_web":
    "Interna: el endpoint público `/api/t/[slug]/solicitudes` valida la clave del canal antes de existir sesión (Brief 07 PR 2).",
  "finanzas.bancos.recibir_web4leads":
    "Interna: la ruta pública `/api/t/[slug]/banco/web4leads` la ejecuta tras leer el cuerpo; la capacidad verifica la firma HMAC con el secreto de la empresa (la entrada de agentes es finanzas.bancos.sincronizar).",
  "comercial.seguimientos.recibir_correo":
    "Interna: la ruta pública `/api/webhooks/resend/entrante` la ejecuta tras verificar la firma Svix y resolver el token de la dirección <token>@respuestas.opai.cl (CAR-67).",
  "comercial.canales.rotar_token_formulario":
    "Solo personas: la clave del formulario es equivalente a una credencial de escritura anónima en el sitio del tenant.",
  "asistencia.marcas.registrar":
    "Solo personas: un agente nunca marca por un trabajador (la marca es un hecho regulado, ADR-023). Solo desde Terreno y Portal Trabajador.",
  "asistencia.rostro.estado":
    "Solo personas: lo consulta la propia persona (sesión) o el equipo del kiosco con su PIN; un agente no opera sobre la biometría de un trabajador (Ley 21.719).",
  "asistencia.rostro.iniciar_vida":
    "Solo personas: la prueba de vida la completa la cámara de quien marca o se enrola, y cada sesión tiene costo (CAR-89).",
  "asistencia.rostro.consentir":
    "Solo personas: el consentimiento expreso lo da el propio trabajador (L-13, T-04); un agente nunca consiente por él.",
  "asistencia.rostro.revocar":
    "Solo personas: la revocación es un derecho personal del trabajador y borra su biometría (L-14).",
  "asistencia.rostro.enrolar":
    "Solo personas: el rostro es un dato biométrico sensible (Ley 21.719); un agente nunca enrola a un trabajador. Lo hace la propia persona con prueba de vida.",
  "asistencia.telefono.habilitar":
    "Solo personas: habilitar el teléfono personal para marcar es una decisión de RR. HH. sobre el canal de una persona (T-04); gobierna la identificación y no se delega a agentes.",
  "asistencia.marcas.verificar":
    "Interna: la ruta pública `/verificar/marca/<slug>/<hash>` la ejecuta sin sesión; el hash de 256 bits es la credencial y solo muestra lo mínimo del comprobante.",
  "asistencia.correcciones.responder":
    "Solo personas: aceptar u objetar una corrección es un acto del propio trabajador; un agente nunca responde por él (ADR-023).",
  "asistencia.contingencias.responder":
    "Solo personas: aceptar u objetar una contingencia propuesta a su nombre es un acto del propio trabajador; un agente nunca responde por él (ADR-023).",
  "asistencia.correcciones.ver_enlace":
    "Interna: la página pública `/correccion/<slug>/<token>` la ejecuta sin sesión; el token de un solo uso del correo personal del trabajador es la credencial.",
  "asistencia.correcciones.responder_enlace":
    "Interna: la página pública `/correccion/<slug>/<token>` la ejecuta sin sesión; exige el token y el RUT del trabajador, y falla cerrada.",
  "core.credenciales_terreno.asignar_pin":
    "Solo personas: fija una credencial de identificación; un agente no debe poder elegir el PIN de nadie (CAR-78, D-02).",
  "core.credenciales_terreno.restablecer":
    "Solo personas: genera y revela un PIN temporal; un agente no debe poder obtenerlo (CAR-78, D-02).",
  "core.credenciales_terreno.cambiar_pin":
    "Solo personas: la propia persona cambia su PIN con el actual; es un acto personal que ningún agente hace por ella (CAR-78, D-02).",
  "core.hechos_terreno.recibir":
    "Interna: el equipo de terreno emparejado la ejecuta sin sesión (su cookie de dispositivo es la credencial) al enviar su cola; un agente no registra hechos de terreno por el equipo. Su lectura es core.hechos_terreno.listar (CAR-78 B3).",
  "core.personas_terreno.listar":
    "Interna: alimenta «¿Quién eres?» en el equipo emparejado sin sesión; un agente consulta personas con core.personas.list y su alcance (CAR-78 B3).",
  "core.biometria.enrolar":
    "Solo personas: la muestra es una imagen del rostro y no pasa por agentes ni por el MCP; el estado se consulta con core.biometria.estado y el borrado con core.biometria.borrar (CAR-78 B4).",
  "core.biometria.verificar":
    "Solo personas: la muestra es una imagen del rostro y no pasa por agentes ni por el MCP (CAR-78 B4).",
  "core.terreno.contexto":
    "Interna: arma el inicio por instalación y turno del equipo emparejado sin sesión (su cookie de dispositivo es la credencial); un agente consulta turnos con core.turnos.* y la instalación con core.instalaciones.get (CAR-78 E2).",
  "core.terreno.en_sitio":
    "Interna: la portería del equipo emparejado lee quiénes siguen dentro sin sesión (su cookie de dispositivo es la credencial); un agente usa acceso.registros.listar con su alcance (CAR-78 E4d).",
  "core.terreno.rondas":
    "Interna: «Mis rondas» del equipo emparejado lee sin sesión las rondas que puede iniciar y las que dejó abiertas (su cookie de dispositivo es la credencial); un agente usa rondas.plantillas.listar y rondas.puntos.listar con su alcance (CAR-78 E3e).",
};
