import type { PanelSueldo } from "@opai/capabilities";
import type { Parametros } from "./parametros";
import { ejecutarComoUsuario } from "./servidor";
import { exigirDatos } from "./carga";
import { requerirEncontrado } from "./ids";

export async function cargarPanelSueldo(
  tipo: "instalacion" | "persona",
  id: string,
  p: Parametros,
) {
  const r = await ejecutarComoUsuario<PanelSueldo>("erp", "core.estructuras.panel", {
    tipo,
    id,
    ...(p["puesto"] ? { puestoId: p["puesto"] } : {}),
    ...(p["instalacion"] ? { instalacionId: p["instalacion"] } : {}),
    ...(p["fecha"] ? { fecha: p["fecha"] } : {}),
    filtros: Object.fromEntries(
      ["q", "cargo", "cuenta", "estado", "region", "cursor"].flatMap((k) =>
        p[k] ? [[k, p[k]]] : [],
      ),
    ),
  });
  requerirEncontrado(r);
  return exigirDatos(r);
}
