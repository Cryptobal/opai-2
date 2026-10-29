// Etiquetas legibles de las columnas del inventario de datos personales (§4.3). El RAT muestra estas
// etiquetas en lenguaje de negocio, nunca el nombre de columna (ip_address, email_personal…). Un
// test exige que cada columna declarada en el inventario tenga etiqueta aquí, para que ninguna
// filtre su nombre técnico a la pantalla (hallazgo C10/C11 de la QA, Parte C).

export const ETIQUETA_CAMPO: Readonly<Record<string, string>> = {
  // personas
  nombres: "nombres",
  apellidos: "apellidos",
  rut: "RUT",
  email_personal: "correo personal",
  email_laboral: "correo laboral",
  telefono: "teléfono",
  fecha_nacimiento: "fecha de nacimiento",
  calle: "calle",
  comuna: "comuna",
  region: "región",
  direccion_formateada: "dirección",
  // vinculos_laborales
  persona_id: "persona",
  cargo_id: "cargo",
  tipo: "tipo de vínculo",
  inicio: "fecha de inicio",
  termino: "fecha de término",
  motivo_termino: "motivo de término",
  // estructuras_sueldo
  sueldo_base: "sueldo base",
  colacion: "colación",
  movilizacion: "movilización",
  gratificacion_monto: "gratificación",
  // cuentas / contactos / users
  nombre: "nombre",
  email: "correo",
  name: "nombre",
  // sessions / login_intentos
  ip_address: "dirección IP",
  ip: "dirección IP",
  user_agent: "navegador (user agent)",
  ip_cifrada: "dirección IP (cifrada)",
  correo_hash: "correo (HMAC, seudonimizado)",
  user_id: "usuario",
  // accounts
  password: "contraseña (hash)",
  access_token: "token de acceso",
  refresh_token: "token de refresco",
  id_token: "token de identidad",
  // envios
  destinatario: "destinatario de la notificación",
  // dpa_aceptaciones
  aceptado_por_id: "usuario que aceptó",
  aceptado_por: "nombre de quien aceptó",
  // audit_events
  actor_id: "usuario o agente",
  via_user_id: "usuario de la sesión",
  // documentos
  titulo: "título del documento",
  creado_por_id: "usuario que creó",
  // perfil_empresa
  representante_nombre: "nombre del representante legal",
  representante_rut: "RUT del representante legal",
  representante_email: "correo del representante legal",
  correo_comercial: "correo comercial",
  correo_operaciones: "correo de operaciones",
  correo_finanzas: "correo de finanzas",
  correo_contacto: "correo de contacto",
  whatsapp: "WhatsApp",
  dpo_nombre: "nombre del DPO",
  dpo_correo: "correo del DPO",
  dpo_telefono: "teléfono del DPO",
  // consentimientos / solicitudes_arco / incidentes (cumplimiento, PR 2)
  titular_id: "titular",
  titular_email: "correo del titular",
  titular_nombre: "nombre del titular",
  registrado_por: "quién lo registró",
  responsable_id: "responsable",
  actor: "usuario o agente",
  resultado: "resultado temporal de la acción",
  agente_interno_id: "agente interno",
  input: "datos de la solicitud",
  resuelta_por: "persona que decidió",
  api_key_id: "identidad del agente externo",
  gastado_micro: "consumo acumulado",
};

/** Etiqueta legible de un campo; si falta, devuelve el nombre crudo (un test impide que ocurra). */
export const etiquetaCampo = (col: string): string => ETIQUETA_CAMPO[col] ?? col;
