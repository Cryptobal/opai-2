/** Estado de acceso de cada contacto de una cuenta al Portal Cliente y qué se puede hacer (CAR-218). */
export type EstadoContacto =
  | "sin_acceso"
  | "invitacion_pendiente"
  | "activo"
  | "suspendido"
  | "revocado"
  | "sin_correo"
  | "no_disponible";

export type ContactoAcceso = {
  contactoId: string;
  nombre: string;
  email: string | null;
  cargo: string | null;
  esPrincipal: boolean;
  estado: EstadoContacto;
  accesoId: string | null;
  motivo?: string;
};

type Tono = "success" | "warning" | "neutro" | "danger" | "info";
export type VistaEstado = {
  etiqueta: string;
  tono: Tono;
  /** Texto bajo el estado; vacío si no aporta. */
  nota: string;
  darAcceso: boolean;
  suspender: boolean;
  revocar: boolean;
};

const MOTIVOS: Record<string, string> = {
  usuario_interno: "Es usuario interno de la empresa.",
  vinculado_a_otra_cuenta: "Tiene acceso por otra cuenta.",
};

/**
 * «Dar acceso» solo existe para quien no tiene vínculo: un suspendido o revocado NO se reactiva desde
 * aquí (se hace desde Accesos) y una invitación vigente no se repite.
 */
export function vistaEstado(c: Pick<ContactoAcceso, "estado" | "motivo">, cuentaActiva = true): VistaEstado {
  const base = { darAcceso: false, suspender: false, revocar: false };
  switch (c.estado) {
    case "sin_acceso":
      return { ...base, etiqueta: "Sin acceso", tono: "neutro", nota: cuentaActiva ? "" : "La cuenta está inactiva: no se puede dar acceso.", darAcceso: cuentaActiva };
    case "invitacion_pendiente":
      return { ...base, etiqueta: "Invitación pendiente", tono: "warning", nota: "Ya se envió una invitación; no se repite." };
    case "activo":
      // Con la cuenta inactiva el portal rechaza el ingreso: se muestra la pausa efectiva, no «Activo».
      if (!cuentaActiva)
        return { ...base, etiqueta: "Pausado · cuenta inactiva", tono: "warning", nota: "No entra mientras la cuenta esté inactiva; recupera el acceso al reactivarla.", revocar: true };
      return { ...base, etiqueta: "Activo", tono: "success", nota: "", suspender: true, revocar: true };
    case "suspendido":
      return { ...base, etiqueta: "Suspendido", tono: "warning", nota: "Reactívalo desde Accesos.", revocar: true };
    case "revocado":
      return { ...base, etiqueta: "Revocado", tono: "neutro", nota: "Para devolverle el acceso, vincúlalo de nuevo desde Accesos." };
    case "sin_correo":
      return { ...base, etiqueta: "Sin correo", tono: "neutro", nota: "Agrega un correo al contacto para invitarlo." };
    case "no_disponible":
      return { ...base, etiqueta: "No disponible", tono: "neutro", nota: (c.motivo && MOTIVOS[c.motivo]) || "No se puede dar acceso a este contacto." };
  }
}

export type ResultadoDarAcceso = {
  estado: "ya_tiene_acceso" | "vinculado" | "invitado" | "invitacion_pendiente" | "no_aplica";
  motivo?: string;
};

/** Lo que se avisa tras «Dar acceso»: solo «Invitación enviada» si de verdad se envió una invitación. */
export function mensajeDarAcceso(r: ResultadoDarAcceso): { exito: boolean; texto: string } {
  switch (r.estado) {
    case "invitado":
      return { exito: true, texto: "Invitación enviada" };
    case "vinculado":
      return { exito: true, texto: "Contacto vinculado: ya tenía usuario de cliente, no se envió invitación" };
    case "ya_tiene_acceso":
      return { exito: false, texto: "El contacto ya tenía acceso" };
    case "invitacion_pendiente":
      return { exito: false, texto: "Ya había una invitación vigente: no se repite" };
    case "no_aplica":
      return { exito: false, texto: `No se dio acceso${r.motivo ? `: ${r.motivo}` : ""}` };
  }
}
