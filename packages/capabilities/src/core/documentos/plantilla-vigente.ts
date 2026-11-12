// La plantilla activa con su versión vigente (CAR-127 / CAR-315): compartido por rellenar y generar,
// sea sobre una persona o sobre una cuenta o instalación.
import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";

export async function plantillaVigente(ctx: Contexto, plantillaId: string) {
  const plantilla = await ctx.db.documentoPlantilla.findUnique({ where: { id: plantillaId } });
  if (!plantilla) throw noEncontrado("La plantilla");
  if (!plantilla.activa) throw reglaDeNegocio("La plantilla está desactivada.");
  const version = await ctx.db.documentoPlantillaVersion.findFirst({
    where: { plantillaId: plantilla.id, numero: plantilla.versionVigente },
  });
  if (!version) throw noEncontrado("La versión vigente de la plantilla");
  return { plantilla, version };
}
