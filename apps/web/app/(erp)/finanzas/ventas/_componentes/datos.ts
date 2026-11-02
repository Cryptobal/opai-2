import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import { periodosRecientes } from "../../compras/_componentes/datos";
import type { LibroVentas } from "./tipos";

/** Lista del libro de ventas con filtros de URL. */
export async function cargarVentas(sp: SearchParams) {
  const p = await leerParametros(sp);
  const identidad = await requerirIdentidad("/finanzas/ventas");
  const puede = puedeDeIdentidad(identidad);
  const gestiona = puede("finanzas:ventas.manage");
  const periodo = p["periodo"] as string | undefined;
  const [libro, resumen] = await Promise.all([
    ejecutarComoUsuario<{ items: LibroVentas["items"]; siguiente: string | null }>(
      "erp",
      "finanzas.ventas.listar",
      {
        limite: 100,
        ...(periodo ? { periodo } : {}),
        ...(p["estado"] ? { estadoDte: p["estado"] } : {}),
        ...(p["q"] ? { q: p["q"] } : {}),
      },
    ),
    periodo
      ? ejecutarComoUsuario<LibroVentas["resumen"]>("erp", "finanzas.ventas.libro_resumen", { periodo })
      : Promise.resolve(null),
  ]);
  const data =
    libro.ok && resumen?.ok
      ? { items: libro.data.items, siguiente: libro.data.siguiente, resumen: resumen.data }
      : libro.ok
        ? {
            items: libro.data.items,
            siguiente: libro.data.siguiente,
            resumen: { documentos: libro.data.items.length, neto: 0, iva: 0, total: 0 },
          }
        : null;
  return {
    state: estadoPantalla(libro),
    libro: data,
    gestiona,
    filtrado: Boolean(p["periodo"] || p["estado"] || p["q"]),
    periodos: periodosRecientes(),
  };
}
