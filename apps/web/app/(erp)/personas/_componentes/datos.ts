import { consultaListaCursor, itemsPaginaDe } from "@/lib/lista-cursor";

import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { Pagina, PersonaDetalle, PersonaFila } from "@/lib/tipos-maestros";

type PaginaPersonas = Pagina<PersonaFila> & {
  total: number;
  cargos: { id: string; nombre: string }[];
};

/**
 * Personas filtradas (texto, cargo, estado) y paginadas por cursor, con el total y los cargos del
 * filtro en la misma capacidad (ADR-045): una sola llamada, sin un contador ni una lista de cargos
 * aparte.
 */
export async function cargarPersonas(p: Parametros) {
  const r = await ejecutarComoUsuario<PaginaPersonas>("erp", "core.personas.list", {
    ...consultaListaCursor(p),
    incluirFiltros: true,
    ...(p["q"] ? { q: p["q"] } : {}),
    ...(p["cargo"] ? { cargoId: p["cargo"] } : {}),
    ...(p["estado"] ? { estado: p["estado"] } : {}),
    ...(p["anexo"] === "borrador" ? { anexo: "borrador" } : {}),
  });
  return {
    ...itemsPaginaDe(r),
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
