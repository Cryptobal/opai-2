import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { Cargo } from "@/lib/tipos-maestros";
import type { EstructuraVista } from "@/lib/tipos-sueldo";

export type CargoFila = Cargo;

const sinTildes = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Catálogo sin montos; búsqueda, clase y estado se filtran aquí (son pocos). */
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
      incluirAnuladas: true,
    }),
  ]);
  requerirEncontrado(c);
  // CAR-365: si fallan solo las estructuras antiguas, el cargo se muestra igual y esa tarjeta
  // avisa por su cuenta (antes la ficha completa quedaba en «No pudimos cargar esta información»).
  return {
    state: estadoPantalla(c),
    cargo: c.ok ? c.data : null,
    versiones: v.ok ? v.data : [],
    versionesConError: !v.ok,
  };
}

export const CLASES = [
  { valor: "operativo", etiqueta: "Operativo" },
  { valor: "administrativo", etiqueta: "Administrativo" },
];
