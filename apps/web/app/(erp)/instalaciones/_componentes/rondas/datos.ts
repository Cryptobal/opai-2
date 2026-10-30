import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { DefectosRondas, Plantilla, Programacion, Punto } from "./tipos";

/** Defectos de fábrica (iguales a los `.default()` de `ajustesRondas`), por si el tenant no los fija. */
const DEFECTOS_FABRICA: DefectosRondas = {
  modo: "qr_gps",
  radioM: 15,
  precisionMinM: 25,
  permanenciaGpsS: 15,
  ordenPlantilla: "sugerido",
  umbralIncompletaPct: 20,
};

type AjusteEfectivo = { clave: string; valor: unknown };

/** Lee los defectos efectivos del tenant (herencia visible en el drawer de punto y plantilla, R1/R6). */
export async function cargarDefectos(): Promise<DefectosRondas> {
  const r = await ejecutarComoUsuario<AjusteEfectivo[]>("erp", "core.config.get", { modulo: "rondas" });
  if (!r.ok) return DEFECTOS_FABRICA;
  const v = new Map(r.data.map((a) => [a.clave, a.valor]));
  const num = (clave: string, def: number) => {
    const x = v.get(clave);
    return typeof x === "number" ? x : def;
  };
  return {
    modo: (v.get("modo_defecto") as DefectosRondas["modo"]) ?? DEFECTOS_FABRICA.modo,
    radioM: num("radio_defecto_m", DEFECTOS_FABRICA.radioM),
    precisionMinM: num("precision_min_defecto_m", DEFECTOS_FABRICA.precisionMinM),
    permanenciaGpsS: num("permanencia_gps_defecto_s", DEFECTOS_FABRICA.permanenciaGpsS),
    ordenPlantilla:
      (v.get("orden_defecto") as DefectosRondas["ordenPlantilla"]) ?? DEFECTOS_FABRICA.ordenPlantilla,
    umbralIncompletaPct: num("umbral_incompleta_pct", DEFECTOS_FABRICA.umbralIncompletaPct),
  };
}

/** Puntos de la instalación (incluye archivados para la vista de configuración). */
export async function cargarPuntos(instalacionId: string) {
  const r = await ejecutarComoUsuario<Punto[]>("erp", "rondas.puntos.listar", {
    instalacionId,
    incluirArchivados: true,
  });
  return { state: estadoPantalla(r), puntos: r.ok ? r.data : [] };
}

/** Plantillas de la instalación con su secuencia de puntos. */
export async function cargarPlantillas(instalacionId: string) {
  const r = await ejecutarComoUsuario<Plantilla[]>("erp", "rondas.plantillas.listar", { instalacionId });
  return { state: estadoPantalla(r), plantillas: r.ok ? r.data : [] };
}

/** Programaciones de la instalación. */
export async function cargarProgramaciones(instalacionId: string) {
  const r = await ejecutarComoUsuario<Programacion[]>("erp", "rondas.programaciones.listar", {
    instalacionId,
  });
  return { state: estadoPantalla(r), programaciones: r.ok ? r.data : [] };
}
