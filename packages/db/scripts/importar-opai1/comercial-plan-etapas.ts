import { type Aviso, type Decision, decision, indiceIds } from "./comun";
import { mapearEtapa } from "./comercial-pendiente";
import { type DatosEtapa, ordenPorId } from "./comercial-plan-tipos";
import type { EstadoDestino } from "./destino-tipos";
import type { EtapaOpai1 } from "./origen";

export function planEtapas(
  filas: readonly EtapaOpai1[],
  destino: EstadoDestino,
): {
  decisiones: Decision<DatosEtapa>[];
  avisos: Aviso[];
  porIdOpai1: Map<string, Decision<DatosEtapa>>;
} {
  const ids = indiceIds(destino, "etapa");
  const decisiones: Decision<DatosEtapa>[] = [];
  const avisos: Aviso[] = [];
  const porIdOpai1 = new Map<string, Decision<DatosEtapa>>();

  for (const e of ordenPorId(filas)) {
    const m = mapearEtapa(e);
    if ("error" in m) {
      const d = decision<DatosEtapa>("etapa", e.id, "omitido", { motivo: m.error });
      decisiones.push(d);
      porIdOpai1.set(e.id, d);
      avisos.push({ codigo: "etapa_ambigua", idOpai1: e.id });
      continue;
    }
    const datos: DatosEtapa = { nombre: m.nombre, orden: m.orden, tipo: m.tipo, exige: m.exige };
    const destinoId = ids.porExterno.get(e.id);
    if (destinoId)
      decisiones.push(decision<DatosEtapa>("etapa", e.id, "sin_cambios", { destinoId, datos }));
    else decisiones.push(decision<DatosEtapa>("etapa", e.id, "crear", { datos }));
    porIdOpai1.set(e.id, decisiones[decisiones.length - 1]!);
  }
  return { decisiones, avisos, porIdOpai1 };
}
