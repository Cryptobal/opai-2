import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import type { FolioCaf } from "./tipos";

const PERMISO_FOLIOS = "finanzas:ventas.configure";

export async function cargarFolios() {
  const identidad = await requerirIdentidad("/finanzas/folios");
  const puede = puedeDeIdentidad(identidad);
  const acceso = puede(PERMISO_FOLIOS);
  const listado = acceso
    ? await ejecutarComoUsuario<{ items: FolioCaf[] }>("erp", "finanzas.folios.listar", {
        soloActivos: false,
      })
    : null;
  return {
    state: acceso
      ? estadoPantalla(listado ?? { ok: false, error: { code: "INTERNAL" } })
      : ("forbidden" as const),
    items: listado?.ok ? listado.data.items : [],
    acceso,
    puedeCargar: acceso,
  };
}
