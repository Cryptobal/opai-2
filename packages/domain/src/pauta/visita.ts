import { distanciaMetros } from "../rondas/distancia";

/** Cómo quedó la llegada de una visita respecto de la instalación (CAR-83, R2). Nunca bloquea la visita. */
export type GeocercaVisita = "dentro" | "fuera" | "sin_gps" | "sin_ubicacion";

export type LlegadaVisita = {
  instalacion: { lat: number | null; lng: number | null; geocercaM: number };
  lectura: { lat: number; lng: number } | null;
};

/** Distancia en metros (redondeada) y estado de la llegada. Sin lectura o sin ubicación de la instalación no hay distancia. */
export function clasificarLlegada(l: LlegadaVisita): { distanciaM: number | null; geocerca: GeocercaVisita } {
  if (!l.lectura) return { distanciaM: null, geocerca: "sin_gps" };
  const { lat, lng, geocercaM } = l.instalacion;
  if (lat == null || lng == null) return { distanciaM: null, geocerca: "sin_ubicacion" };
  const distanciaM = Math.round(distanciaMetros({ lat, lng }, l.lectura));
  return { distanciaM, geocerca: distanciaM <= geocercaM ? "dentro" : "fuera" };
}

/** Lista de revisión genérica, si la empresa no definió la suya (R4). Vocabulario neutro de vertical. */
export const LISTA_VISITA_BASE: readonly string[] = [
  "Dotación completa en los puestos",
  "Presentación personal y credencial en orden",
  "Libro de novedades al día",
  "Equipos de comunicación operativos",
  "Recorridos al día",
];

export const MAX_ITEMS_VISITA = 30;
export const MAX_TEXTO_ITEM_VISITA = 120;

/** Lista base de la empresa: limpia vacíos y duplicados, recorta al máximo y cae a la genérica si queda vacía. */
export function listaVisita(propia: readonly string[] | null | undefined): string[] {
  const limpia = [...new Set((propia ?? []).map((t) => t.trim()).filter(Boolean))]
    .map((t) => t.slice(0, MAX_TEXTO_ITEM_VISITA))
    .slice(0, MAX_ITEMS_VISITA);
  return limpia.length ? limpia : [...LISTA_VISITA_BASE];
}
