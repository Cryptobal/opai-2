/**
 * Capítulo por instalación de la propuesta técnica (CAR-138 PR 6). Dominio puro: define las secciones
 * del capítulo, valida lo que se guarda y arma la vista que consume el PDF.
 *
 * Reglas: lo derivado del CPQ (dirección y mapa si el dato existe, puestos, guardias simultáneos y
 * dotación) nunca lo escribe una persona ni una IA; lo narrativo es texto escrito por una persona. Lo que
 * falta se informa como faltante verificable y jamás se rellena. Supervisión es un texto: no crea un ítem
 * vendido ni promete un supervisor permanente.
 */

export const MAX_TEXTO_CAPITULO = 8000;

/** Secciones narrativas, en el orden del capítulo. La clave es estable: se guarda en base de datos. */
export const SECCIONES_TEXTO = [
  { clave: "comprension_servicio", titulo: "Comprensión del servicio" },
  { clave: "alcance", titulo: "Alcance" },
  { clave: "exclusiones", titulo: "Exclusiones" },
  { clave: "turnos", titulo: "Organización de los turnos" },
  { clave: "accesos", titulo: "Control de accesos" },
  { clave: "rondas", titulo: "Rondas" },
  { clave: "protocolos", titulo: "Protocolos" },
  { clave: "equipamiento", titulo: "Equipamiento" },
  { clave: "supervision", titulo: "Supervisión" },
  { clave: "reportes", titulo: "Reportes" },
  { clave: "arranque", titulo: "Arranque del servicio" },
] as const;

export type ClaveSeccionCapitulo = (typeof SECCIONES_TEXTO)[number]["clave"];
export const CLAVES_SECCION_CAPITULO = SECCIONES_TEXTO.map((s) => s.clave) as readonly ClaveSeccionCapitulo[];
export const ORIGENES_CAPITULO = ["manual", "ia_aceptada"] as const;
export type OrigenCapitulo = (typeof ORIGENES_CAPITULO)[number];

export const esClaveSeccion = (c: string): c is ClaveSeccionCapitulo =>
  (CLAVES_SECCION_CAPITULO as readonly string[]).includes(c);

export type PuestoCapitulo = {
  nombre: string;
  /** Posiciones cubiertas a la vez por el puesto (dato del CPQ). */
  guardiasSimultaneos: number;
  /** Personas que exige la cobertura (cobertura semanal sobre jornada media); nulo si no se pudo calcular. */
  dotacion: number | null;
  turno: string;
};

export type EntradaCapitulo = {
  instalacionId: string;
  nombre: string;
  direccion: string | null;
  mapaUrl: string | null;
  puestos: readonly PuestoCapitulo[];
  /** Texto guardado por sección; las ausentes o vacías son faltantes. */
  textos: Readonly<Partial<Record<ClaveSeccionCapitulo, string>>>;
};

export type Faltante = { clave: string; titulo: string };

export type CapituloVista = {
  instalacionId: string;
  nombre: string;
  direccion: string | null;
  mapaUrl: string | null;
  puestos: PuestoCapitulo[];
  totales: { guardiasSimultaneos: number; dotacion: number | null };
  secciones: { clave: ClaveSeccionCapitulo; titulo: string; texto: string }[];
  faltantes: Faltante[];
};

/** Solo http(s): un enlace de mapa con otro esquema (p. ej. `javascript:`) no se imprime. */
export function mapaSeguro(url: string | null | undefined): string | null {
  const v = url?.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function normalizarTextoCapitulo(texto: string): string {
  const limpio = texto.replace(/\r\n?/g, "\n").trim();
  if (limpio.length > MAX_TEXTO_CAPITULO) throw new Error("TEXTO_CAPITULO_LARGO");
  return limpio;
}

export function armarCapitulo(e: EntradaCapitulo): CapituloVista {
  const secciones = SECCIONES_TEXTO.flatMap((s) => {
    const texto = (e.textos[s.clave] ?? "").trim();
    return texto ? [{ clave: s.clave, titulo: s.titulo, texto }] : [];
  });
  const faltantes: Faltante[] = SECCIONES_TEXTO.filter((s) => !(e.textos[s.clave] ?? "").trim()).map(
    ({ clave, titulo }) => ({ clave, titulo }),
  );
  const direccion = e.direccion?.trim() || null;
  if (!direccion) faltantes.unshift({ clave: "direccion", titulo: "Dirección de la instalación" });
  if (e.puestos.length === 0) faltantes.push({ clave: "puestos", titulo: "Puestos de la instalación" });
  else if (e.puestos.some((p) => p.dotacion == null))
    faltantes.push({ clave: "dotacion", titulo: "Dotación calculada de algún puesto" });
  const dot = e.puestos.map((p) => p.dotacion);
  return {
    instalacionId: e.instalacionId,
    nombre: e.nombre,
    direccion,
    mapaUrl: mapaSeguro(e.mapaUrl),
    puestos: [...e.puestos],
    totales: {
      guardiasSimultaneos: e.puestos.reduce((a, p) => a + p.guardiasSimultaneos, 0),
      dotacion: dot.length > 0 && dot.every((d): d is number => d != null) ? dot.reduce((a, d) => a + d, 0) : null,
    },
    secciones,
    faltantes,
  };
}

/** Texto de un número con coma decimal (es-CL), sin ceros sobrantes: 4,7 · 5. */
export const formatearPersonas = (n: number): string =>
  (Math.round(n * 10) / 10).toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
