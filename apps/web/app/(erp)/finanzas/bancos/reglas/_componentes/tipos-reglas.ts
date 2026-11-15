export type CampoRegla = "rut" | "glosa" | "monto" | "referencia";
export type OperadorRegla = "igual" | "contiene" | "empieza" | "exacto" | "entre";
export type AlcanceRegla = "abonos" | "cargos" | "ambos";

export type CondicionEditable = { campo: CampoRegla; operador: OperadorRegla; valor: string; hasta?: number | undefined };

export type ReglaBanco = {
  id: string;
  nombre: string;
  prioridad: number;
  modo: "todas" | "alguna";
  definicion: { alcance: AlcanceRegla; condiciones: CondicionEditable[] } | null;
  activa: boolean;
  flujoFilaId: string | null;
  filaEtiqueta: string | null;
  cuentaContableId: string | null;
  cuentaContable: string | null;
};

export const ETIQUETA_CAMPO: Record<CampoRegla, string> = {
  rut: "RUT",
  glosa: "Glosa",
  monto: "Monto",
  referencia: "Referencia",
};

export const OPERADORES: Record<CampoRegla, { valor: OperadorRegla; etiqueta: string }[]> = {
  rut: [{ valor: "igual", etiqueta: "es igual a" }],
  glosa: [
    { valor: "contiene", etiqueta: "contiene" },
    { valor: "empieza", etiqueta: "empieza con" },
  ],
  monto: [
    { valor: "exacto", etiqueta: "exacto" },
    { valor: "entre", etiqueta: "entre" },
  ],
  referencia: [
    { valor: "igual", etiqueta: "es igual a" },
    { valor: "contiene", etiqueta: "contiene" },
  ],
};

export const ETIQUETA_ALCANCE: Record<AlcanceRegla, string> = { abonos: "Abonos", cargos: "Cargos", ambos: "Ambos" };

/** Borrador del editor: lo que se manda a `finanzas.reglas_banco.guardar`. */
export type BorradorRegla = {
  id?: string;
  nombre: string;
  prioridad: number;
  modo: "todas" | "alguna";
  alcance: AlcanceRegla;
  condiciones: CondicionEditable[];
  flujoFilaId: string | null;
  cuentaContableId: string | null;
  activa: boolean;
};

export const borradorNuevo = (): BorradorRegla => ({
  nombre: "",
  prioridad: 0,
  modo: "todas",
  alcance: "cargos",
  condiciones: [{ campo: "glosa", operador: "contiene", valor: "" }],
  flujoFilaId: null,
  cuentaContableId: null,
  activa: true,
});

export const borradorDe = (r: ReglaBanco): BorradorRegla => ({
  id: r.id,
  nombre: r.nombre,
  prioridad: r.prioridad,
  modo: r.modo,
  alcance: r.definicion?.alcance ?? "cargos",
  condiciones: r.definicion?.condiciones.length ? r.definicion.condiciones : [{ campo: "glosa", operador: "contiene", valor: "" }],
  flujoFilaId: r.flujoFilaId,
  cuentaContableId: r.cuentaContableId,
  activa: r.activa,
});

export function entradaGuardar(b: BorradorRegla) {
  return {
    ...(b.id ? { id: b.id } : {}),
    nombre: b.nombre.trim(),
    prioridad: b.prioridad,
    modo: b.modo,
    definicion: {
      alcance: b.alcance,
      condiciones: b.condiciones.map((c) => ({
        campo: c.campo,
        operador: c.operador,
        valor: c.valor.trim(),
        ...(c.operador === "entre" && c.hasta ? { hasta: c.hasta } : {}),
      })),
    },
    flujoFilaId: b.flujoFilaId,
    cuentaContableId: b.cuentaContableId,
    activa: b.activa,
  };
}
