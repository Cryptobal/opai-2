import { estadoPantalla } from "@/lib/formato";
import { requerirUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { Cargo } from "@/lib/tipos-maestros";
import type { EstructuraVista, SueldoVigente } from "@/lib/tipos-sueldo";

export type CargoFila = Cargo & { sueldoVigente: SueldoVigente };

const sinTildes = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Cargos con su sueldo vigente; búsqueda, clase y estado se filtran aquí (son pocos). */
export async function cargarCargosLista(p: Parametros) {
  const r = await ejecutarComoUsuario<CargoFila[]>("erp", "core.cargos.list", {
    incluirInactivos: true,
  });
  const q = sinTildes(p["q"] ?? "");
  const items = (r.ok ? r.data : []).filter(
    (c) =>
      (!q || sinTildes(c.nombre).includes(q)) &&
      (!p["clase"] || c.clase === p["clase"]) &&
      (!p["estado"] || (p["estado"] === "activo") === c.activo),
  );
  return { state: estadoPantalla(r), items };
}

/** Ficha del cargo y sus versiones de estructura (de la más reciente a la más antigua). */
export async function cargarCargo(id: string) {
  requerirUuid(id);
  const [c, v] = await Promise.all([
    ejecutarComoUsuario<Cargo>("erp", "core.cargos.get", { id }),
    ejecutarComoUsuario<EstructuraVista[]>("erp", "core.estructuras.list", {
      nivel: "cargo",
      refId: id,
    }),
  ]);
  return { state: estadoPantalla(c), cargo: c.ok ? c.data : null, versiones: v.ok ? v.data : [] };
}

export const CLASES = [
  { valor: "operativo", etiqueta: "Operativo" },
  { valor: "administrativo", etiqueta: "Administrativo" },
];
