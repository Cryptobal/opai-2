import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import { etiquetaAmbienteCaf } from "./etiquetas-dte";
import type { FolioCaf } from "./tipos";

const PERMISO_FOLIOS = "finanzas:ventas.configure";

export async function cargarFolios() {
  const identidad = await requerirIdentidad("/finanzas/folios");
  const puede = puedeDeIdentidad(identidad);
  const acceso = puede(PERMISO_FOLIOS);
  const listado = acceso
    ? await ejecutarComoUsuario<{ items: Omit<FolioCaf, "ambienteCaf">[] }>("erp", "finanzas.folios.listar", {
        soloActivos: false,
      })
    : null;
  return {
    state: acceso
      ? estadoPantalla(listado ?? { ok: false, error: { code: "INTERNAL" } })
      : ("forbidden" as const),
    // La etiqueta del ambiente se arma en el servidor para no sumar JS a la ruta (ADR-037).
    items: listado?.ok ? listado.data.items.map((f) => ({ ...f, ambienteCaf: etiquetaAmbienteCaf(f.ambiente) })) : [],
    acceso,
    puedeCargar: acceso,
  };
}
