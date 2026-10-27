import {
  combinarPorConcepto,
  haberes,
  resolverCapasSueldo,
  type EstructuraCapa,
} from "@opai/domain";
import { aDominio, vistaEstructura, type FilaEstructura, type FilaItem } from "./estructuras-vista";

export function resolverVistaEfectiva(
  fecha: string,
  filas: (FilaEstructura & { items: FilaItem[] })[],
  ocultas: Map<string, boolean>,
  imm?: number,
) {
  const items = new Map(filas.map((f) => [f.id, f.items]));
  const dominio = new Map(filas.map((f) => [f.id, aDominio(f, items.get(f.id) ?? [])]));
  const por = (n: string) =>
    filas.filter((f) => f.nivel === n).map((f) => dominio.get(f.id) as EstructuraCapa);
  const r = resolverCapasSueldo(fecha, {
    persona: por("persona"),
    puesto: por("puesto"),
    instalacion: por("instalacion"),
  });
  const combinada = combinarPorConcepto(r.capas);
  const ocultar = [...ocultas.values()].some(Boolean);
  const vista = (e: EstructuraCapa | null) => {
    const f = e ? filas.find((x) => x.id === e.id) : undefined;
    return f ? vistaEstructura(f, items.get(f.id) ?? [], ocultas.get(f.id) ?? true) : null;
  };
  return {
    fecha,
    aplica: r.capa,
    capa: r.capa,
    estado: r.estado,
    conceptosFaltantes: r.conceptosFaltantes,
    estructura: vista(r.estructura),
    niveles: {
      persona: vista(r.capas.persona),
      puesto: vista(r.capas.puesto),
      instalacion: vista(r.capas.instalacion),
      cargo: null,
    },
    conceptos: ocultar
      ? combinada.conceptos.map((c) => ({
          ...c,
          valores: { persona: null, puesto: null, cargo: null, instalacion: null },
          final: null,
        }))
      : combinada.conceptos,
    haberes:
      r.estado === "completa" && combinada.estructura && imm && !ocultar
        ? { ...haberes(combinada.estructura, imm) }
        : null,
  };
}
