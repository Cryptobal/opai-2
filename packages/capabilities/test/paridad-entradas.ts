/**
 * Entradas de servidor de apps/web (acciones `"use server"` y rutas `app/**\/route.ts`) y cómo
 * llegan a una capacidad (ADR-055). Toda entrada nueva se agrega aquí con su motivo, o el gate de
 * `paridad-inventario.test.ts` falla: así ninguna pantalla escribe o lee datos de negocio por un
 * camino que el MCP no tenga. Las que no invocan capacidades son de identidad (sesión humana,
 * Better Auth), infraestructura o el propio cliente MCP/API; nunca datos de negocio.
 */
export const ENTRADAS_SERVIDOR: Readonly<Record<string, string>> = {
  // Pasarelas: ejecutan la capacidad que se les pide con las reglas de siempre (MCP equivalente).
  "app/_acciones/capacidad.ts#ejecutarCapacidad":
    "Pasarela de la UI: ejecuta cualquier capacidad no interna (su herramienta MCP es la de esa capacidad).",
  "app/api/v1/[...capability]/route.ts":
    "API v1: ejecuta la capacidad de la URL con las mismas reglas que el MCP.",
  "app/api/mcp/[[...transport]]/route.ts": "Servidor MCP (Authorization: Bearer).",
  "app/api/mcp/k/[key]/[[...transport]]/route.ts":
    "Servidor MCP con la key en la URL: deprecado (410 Gone salvo MCP_KEY_EN_URL_HASTA).",
  "app/_acciones/validar-fichas-nav.ts#validarFichasNav":
    "Lee fichas fijadas con core.{cuentas,instalaciones,personas,cargos}.get (herramientas MCP existentes).",
  "app/_acciones/validar-fichas-nav.ts#revisarFichasNav":
    "Igual que validarFichasNav: solo capacidades .get con alcance, ya expuestas por MCP.",
  "app/_acciones/candidatos-documento.ts#buscarCandidatosDocumento":
    "Selector «Vincular a» del explorador de Documentos: lee con core.{cuentas,instalaciones,personas}.list (herramientas MCP existentes, alcance en la consulta) y devuelve solo id y nombre.",
  "app/api/geo/mapa/route.ts":
    "Proxy de imagen de core.geo.mapa (interna con motivo en EXCEPCIONES_PARIDAD): una imagen no sirve a un agente.",
  "app/api/pauta/export/route.ts":
    "Descarga de pauta.exportar (CSV/PDF) con sesión; mismo permiso y datos que la herramienta MCP pauta_exportar.",
  "app/api/marca/[slug]/[asset]/route.ts":
    "URL pública de logos de la marca (ADR-028) para correos y PDF; la marca se lee y cambia con core.marca.get/update por MCP.",
  "app/api/existe/route.ts":
    "Infraestructura del proxy (404 real con Cache Components) usando las mismas capacidades .get que la página.",
  "app/api/agente/route.ts":
    "Agente interno (ADR-049): agente.turno.preparar/agente.plan.confirmar (solo personas, con motivo); un agente externo usa el MCP.",
  // Identidad y sesión humana: no son datos de negocio ni acciones que un agente haga por nadie.
  "app/_acciones/capacidad.ts#cambiarTenant":
    "Sesión humana: elige la empresa de la cookie; una key ya pertenece a una empresa.",
  "app/_acciones/auth.ts#accionEntrar":
    "Identidad: login con contraseña (Better Auth), solo personas.",
  "app/_acciones/auth.ts#accionGoogle": "Identidad: login con Google, solo personas.",
  "app/_acciones/auth.ts#accionSalir": "Identidad: cierra la sesión del navegador.",
  "app/_acciones/auth.ts#accionCambiarPassword":
    "Identidad: cambia la contraseña propia; un agente nunca toca credenciales (ADR-032).",
  "app/_acciones/auth.ts#accionPedirRecuperacion":
    "Identidad: recuperar contraseña, pública y con rate limit cerrado.",
  "app/_acciones/auth.ts#accionRestablecer":
    "Identidad: restablece la contraseña con el token del correo.",
  "app/_acciones/mfa.ts#accionVerificar": "Identidad: segundo factor de la sesión humana.",
  "app/_acciones/mfa.ts#accionIniciarMfa": "Identidad: enrola el segundo factor propio.",
  "app/_acciones/mfa.ts#accionConfirmarMfa":
    "Identidad: confirma el enrolamiento del segundo factor.",
  "app/_acciones/mfa.ts#accionDesactivarMfa": "Identidad: desactiva el segundo factor propio.",
  "app/(auth)/invitacion/[slug]/[token]/acciones.ts#verInvitacion":
    "Identidad: core.invitations.peek (interna con motivo): el token del enlace es la credencial.",
  "app/(auth)/invitacion/[slug]/[token]/acciones.ts#aceptarInvitacion":
    "Identidad: core.invitations.accept (interna con motivo): nadie acepta invitaciones por otro.",
  "app/(auth)/invitacion/[slug]/[token]/acciones.ts#registrarYAceptar":
    "Identidad: crea la cuenta propia y acepta la invitación.",
  "app/(auth)/invitacion/[slug]/[token]/acciones.ts#pedirNuevaInvitacion":
    "Identidad: core.invitations.request_new (interna con motivo), sin sesión.",
  "app/correccion/[slug]/[token]/accion.ts#accionResponder":
    "Asistencia: asistencia.correcciones.responder_enlace (interna con motivo): el enlace personal del correo y el RUT son la credencial; un agente no responde por el trabajador.",
  "app/firmar/[slug]/[token]/acciones.ts#verFirma":
    "Firma: core.firmas.ver_firmante (interna con motivo): el enlace personal es la credencial (firma.md §5).",
  "app/firmar/[slug]/[token]/acciones.ts#firmarPorEnlace":
    "Firma: core.firmas.firmar (interna con motivo): nadie firma por otro con su enlace (firma.md R19).",
  "app/firmar/[slug]/[token]/acciones.ts#rechazarPorEnlace":
    "Firma: core.firmas.rechazar (interna con motivo): nadie rechaza por otro con su enlace (firma.md R9).",
  "app/firmar/[slug]/[token]/acciones.ts#urlDocumentoPorEnlace":
    "Firma: core.firmas.documento_url (interna con motivo): el enlace personal es la credencial, igual que ver_firmante (firma.md R5).",
  "app/_acciones/ingreso-pin.ts#accionEntrarConPin":
    "Identidad: ingreso del Portal Trabajador con RUT + PIN (CAR-78, D-02); abre una sesión, no es una operación de negocio. Tope por RUT y origen con fallo cerrado; bloqueo y auditoría en @opai/auth.",
  "app/api/t/[slug]/solicitudes/route.ts":
    "Formulario web público: ejecuta comercial.solicitudes.recibir_formulario_web con la clave Bearer del canal (Brief 07 PR 2).",
  "app/api/t/[slug]/banco/web4leads/route.ts":
    "Receptor de movimientos bancarios de Web4Leads: firma HMAC por empresa; ejecuta finanzas.bancos.recibir_web4leads (interna).",
  "app/api/webhooks/resend/entrante/route.ts":
    "Receptor del correo entrante de Resend (CAR-67): firma Svix y token de la dirección <token>@respuestas.opai.cl; ejecuta comercial.seguimientos.recibir_correo (interna).",
  // Infraestructura: sin datos de negocio.
  "app/api/auth/[...all]/route.ts": "Better Auth (sesión, OAuth y verificación de correo).",
  "app/api/cron/programador/route.ts":
    "Cron (CRON_SECRET): encola trabajos; no es una acción de pantalla (ADR-029).",
  "app/api/cron/trabajos/route.ts": "Cron (CRON_SECRET): ejecuta la cola de trabajos (ADR-029).",
  "app/api/csp-report/route.ts": "Reportes CSP del navegador; solo logs categóricos.",
  "app/api/health/route.ts": "Salud del despliegue, sin datos.",
};
