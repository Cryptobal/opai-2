// Cálculo compartido de «rellenar» y «generar» (CAR-127): la plantilla vigente con los datos de la persona.
import {
  documentoUsaVariablesSensibles,
  etiquetaDeVariable,
  fechaDeDocumento,
  rellenarPlantilla,
  variablesDeDocumento,
} from "@opai/domain";

import { noEncontrado, reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { hoy } from "../maestros/comun";
import { personaDe } from "../maestros/personas-vista";
import { valoresDePersona } from "./rellenar-valores";

export async function calcularRelleno(ctx: Contexto, input: { plantillaId: string; personaId: string; fecha?: string | undefined }) {
  const persona = await personaDe(ctx, input.personaId);
  const plantilla = await ctx.db.documentoPlantilla.findUnique({ where: { id: input.plantillaId } });
  if (!plantilla) throw noEncontrado("La plantilla");
  if (!plantilla.activa) throw reglaDeNegocio("La plantilla está desactivada.");
  const version = await ctx.db.documentoPlantillaVersion.findFirst({
    where: { plantillaId: plantilla.id, numero: plantilla.versionVigente },
  });
  if (!version) throw noEncontrado("La versión vigente de la plantilla");
  const fecha = input.fecha ?? hoy();
  const claves = variablesDeDocumento(version.contenido);
  const { valores, motivos } = await valoresDePersona(ctx, persona, fecha, claves, documentoUsaVariablesSensibles(version.contenido));
  const relleno = rellenarPlantilla(version.contenido, { ...valores, "contrato.fecha": fechaDeDocumento(fecha) });
  const faltantes = relleno.faltantes.map((clave) => ({
    clave,
    etiqueta: etiquetaDeVariable(clave),
    motivo: motivos[clave] ?? "Falta el dato en la ficha.",
  }));
  return { persona, plantilla, version, fecha, relleno, faltantes };
}
