import { z } from "zod";

import { listarModulos } from "../../module";
import { AJUSTES_NUCLEO } from "./nucleo";
import { AJUSTES_RETENCION } from "./nucleo-retencion";
import { type CampoAjuste, defineAjustes } from "./registro";

/** Ajustes del núcleo más los de cada módulo registrado con `configuracion` no vacía. */
export function listarAjustes(): CampoAjuste[] {
  const modulos = listarModulos().flatMap((m) =>
    m.configuracion instanceof z.ZodObject && Object.keys(m.configuracion.shape).length
      ? defineAjustes(m.id, m.configuracion)
      : [],
  );
  return [...AJUSTES_NUCLEO, ...AJUSTES_RETENCION, ...modulos];
}

export function campoAjuste(modulo: string, clave: string): CampoAjuste | undefined {
  return listarAjustes().find((c) => c.modulo === modulo && c.clave === clave);
}
