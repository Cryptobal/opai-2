import {
  CONFIG_PORTAL_DEFECTO,
  SECCIONES_PORTAL,
  type ConfigPortal,
  type RutEnReportes,
  type SeccionPortal,
} from "@opai/domain";

import type { Contexto } from "../types";

type Fila = {
  tiposDocumentoVisibles: string[];
  seccionesVisibles: string[];
  muestraFotoGuardias: boolean;
  muestraRutGuardias: boolean;
  rutEnReportes: string;
  gestionaListas: boolean;
  destinatariosInforme: string[];
};

const esSeccion = (s: string): s is SeccionPortal => (SECCIONES_PORTAL as readonly string[]).includes(s);

export function configDeFila(f: Fila): ConfigPortal {
  return {
    tiposDocumentoVisibles: f.tiposDocumentoVisibles,
    seccionesVisibles: f.seccionesVisibles.filter(esSeccion),
    muestraFotoGuardias: f.muestraFotoGuardias,
    muestraRutGuardias: f.muestraRutGuardias,
    rutEnReportes: f.rutEnReportes === "incluido" ? ("incluido" satisfies RutEnReportes) : "omitido",
    gestionaListas: f.gestionaListas,
    destinatariosInforme: f.destinatariosInforme,
  };
}

/** Configuración efectiva de la cuenta: la guardada o, sin fila, los defectos (fail-closed). */
export async function configDeCuenta(
  ctx: Contexto,
  cuentaId: string,
): Promise<{ guardada: boolean; config: ConfigPortal }> {
  const f = await ctx.db.configPortalCuenta.findUnique({
    where: { tenantId_cuentaId: { tenantId: ctx.tenantId, cuentaId } },
  });
  return f ? { guardada: true, config: configDeFila(f) } : { guardada: false, config: CONFIG_PORTAL_DEFECTO };
}
