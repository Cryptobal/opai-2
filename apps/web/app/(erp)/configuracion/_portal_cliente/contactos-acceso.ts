/** Estado de acceso de cada contacto de una cuenta al Portal Cliente y qué se puede hacer (CAR-218). */
type EstadoContacto =
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
export function vistaEstado(
  c: Pick<ContactoAcceso, "estado" | "motivo">,
  opciones: { cuentaInactiva?: boolean; esProspecto?: boolean } = {},
): VistaEstado {
  const { cuentaInactiva = false, esProspecto = false } = opciones;
  const base = { darAcceso: false, suspender: false, revocar: false };
  const notaProspecto = esProspecto ? "El contacto solo ve su propuesta hasta que la cuenta sea cliente." : "";
  switch (c.estado) {
    case "sin_acceso":
      return {
        ...base,
        etiqueta: "Sin acceso",
        tono: "neutro",
        nota: [notaProspecto, cuentaInactiva ? "Entrará en modo solo historial hasta que reactives la cuenta." : ""]
          .filter(Boolean)
          .join(" "),
        darAcceso: true,
      };
    case "invitacion_pendiente":
      return {
        ...base,
        etiqueta: "Invitación pendiente",
        tono: "warning",
        nota: ["Ya se envió una invitación; no se repite.", notaProspecto].filter(Boolean).join(" "),
      };
    case "activo":
      if (cuentaInactiva)
        return {
          ...base,
          etiqueta: "Activo · solo historial",
          tono: "warning",
          nota: "Entra solo a documentos, cotizaciones y registros pasados; al reactivar la cuenta recupera el alcance normal.",
          revocar: true,
        };
      return {
        ...base,
        etiqueta: "Activo",
        tono: "success",
        nota: notaProspecto,
        suspender: true,
        revocar: true,
      };
    case "suspendido":
      return { ...base, etiqueta: "Suspendido", tono: "warning", nota: "Reactívalo desde Accesos.", revocar: true };
    case "revocado":
      return { ...base, etiqueta: "Revocado", tono: "neutro", nota: "Para devolverle el acceso, vincúlalo de nuevo desde Accesos." };
    case "sin_correo":
      return { ...base, etiqueta: "Sin correo", tono: "neutro", nota: "Agrega un correo al contacto para invitarlo." };
    case "no_disponible":
      return { ...base, etiqueta: "No disponible", tono: "neutro", nota: (c.motivo && MOTIVOS[c.motivo]) || "No se puede dar acceso a este contacto." };
    default: {
      const _agotado: never = c.estado;
      return _agotado;
    }
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
