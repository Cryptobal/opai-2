import { MESES_VIGENCIA_BLOQUEO, type AlcanceLista } from "@opai/domain";

import type { Contexto } from "../types";

type InstalacionMeta = { cuentaId: string; grupoIds: readonly string[] };

/** Contexto de instalación para cruzar listas por empresa, cuenta, instalación y grupo (R6–R7). */
export async function metaListasInstalacion(
  ctx: Contexto,
  instalacionId: string,
): Promise<InstalacionMeta> {
  const [inst, grupos] = await Promise.all([
    ctx.db.instalacion.findFirstOrThrow({
      where: { id: instalacionId },
      select: { cuentaId: true },
    }),
    ctx.db.grupoListaInstalacion.findMany({
      where: { instalacionId },
      select: { grupoId: true },
    }),
  ]);
  return { cuentaId: inst.cuentaId, grupoIds: grupos.map((g) => g.grupoId) };
}

export function whereEntradasAplicanAInstalacion(meta: InstalacionMeta, instalacionId: string) {
  return {
    OR: [
      { alcance: "empresa" },
      { alcance: "cuenta", cuentaId: meta.cuentaId },
      { alcance: "instalacion", instalacionId },
      { alcance: "grupo", grupoId: { in: [...meta.grupoIds] } },
    ],
  };
}

export function finVigenciaBloqueo(vigenteDesde: Date | null, vigenteHasta: Date | null) {
  if (vigenteHasta) return vigenteHasta;
  const desde = vigenteDesde ?? new Date();
  const fin = new Date(desde);
  fin.setMonth(fin.getMonth() + MESES_VIGENCIA_BLOQUEO);
  return fin;
}

type ClavesAlcance = {
  alcance: AlcanceLista;
  instalacionId: string | null;
  cuentaId: string | null;
  grupoId: string | null;
};

export function clavesAlcance(p: {
  alcance: AlcanceLista;
  instalacionId: string;
  cuentaId?: string | null;
  grupoId?: string | null;
  meta: InstalacionMeta;
}): ClavesAlcance {
  switch (p.alcance) {
    case "empresa":
      return { alcance: "empresa", instalacionId: null, cuentaId: null, grupoId: null };
    case "cuenta":
      return {
        alcance: "cuenta",
        instalacionId: null,
        cuentaId: p.cuentaId ?? p.meta.cuentaId,
        grupoId: null,
      };
    case "instalacion":
      return {
        alcance: "instalacion",
        instalacionId: p.instalacionId,
        cuentaId: null,
        grupoId: null,
      };
    case "grupo":
      if (!p.grupoId) throw new Error("grupo_requerido");
      return { alcance: "grupo", instalacionId: null, cuentaId: null, grupoId: p.grupoId };
    default: {
      const _: never = p.alcance;
      return _;
    }
  }
}
