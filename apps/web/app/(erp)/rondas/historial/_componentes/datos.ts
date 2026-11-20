import { estadoPantalla } from "@/lib/formato";
import { requerirUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";
import type { InstalacionFila, Pagina } from "@/lib/tipos-maestros";

import type { EjecucionDetalle, EjecucionResumen, EstadoFiltro } from "./tipos";

type InstGet = { id: string; nombre: string };

async function enriquecer(items: EjecucionResumen[]): Promise<(EjecucionResumen & { instalacionNombre: string })[]> {
  if (!items.length) return [];
  const instIds = [...new Set(items.map((i) => i.instalacionId))];
  const insts = await Promise.all(
    instIds.map((id) => ejecutarComoUsuario<InstGet>("erp", "core.instalaciones.get", { id })),
  );
  const nombres = new Map(insts.filter((r) => r.ok).map((r) => [r.data!.id, r.data!.nombre]));
  return items.map((t) => ({ ...t, instalacionNombre: nombres.get(t.instalacionId) ?? "Instalación" }));
}

export async function cargarHistorial(p: Parametros) {
  const estado = (p.estado as EstadoFiltro | undefined) ?? "todas";
  const instalacionId = p.inst ? requerirUuid(p.inst) : undefined;
  const ver = p.ver ? p.ver : null;
  const desde = typeof p.desde === "string" ? p.desde : undefined;
  const hasta = typeof p.hasta === "string" ? p.hasta : undefined;
  await requerirIdentidad("/rondas/historial");
  const [lista, instalaciones, detalle] = await Promise.all([
    ejecutarComoUsuario<{ items: EjecucionResumen[]; siguiente: string | null }>("erp", "rondas.ejecuciones.listar", {
      ...(estado !== "todas" ? { estado } : {}),
      ...(instalacionId ? { instalacionId } : {}),
      ...(desde ? { desde } : {}),
      ...(hasta ? { hasta } : {}),
      limite: 50,
    }),
    ejecutarComoUsuario<Pagina<InstalacionFila>>("erp", "core.instalaciones.list", { limite: 100 }),
    ver && !ver.startsWith("nr:")
      ? ejecutarComoUsuario<EjecucionDetalle>("erp", "rondas.ejecuciones.leer", { id: requerirUuid(ver) })
      : Promise.resolve(null),
  ]);
  const items = lista.ok ? await enriquecer(lista.data.items) : [];
  const fila = ver ? items.find((i) => i.id === ver) : null;
  const ejecucion =
    ver && ver.startsWith("nr:") && fila
      ? { ...fila, marcas: [] as EjecucionDetalle["marcas"], motivoCierre: null }
      : detalle?.ok
        ? {
            ...detalle.data,
            instalacionNombre: fila?.instalacionNombre ?? "Instalación",
          }
        : null;
  return {
    state: estadoPantalla(lista),
    estado,
    instalacionId: instalacionId ?? null,
    desde: desde ?? null,
    hasta: hasta ?? null,
    instalaciones: instalaciones.ok ? instalaciones.data.items.map((i) => ({ id: i.id, nombre: i.nombre })) : [],
    items,
    ver,
    ejecucion,
  };
}
