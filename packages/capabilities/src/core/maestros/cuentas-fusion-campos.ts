// Campos que se comparan al fusionar cuentas (diseño CuentaV2 · fusionar, paso «Comparar»).
// La dirección se elige completa (calle, comuna, ciudad y región juntas) para no mezclar dos.

export type Lado = "esta" | "duplicado";

type CuentaFusion = {
  nombre: string;
  razonSocial: string | null;
  rut: string | null;
  giro: string | null;
  origen: string | null;
  sitioWeb: string | null;
  calle: string | null;
  comuna: string | null;
  ciudad: string | null;
  region: string | null;
  emailDte: string | null;
  notas: string | null;
};

type Columna = keyof CuentaFusion;

export const CAMPOS_FUSION: readonly { campo: string; etiqueta: string; columnas: Columna[] }[] = [
  { campo: "nombre", etiqueta: "Nombre", columnas: ["nombre"] },
  { campo: "razonSocial", etiqueta: "Razón social", columnas: ["razonSocial"] },
  { campo: "rut", etiqueta: "RUT", columnas: ["rut"] },
  { campo: "giro", etiqueta: "Giro", columnas: ["giro"] },
  { campo: "direccion", etiqueta: "Dirección", columnas: ["calle", "comuna", "ciudad", "region"] },
  { campo: "sitioWeb", etiqueta: "Sitio web", columnas: ["sitioWeb"] },
  { campo: "emailDte", etiqueta: "Correo DTE", columnas: ["emailDte"] },
  { campo: "origen", etiqueta: "Origen", columnas: ["origen"] },
  { campo: "notas", etiqueta: "Notas", columnas: ["notas"] },
];

const texto = (c: CuentaFusion, columnas: Columna[]) =>
  columnas
    .map((k) => c[k])
    .filter((v): v is string => Boolean(v))
    .join(", ") || null;

/**
 * Qué lado queda en cada campo. Por defecto «esta», salvo que esta cuenta lo tenga vacío y el
 * duplicado no: así no se pierde un dato por omisión.
 */
function ladoDe(a: CuentaFusion, b: CuentaFusion, columnas: Columna[], pedido?: Lado): Lado {
  if (pedido) return pedido;
  return texto(a, columnas) === null && texto(b, columnas) !== null ? "duplicado" : "esta";
}

export function comparar(a: CuentaFusion, b: CuentaFusion, elegir: Partial<Record<string, Lado>>) {
  return CAMPOS_FUSION.map((f) => ({
    campo: f.campo,
    etiqueta: f.etiqueta,
    esta: texto(a, f.columnas),
    duplicado: texto(b, f.columnas),
    queda: ladoDe(a, b, f.columnas, elegir[f.campo]),
  }));
}

/** Valores que se escriben en la cuenta que queda. */
export function valoresFinales(
  a: CuentaFusion,
  b: CuentaFusion,
  elegir: Partial<Record<string, Lado>>,
): CuentaFusion {
  const r = { ...a };
  for (const f of CAMPOS_FUSION) {
    if (ladoDe(a, b, f.columnas, elegir[f.campo]) !== "duplicado") continue;
    for (const k of f.columnas) (r[k] as string | null) = b[k];
  }
  return {
    nombre: r.nombre,
    razonSocial: r.razonSocial,
    rut: r.rut,
    giro: r.giro,
    origen: r.origen,
    sitioWeb: r.sitioWeb,
    calle: r.calle,
    comuna: r.comuna,
    ciudad: r.ciudad,
    region: r.region,
    emailDte: r.emailDte,
    notas: r.notas,
  };
}
