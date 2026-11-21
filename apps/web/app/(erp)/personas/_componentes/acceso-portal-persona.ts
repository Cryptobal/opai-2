/** Estado del acceso al portal del trabajador en la ficha de persona (CAR-803). */

export type EstadoAccesoPersona =
  | "sin_correo"
  | "invitacion_pendiente"
  | "sin_acceso"
  | "activo"
  | "pin_creado"
  | "no_disponible";

export type AccesoPersona = {
  estado: EstadoAccesoPersona;
  motivo?: string;
};

type Tono = "success" | "warning" | "neutro" | "danger" | "info";

export type VistaAccesoPersona = {
  etiqueta: string;
  tono: Tono;
  nota: string;
  darAcceso: boolean;
  reenviarInvitacion: boolean;
  vincular: boolean;
};

const MOTIVOS: Record<string, string> = {
  usuario_interno: "El correo pertenece a un usuario interno de la empresa.",
  portal_trabajador_apagado: "El portal del trabajador no está activo en esta empresa.",
};

export function vistaAccesoPersona(
  a: AccesoPersona,
  opts: { tieneUsuario: boolean; personaActiva: boolean },
): VistaAccesoPersona {
  const base = { darAcceso: false, reenviarInvitacion: false, vincular: false };
  switch (a.estado) {
    case "sin_correo":
      return {
        ...base,
        etiqueta: "Sin correo",
        tono: "neutro",
        nota: "Agrega un correo personal o laboral para enviar la invitación.",
      };
    case "invitacion_pendiente":
      return {
        ...base,
        etiqueta: "Invitación pendiente",
        tono: "warning",
        nota: "La invitación está vigente; puede reenviarse si hace falta.",
        reenviarInvitacion: true,
        darAcceso: true,
      };
    case "sin_acceso":
      return {
        ...base,
        etiqueta: "Sin acceso",
        tono: "neutro",
        nota: opts.personaActiva
          ? "Puedes dar acceso al portal o vincular un usuario existente."
          : "La persona no está activa.",
        darAcceso: opts.personaActiva,
        vincular: opts.personaActiva && !opts.tieneUsuario,
      };
    case "activo":
      return {
        ...base,
        etiqueta: "Acceso activo",
        tono: "success",
        nota: "Ya puede entrar; falta que cree su PIN en el primer ingreso.",
        reenviarInvitacion: true,
      };
    case "pin_creado":
      return {
        ...base,
        etiqueta: "Acceso listo",
        tono: "success",
        nota: "Tiene usuario y PIN de terreno.",
      };
    case "no_disponible":
      return {
        ...base,
        etiqueta: "No disponible",
        tono: "neutro",
        nota: (a.motivo && MOTIVOS[a.motivo]) || "No se puede gestionar el acceso desde aquí.",
      };
  }
}

export type ResultadoDarAccesoPersona = {
  estado: "ya_tiene_acceso" | "vinculado" | "invitado" | "invitacion_pendiente" | "sin_correo" | "no_aplica";
  motivo?: string;
};

export function mensajeDarAccesoPersona(r: ResultadoDarAccesoPersona): { exito: boolean; texto: string } {
  switch (r.estado) {
    case "invitado":
      return { exito: true, texto: "Invitación enviada" };
    case "vinculado":
      return { exito: true, texto: "Usuario vinculado: ya existía en el portal del trabajador" };
    case "ya_tiene_acceso":
      return { exito: false, texto: "La persona ya tenía acceso" };
    case "invitacion_pendiente":
      return { exito: false, texto: "Ya hay una invitación vigente" };
    case "sin_correo":
      return { exito: false, texto: "Agrega un correo antes de invitar" };
    default:
      return { exito: false, texto: "No se pudo dar acceso" };
  }
}