import { tamanoPagina, vistaPaginaCursor } from "@/app/_components/maestros/paginacion-cursor";
import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { Pagina, PersonaDetalle, PersonaFila } from "@/lib/tipos-maestros";

type PaginaPersonas = Pagina<PersonaFila> & {
  total: number;
  cargos: { id: string; nombre: string }[];
};

export async function cargarPersonas(p: Parametros) {
  const r = await ejecutarComoUsuario<PaginaPersonas>("erp", "core.personas.list", {
    limite: tamanoPagina(p),
    incluirFiltros: true,
    ...(p["q"] ? { q: p["q"] } : {}),
    ...(p["cargo"] ? { cargoId: p["cargo"] } : {}),
    ...(p["estado"] ? { estado: p["estado"] } : {}),
    ...(p["anexo"] === "borrador" ? { anexo: "borrador" } : {}),
    ...(p["cursor"] ? { cursor: p["cursor"] } : {}),
  });
  return {
    ...vistaPaginaCursor(r),
    total: r.ok ? r.data.total : null,
    cargos: r.ok ? (r.data.cargos ?? []).map((c) => ({ valor: c.id, etiqueta: c.nombre })) : [],
  };
}

export async function cargarPersona(id: string) {
  const r = await ejecutarComoUsuario<PersonaDetalle>("erp", "core.personas.get", {
    id: requerirUuid(id),
  });
  requerirEncontrado(r);
  return { state: estadoPantalla(r), persona: r.ok ? r.data : null };
}
