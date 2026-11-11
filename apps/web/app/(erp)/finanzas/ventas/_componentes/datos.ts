import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import { periodosRecientes } from "../../compras/_componentes/datos";
import { resumenLista } from "./resumen-lista";
import type { LibroVentas } from "./tipos";

const TIPOS = new Set(["33", "34", "56", "61"]);
const ORDENES = new Set(["recientes", "antiguas", "mayor_monto", "menor_monto", "tipo"]);

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
        ...(TIPOS.has(String(p["tipo"])) ? { tipoDte: Number(p["tipo"]) } : {}),
        ...(ORDENES.has(String(p["orden"])) ? { orden: p["orden"] } : {}),
        ...(p["q"] ? { q: p["q"] } : {}),
      },
    ),
    // El libro oficial solo vale cuando la lista no está recortada por estado ni por búsqueda.
    periodo && !p["estado"] && !p["q"] && !p["tipo"]
      ? ejecutarComoUsuario<LibroVentas["resumen"]>("erp", "finanzas.ventas.libro_resumen", { periodo })
      : Promise.resolve(null),
  ]);
  const items = libro.ok ? libro.data.items : [];
  const subtitulo = libro.ok ? resumenLista(items, libro.data.siguiente, resumen?.ok ? resumen.data : null) : null;
  return {
    state: estadoPantalla(libro),
    libro: libro.ok ? { items, siguiente: libro.data.siguiente } : null,
    subtitulo,
    gestiona,
    filtrado: Boolean(p["periodo"] || p["estado"] || p["q"] || p["tipo"]),
    periodos: periodosRecientes(),
  };
}
