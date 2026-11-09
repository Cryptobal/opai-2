export type PuntoRonda = { id: string; nombre: string; obligatorio: boolean };
export type PlantillaRonda = { id: string; nombre: string; puntos: PuntoRonda[] };
export type RondaAbierta = {
  clave: string;
  plantillaId: string;
  inicio: string;
  marcados: string[];
};
export type EstadoRondas = {
  activo: boolean;
  plantillas: PlantillaRonda[];
  abiertas: RondaAbierta[];
};

const CLAVE = "opai.terreno.rondaActiva";
/** Ronda iniciada en este teléfono (aunque el servidor aún no la reciba): sobrevive a recargas y a la falta de señal. */
export type RondaLocal = { clave: string; plantillaId: string };

export function leerRondaLocal(): RondaLocal | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as RondaLocal | null;
    return v && typeof v.clave === "string" && typeof v.plantillaId === "string" ? v : null;
  } catch {
    return null;
  }
}
export function guardarRondaLocal(r: RondaLocal | null) {
  try {
    if (r) localStorage.setItem(CLAVE, JSON.stringify(r));
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento local la ronda igual queda en la cola; solo se pierde la memoria de cuál está abierta.
  }
}
