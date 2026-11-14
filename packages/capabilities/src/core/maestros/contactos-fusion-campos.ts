// Campos que se comparan al fusionar contactos (CAR-27, F3). Por defecto queda el dato de este contacto,
// salvo que esté vacío y el duplicado lo tenga: así no se pierde un dato por omisión.

export type Lado = "este" | "duplicado";

type ContactoFusion = {
  nombres: string;
  apellidos: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  notas: string | null;
};

type Columna = keyof ContactoFusion;

export const CAMPOS_FUSION_CONTACTO: readonly { campo: Columna; etiqueta: string }[] = [
  { campo: "nombres", etiqueta: "Nombres" },
  { campo: "apellidos", etiqueta: "Apellidos" },
  { campo: "email", etiqueta: "Correo" },
  { campo: "telefono", etiqueta: "Teléfono" },
  { campo: "cargo", etiqueta: "Cargo" },
  { campo: "notas", etiqueta: "Notas" },
];

const vacio = (v: string | null) => v === null || v.trim() === "";

function ladoDe(a: ContactoFusion, b: ContactoFusion, k: Columna, pedido?: Lado): Lado {
  if (pedido) return pedido;
  return vacio(a[k]) && !vacio(b[k]) ? "duplicado" : "este";
}

export function compararContactos(a: ContactoFusion, b: ContactoFusion, elegir: Partial<Record<string, Lado>>) {
  return CAMPOS_FUSION_CONTACTO.map((f) => ({
    campo: f.campo,
    etiqueta: f.etiqueta,
    este: a[f.campo] || null,
    duplicado: b[f.campo] || null,
    queda: ladoDe(a, b, f.campo, elegir[f.campo]),
  }));
}

/** Datos que se escriben en el contacto que queda. */
export function valoresContacto(
  a: ContactoFusion,
  b: ContactoFusion,
  elegir: Partial<Record<string, Lado>>,
): ContactoFusion {
  const pick = <K extends Columna>(k: K): ContactoFusion[K] =>
    ladoDe(a, b, k, elegir[k]) === "duplicado" ? b[k] : a[k];
  return {
    nombres: pick("nombres"),
    apellidos: pick("apellidos"),
    email: pick("email"),
    telefono: pick("telefono"),
    cargo: pick("cargo"),
    notas: pick("notas"),
  };
}
