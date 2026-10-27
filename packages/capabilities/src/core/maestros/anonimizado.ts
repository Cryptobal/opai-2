import { reglaDeNegocio } from "../../errores";

/**
 * Una persona o un contacto anonimizado (Ley 21.719, Brief 07d) no admite escrituras: volver a
 * llenar su identidad crearía datos nuevos que la política de retención ya no vigilaría, y colgarle
 * un hecho regulado nuevo (p. ej. un vínculo) lo mezclaría con una identidad borrada.
 */
export function exigirNoAnonimizado(
  r: { anonimizadaEn?: Date | null; anonimizadoEn?: Date | null },
  que: string,
): void {
  if (r.anonimizadaEn || r.anonimizadoEn)
    throw reglaDeNegocio(`${que} fue anonimizado y no admite cambios (Ley 21.719).`);
}
