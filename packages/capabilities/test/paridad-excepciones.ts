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
};
