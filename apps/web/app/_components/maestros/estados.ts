// Etiqueta y tono de los estados de los maestros (el color es estado, ADR-014).
type Tono = "success" | "warning" | "danger" | "info" | "neutro";
export type EstadoVisible = { etiqueta: string; corta: string; tono: Tono };

const e = (etiqueta: string, tono: Tono, corta = etiqueta): EstadoVisible => ({
  etiqueta,
  corta,
  tono,
});

export const ESTADO_CUENTA: Record<string, EstadoVisible> = {
  prospecto: e("Prospecto", "info"),
  cliente_activo: e("Cliente activo", "success", "Activo"),
  cliente_inactivo: e("Inactivo", "neutro"),
};

export const ESTADO_INSTALACION: Record<string, EstadoVisible> = {
  prospecto: e("Prospecto", "info"),
  activa: e("Activa", "success"),
  suspendida: e("Suspendida", "warning"),
  inactiva: e("Inactiva", "neutro"),
};

export const ESTADO_PERSONA: Record<string, EstadoVisible> = {
  activa: e("Activa", "success"),
  inactiva: e("Inactiva", "neutro"),
  bloqueada: e("Bloqueada", "danger"),
};

export const ESTADO_PUESTO: Record<string, EstadoVisible> = {
  activo: e("Activo", "success"),
  pausado: e("Pausado", "warning"),
  inactivo: e("Inactivo", "neutro"),
};

/** Cobertura de un puesto-posición (Brief 11): PPC «Sin asignar» hasta que se asigne alguien. */
export const COBERTURA_PUESTO: Record<string, EstadoVisible> = {
  ppc: e("PPC · Sin asignar", "warning", "PPC"),
  cubierto: e("Cubierto", "success"),
};

export const TIPO_CONTRATO: Record<string, string> = {
  indefinido: "Indefinido",
  plazo_fijo: "Plazo fijo",
  por_obra: "Por obra o faena",
  honorarios: "Honorarios",
};

export const estadoDe = (mapa: Record<string, EstadoVisible>, valor: string): EstadoVisible =>
  mapa[valor] ?? e(valor, "neutro");

/** Monograma de dos letras de un nombre ("Logística Andina SpA" → "LA"). */
export function monograma(nombre: string): string {
  const p = nombre
    .replace(/[^\p{L}\s]/gu, "")
    .trim()
    .split(/\s+/);
  return `${p[0]?.[0] ?? ""}${p[1]?.[0] ?? p[0]?.[1] ?? ""}`.toUpperCase();
}
