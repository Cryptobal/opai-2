/**
 * Capacidades `core.*` que NO producen herramienta MCP para un owner con scope "*" (paridad UI↔MCP,
 * ADR-004 y ADR-034 §4). Todo lo demás que no sea `platform.*` debe aparecer en `tools/list`: si
 * falta, es un bug de paridad. El test verifica que esta lista coincida exactamente con las
 * capacidades `interna` o `soloPersonas` del registro (sin entradas obsoletas ni faltantes).
 */
export const EXCEPCIONES_PARIDAD: Readonly<Record<string, string>> = {
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
  "core.aprobaciones.aprobar": "Solo personas: lo irreversible lo aprueba un humano (ADR-032).",
  "core.aprobaciones.rechazar":
    "Solo personas: la decisión sobre lo irreversible es humana (ADR-032).",
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
  "core.cumplimiento.incidente_notificar":
    "Solo personas: dejar constancia del aviso de una brecha a la Agencia o a los titulares es un acto humano responsable (Ley 21.719, §16.5).",
  "core.roles.create":
    "Solo personas: gobierna el acceso; un agente no se crea roles ni se concede permisos (ADR-034).",
  "core.roles.update":
    "Solo personas: cambiar los permisos de un rol es gobernar el acceso (ADR-034).",
  "core.roles.archive":
    "Solo personas: archivar un rol es gobierno de acceso; un agente no lo hace (ADR-034).",
  "core.roles.assign":
    "Solo personas: asignar un rol a un usuario gobierna su acceso (ADR-034).",
  "core.excepciones.set":
    "Solo personas: conceder o denegar permisos puntuales es gobierno de acceso (ADR-034).",
  "core.supervisores.asignar":
    "Solo personas: fijar el alcance de un supervisor gobierna su acceso; un agente no lo hace (ADR-034).",
  "core.supervisores.quitar":
    "Solo personas: quitar instalaciones del alcance de un supervisor gobierna su acceso (ADR-034).",
};
