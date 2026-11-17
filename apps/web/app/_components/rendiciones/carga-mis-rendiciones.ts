import { CargaFallida } from "@/lib/carga";
import type { SearchParams } from "@/lib/parametros";
import { leerParametros } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { identidadActual } from "@/lib/servidor";

import { cargarAdministrador, cargarListaPropias } from "./datos";
import { BASE, PESTANAS, type PestanaId, type PortalRendicion } from "./tipos";

export async function cargaMisRendiciones(portal: PortalRendicion, pestana: PestanaId, searchParams: SearchParams) {
  const p = await leerParametros(searchParams);
  const def = PESTANAS.find((x) => x.id === pestana) ?? PESTANAS[0];
  const i = portal === "erp" ? await identidadActual() : null;
  const puede = i ? puedeDeIdentidad(i) : () => false;
  const accesos = {
    aprobar: puede("rendiciones:aprobar"),
    pagar: puede("rendiciones:pagar"),
    reporte: puede("rendiciones:ver_todas"),
  };
  try {
    const pagina = await cargarListaPropias(portal, p, def.estado);
    return { pagina, empresa: null as string | null, admin: null as string | null, accesos, p, base: BASE[portal], segmento: def.segmento };
  } catch (e) {
    if (!(e instanceof CargaFallida) || e.code !== "FORBIDDEN") throw e;
    return {
      pagina: { items: [], siguiente: null, contadores: {} },
      empresa: (await identidadActual())?.actual?.tenant.nombre ?? "tu empresa",
      admin: await cargarAdministrador(portal),
      accesos,
      p,
      base: BASE[portal],
      segmento: def.segmento,
    };
  }
}