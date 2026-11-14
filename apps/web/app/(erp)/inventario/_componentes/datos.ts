import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

export type CampoTipo = {
  clave: string;
  etiqueta: string;
  tipo: "texto" | "numero" | "fecha";
  obligatorio: boolean;
};

export type TipoInventario = {
  id: string;
  categoria: "activo" | "ropa";
  nombre: string;
  descripcion: string | null;
  campos: CampoTipo[];
  tallas: string[];
  prendaClave: string | null;
  activo: boolean;
};

export const CATEGORIAS = [
  { valor: "activo", etiqueta: "Activo" },
  { valor: "ropa", etiqueta: "Ropa" },
];

export const etiquetaCategoria = (v: string) => CATEGORIAS.find((c) => c.valor === v)?.etiqueta ?? v;

const sinTildes = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Catálogo de tipos (son pocos): búsqueda, categoría y estado se filtran aquí. */
export async function cargarTipos(p: Parametros) {
  const r = await ejecutarComoUsuario<{ items: TipoInventario[] }>("erp", "inventario.tipos.list", {
    incluirInactivos: true,
    limite: 200,
  });
  const q = sinTildes(p["q"] ?? "");
  const items = (r.ok ? r.data.items : []).filter(
    (t) =>
      (!q || sinTildes(t.nombre).includes(q)) &&
      (!p["categoria"] || t.categoria === p["categoria"]) &&
      (!p["estado"] || (p["estado"] === "activo") === t.activo),
  );
  return { state: estadoPantalla(r), items, total: r.ok ? r.data.items.length : 0 };
}

export async function cargarTipo(id: string) {
  requerirUuid(id);
  const r = await ejecutarComoUsuario<TipoInventario>("erp", "inventario.tipos.get", { id });
  requerirEncontrado(r);
  return { state: estadoPantalla(r), tipo: r.ok ? r.data : null };
}
