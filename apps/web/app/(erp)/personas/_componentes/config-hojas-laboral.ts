/** Secciones editables de Laboral: campos y armado del input de cada capacidad (CAR-223). */
export type TipoCampo = "texto" | "fecha" | "entero" | "si_no";
export type CampoLaboral = {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  max?: number;
  requerido?: boolean;
};
export type SeccionLaboral =
  | "prevision"
  | "uniforme"
  | "jornada-dt"
  | "os10"
  | "contacto-laboral"
  | "pago";
export type ConfigSeccion = {
  param: string;
  titulo: string;
  capacidad: string;
  exito: string;
  boton: string;
  /** Solo envía los campos que cambiaron, salvo que la capacidad exija todos (pago). */
  todos?: boolean;
  campos: readonly CampoLaboral[];
  armar: (id: string, c: Record<string, unknown>) => Record<string, unknown>;
};

const t = (clave: string, etiqueta: string, max: number, requerido = false): CampoLaboral => ({
  clave,
  etiqueta,
  tipo: "texto",
  max,
  requerido,
});

export const SECCIONES_LABORAL: Record<SeccionLaboral, ConfigSeccion> = {
  prevision: {
    param: "editar-prevision",
    titulo: "Editar previsión",
    capacidad: "core.personas.prevision_actualizar",
    exito: "Previsión actualizada",
    boton: "Guardar",
    campos: [
      t("afp", "AFP", 80),
      t("regimen", "Régimen", 80),
      t("sistemaSalud", "Sistema de salud", 40),
      t("isapreNombre", "ISAPRE", 120),
      t("planIsapre", "Plan ISAPRE", 500),
      t("planUf", "Plan (UF)", 20),
      t("cotizacionUfPct", "Cotización UF", 20),
    ],
    armar: (id, c) => ({ id, ...c }),
  },
  uniforme: {
    param: "editar-uniforme",
    titulo: "Editar uniforme",
    capacidad: "core.personas.laboral_actualizar",
    exito: "Uniforme actualizado",
    boton: "Guardar",
    campos: [
      t("tallaCamisa", "Camisa", 20),
      t("tallaPantalon", "Pantalón", 20),
      t("tallaChaqueta", "Chaqueta", 20),
      t("tallaZapato", "Calzado", 20),
      t("notas", "Notas", 500),
    ],
    armar: (id, c) => ({ id, uniforme: c }),
  },
  "jornada-dt": {
    param: "editar-jornada-dt",
    titulo: "Editar jornada DT",
    capacidad: "core.personas.laboral_actualizar",
    exito: "Jornada DT actualizada",
    boton: "Guardar",
    campos: [
      t("resolucion", "Resolución", 200),
      { clave: "resolucionVigenteDesde", etiqueta: "Vigente desde", tipo: "fecha" },
      t("horasSemanales", "Horas semanales", 10),
      t("distribucion", "Distribución", 200),
      { clave: "articulo22", etiqueta: "Artículo 22", tipo: "si_no" },
      { clave: "plazoFijoPeriodo", etiqueta: "Plazo fijo (período 1 a 3)", tipo: "entero" },
      { clave: "terminoPlazoFijo", etiqueta: "Término plazo fijo", tipo: "fecha" },
      { clave: "avisoTerminoDias", etiqueta: "Aviso de término (días)", tipo: "entero" },
    ],
    armar: (id, c) => ({ id, jornadaDt: c }),
  },
  os10: {
    param: "editar-os10",
    titulo: "Editar OS-10",
    capacidad: "core.personas.laboral_actualizar",
    exito: "OS-10 actualizado",
    boton: "Guardar",
    campos: [t("credencial", "Credencial", 80), { clave: "venceEn", etiqueta: "Vence", tipo: "fecha" }],
    armar: (id, c) => ({ id, os10: c }),
  },
  "contacto-laboral": {
    param: "editar-contacto-laboral",
    titulo: "Editar contacto laboral",
    capacidad: "core.personas.laboral_actualizar",
    exito: "Contacto laboral actualizado",
    boton: "Guardar",
    campos: [
      t("estadoCivil", "Estado civil", 40),
      t("telefonoSecundario", "Teléfono secundario", 20),
      t("emergenciaNombre", "Contacto de emergencia", 120),
      t("emergenciaRelacion", "Relación", 80),
      t("emergenciaTelefono", "Teléfono de emergencia", 20),
    ],
    armar: (id, c) => ({ id, contacto: c }),
  },
  pago: {
    param: "cambiar-pago",
    titulo: "Solicitar cambio de cuenta",
    capacidad: "core.personas.pago_solicitar_cambio",
    exito: "Solicitud registrada: queda pendiente de aprobación de RRHH",
    boton: "Solicitar cambio",
    todos: true,
    campos: [
      t("bancoCodigo", "Banco", 20, true),
      t("tipoCuenta", "Tipo de cuenta", 40, true),
      t("numeroCuenta", "Número de cuenta", 40, true),
      t("rutTitular", "RUT del titular (opcional)", 20),
    ],
    armar: (id, c) => ({ id, ...c }),
  },
};

/** Texto del formulario → valor del input de la capacidad. */
export function valorDeCampo(tipo: TipoCampo, texto: string): string | number | boolean | null {
  const v = texto.trim();
  if (tipo === "si_no") return v === "si";
  if (!v) return null;
  return tipo === "entero" ? Number(v) : v;
}

/** Campos a enviar: los cambiados (o todos, si la capacidad lo exige). */
export function cambiosDe(
  cfg: ConfigSeccion,
  inicial: Readonly<Record<string, string>>,
  actual: Readonly<Record<string, string>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of cfg.campos) {
    const nuevo = actual[c.clave] ?? "";
    if (!cfg.todos && nuevo === (inicial[c.clave] ?? "")) continue;
    out[c.clave] = valorDeCampo(c.tipo, nuevo);
  }
  return out;
}

export function faltantes(cfg: ConfigSeccion, actual: Readonly<Record<string, string>>): boolean {
  return cfg.campos.some(
    (c) =>
      (c.requerido && !(actual[c.clave] ?? "").trim()) ||
      (c.tipo === "entero" && !/^\d*$/.test((actual[c.clave] ?? "").trim())),
  );
}
