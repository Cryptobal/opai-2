export type Precio = {
  recurso: string;
  unidad: string;
  costoUnitarioMicro: number;
  vigenteDesde: string;
};
export type Ajuste = {
  modulo: string;
  clave: string;
  etiqueta: string;
  valor: unknown;
  porDefecto: unknown;
  version: number;
};
export type Modelo = { proveedor: string; modelo: string };
export type ModelosIa = Record<"economica" | "estandar" | "potente", Modelo>;

/** Micro-USD → texto en US$ con coma decimal ("0,0012"). */
export const aUsd = (micro: number) => String(micro / 1_000_000).replace(".", ",");
/** Texto en US$ → micro-USD entero, o null si no es un número. */
export function aMicro(texto: string): number | null {
  const n = Number(texto.trim().replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 1_000_000) : null;
}

export function esModelosIa(v: unknown): v is ModelosIa {
  if (!v || typeof v !== "object") return false;
  return ["economica", "estandar", "potente"].every((k) => {
    const m = (v as Record<string, unknown>)[k];
    return Boolean(m && typeof m === "object" && "modelo" in m && "proveedor" in m);
  });
}
