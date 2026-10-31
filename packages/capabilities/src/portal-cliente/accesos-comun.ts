import { noEncontrado } from "../errores";
import type { Contexto } from "../types";
import { accesosDeCuenta } from "./accesos";
import type { AccesoVista } from "./accesos-vista";
import { instalacionesDeCuenta } from "./comun";

/** Las instalaciones pedidas existen y son de ESTA cuenta (no de otra cuenta de la misma empresa). */
export async function instalacionesDeLaCuenta(ctx: Contexto, cuentaId: string, ids: readonly string[]) {
  const unicas = [...new Set(ids)];
  if (unicas.length === 0) return unicas;
  const de = new Set((await instalacionesDeCuenta(ctx, cuentaId)).map((i) => i.id));
  if (unicas.some((id) => !de.has(id))) throw noEncontrado("Alguna instalación de la cuenta");
  return unicas;
}

export const unAcceso = async (ctx: Contexto, cuentaId: string, id: string): Promise<AccesoVista> => {
  const a = (await accesosDeCuenta(ctx, cuentaId)).find((x) => x.id === id);
  if (!a) throw noEncontrado("El acceso");
  return a;
};

