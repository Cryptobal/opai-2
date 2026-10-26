import { type DatoPersonalDeclarado, defineDatosPersonales } from "@opai/domain";

import { listarModulos } from "../../module";
import { INVENTARIO_CUMPLIMIENTO } from "./inventario-cumplimiento";

// Inventario de datos personales del Núcleo (RAT, Ley 21.719 §4.3). Pieza «por diseño»: un gate
// exige declarar toda tabla del Núcleo con datos personales (§16.6). La base de licitud es PROPUESTA
// (la confirma legal, §16.2); la retención sale del catálogo de @opai/domain (PR 3).
// Salud y biometría (los campos que se cifran, §16.4) aún no existen en el Núcleo: llegan con Asistencia
// (fase 4). Quien las declare con `camposSensibles` queda cifrado por `cifradoDeCampos` (cifrado-campos.ts).
// Hechos regulados (ADR-023): no borrables.
const INVENTARIO_BASE = defineDatosPersonales("core", [
  {
    tabla: "personas",
    finalidad: "Gestión del personal: identificación, contacto y domicilio de las personas trabajadoras.",
    categorias: ["identificacion", "contacto", "laboral"],
    campos: ["nombres", "apellidos", "rut", "email_personal", "email_laboral", "telefono", "fecha_nacimiento", "calle", "comuna", "region", "direccion_formateada"],
    baseLicitud: "relacion_laboral",
    reguladoNoBorrable: true,
    destinatarios: ["Cloudflare R2 (documentos de la persona)"],
  },
  {
    tabla: "vinculos_laborales",
    finalidad: "Registro del vínculo laboral de cada persona: cargo, fechas y término.",
    categorias: ["laboral"],
    campos: ["persona_id", "cargo_id", "tipo", "inicio", "termino", "motivo_termino"],
    baseLicitud: "obligacion_legal",
    reguladoNoBorrable: true,
  },
  {
    tabla: "estructuras_sueldo",
    finalidad: "Remuneración de la persona a nivel de estructura de sueldo (conceptos y montos).",
    categorias: ["economica", "laboral"],
    campos: ["sueldo_base", "colacion", "movilizacion", "gratificacion_monto"],
    baseLicitud: "obligacion_legal",
    reguladoNoBorrable: true,
  },
  {
    tabla: "cuentas",
    finalidad: "Datos de la cuenta cliente; cuando es persona natural, su nombre y RUT son personales.",
    categorias: ["identificacion"],
    campos: ["nombre", "rut"],
    baseLicitud: "contrato",
  },
  {
    tabla: "cuentas_representantes",
    finalidad: "Representante legal de una cuenta cliente (persona natural): nombre, RUT y correo.",
    categorias: ["identificacion", "contacto"],
    campos: ["nombre", "rut", "email"],
    baseLicitud: "contrato",
  },
  {
    tabla: "contactos",
    finalidad: "Contactos de las cuentas cliente para la relación comercial y operativa.",
    categorias: ["identificacion", "contacto"],
    campos: ["nombres", "apellidos", "email", "telefono"],
    baseLicitud: "contrato",
  },
  {
    tabla: "users",
    finalidad: "Usuarios del sistema: nombre y correo para el acceso y las notificaciones.",
    categorias: ["identificacion", "contacto"],
    campos: ["name", "email"],
    baseLicitud: "contrato",
  },
  {
    tabla: "sessions",
    finalidad: "Sesiones de acceso: IP y agente del navegador para la seguridad y la trazabilidad del ingreso.",
    categorias: ["identificacion"],
    campos: ["ip_address", "user_agent"],
    baseLicitud: "interes_legitimo",
  },
  {
    tabla: "login_intentos",
    finalidad: "Registro de intentos de acceso para frenar la fuerza bruta: correo en hash, IP y agente del navegador (07c, B1). Sin tenant.",
    categorias: ["identificacion"],
    campos: ["correo_hash", "ip", "user_agent"],
    baseLicitud: "interes_legitimo",
  },
  {
    tabla: "accounts",
    finalidad: "Credenciales de acceso del usuario: contraseña con hash y tokens del proveedor de identidad.",
    categorias: ["credenciales"],
    campos: ["password", "access_token", "refresh_token", "id_token"],
    baseLicitud: "contrato",
  },
  {
    tabla: "envios",
    finalidad: "Bitácora de envíos de notificaciones: el destinatario (correo o teléfono) de cada envío.",
    categorias: ["contacto"],
    campos: ["destinatario"],
    baseLicitud: "interes_legitimo",
  },
  {
    tabla: "invitations",
    finalidad: "Invitaciones a usuarios por correo, antes de que exista la cuenta.",
    categorias: ["contacto"],
    campos: ["email"],
    baseLicitud: "interes_legitimo",
  },
  {
    tabla: "audit_events",
    finalidad: "Auditoría append-only: qué usuario o agente ejecutó cada capacidad con efecto, para trazabilidad y seguridad (puede contener datos personales en el payload).",
    categorias: ["identificacion"],
    campos: ["actor_id", "via_user_id"],
    baseLicitud: "obligacion_legal",
    reguladoNoBorrable: true,
  },
  {
    tabla: "documentos",
    finalidad: "Documentos de personas, cuentas e instalaciones (contratos, certificados, cédulas): metadatos, nombre del archivo y quién lo subió.",
    categorias: ["identificacion", "laboral"],
    campos: ["nombre", "titulo", "creado_por_id", "via_user_id"],
    baseLicitud: "obligacion_legal",
    destinatarios: ["Cloudflare R2 (archivo del documento)"],
  },
  {
    tabla: "perfil_empresa",
    finalidad: "Representante legal y delegado de protección de datos (DPO) del tenant, y correos de contacto.",
    categorias: ["identificacion", "contacto"],
    campos: ["rut", "representante_nombre", "representante_rut", "representante_email", "correo_comercial", "correo_operaciones", "correo_finanzas", "correo_contacto", "telefono", "whatsapp", "dpo_nombre", "dpo_correo", "dpo_telefono"],
    baseLicitud: "obligacion_legal",
  },
]);

/** Inventario del Núcleo: identidad, maestros y servicios, más las tablas de cumplimiento. */
export const INVENTARIO_NUCLEO: DatoPersonalDeclarado[] = [...INVENTARIO_BASE, ...INVENTARIO_CUMPLIMIENTO];

/** Inventario consolidado: el Núcleo más lo que declara cada módulo en su manifest. */
export const listarInventario = (): DatoPersonalDeclarado[] => [
  ...INVENTARIO_NUCLEO,
  ...listarModulos().flatMap((m) => m.datosPersonales ?? []),
];
