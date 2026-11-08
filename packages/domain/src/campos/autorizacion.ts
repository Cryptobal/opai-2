// Qué campos puede resolver un actor para una finalidad (CAR-138, PR 2). Contrato puro: recibe una
// función `puede(permiso)` y devuelve el subconjunto del catálogo; no lee base ni sesión.
import { PERMISOS_CORE } from "../permisos-catalogo";
import { camposPara } from "./catalogo";
import type { CampoDef, EntidadCampo, FinalidadCampo } from "./tipos";

/** Permiso que exige leer cada entidad. Las entidades que no están aquí no se resuelven todavía. */
export const PERMISO_POR_ENTIDAD: Readonly<Partial<Record<EntidadCampo, string>>> = {
  cuenta: PERMISOS_CORE.cuentasRead,
  contacto: PERMISOS_CORE.cuentasRead,
  instalacion: PERMISOS_CORE.instalacionesRead,
};

/** Entidad de un campo: el prefijo de su clave canónica. */
export function entidadDeCampo(campo: Pick<CampoDef, "clave">): EntidadCampo {
  return campo.clave.split(".")[0] as EntidadCampo;
}

export type ClasificacionCampos = {
  /** Se pueden resolver: la finalidad los declara y el actor puede leer su entidad. */
  autorizados: CampoDef[];
  /** La finalidad los declara, pero el actor no puede leer su entidad. */
  sinPermiso: CampoDef[];
  /** La finalidad los declara y el actor podría, pero su entidad aún no tiene resolvedor. */
  sinResolvedor: CampoDef[];
};

export function clasificarCampos(
  finalidad: FinalidadCampo,
  puede: (permiso: string) => boolean,
): ClasificacionCampos {
  const r: ClasificacionCampos = { autorizados: [], sinPermiso: [], sinResolvedor: [] };
  for (const campo of camposPara(finalidad)) {
    const permiso = PERMISO_POR_ENTIDAD[entidadDeCampo(campo)];
    if (permiso === undefined) r.sinResolvedor.push(campo);
    else if (puede(permiso)) r.autorizados.push(campo);
    else r.sinPermiso.push(campo);
  }
  return r;
}
