// Cálculo compartido de «rellenar» y «generar» (CAR-127): la plantilla vigente con los datos de la persona.
import {
  ambitoDeClase,
  type ClasePlantilla,
  documentoUsaVariablesSensibles,
  etiquetaDeVariable,
  fechaDeDocumento,
  rellenarPlantilla,
  variablesDeDocumento,
} from "@opai/domain";

import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { hoy } from "../maestros/comun";
import { personaDe } from "../maestros/personas-vista";
import { plantillaVigente } from "./plantilla-vigente";
import { valoresDePersona } from "./rellenar-valores";

export async function calcularRelleno(ctx: Contexto, input: { plantillaId: string; personaId: string; fecha?: string | undefined }) {
  const persona = await personaDe(ctx, input.personaId);
  const { plantilla, version } = await plantillaVigente(ctx, input.plantillaId);
  if (ambitoDeClase(plantilla.clase as ClasePlantilla) !== "persona")
    throw reglaDeNegocio("Esta plantilla se genera sobre una cuenta o una instalación: usa rellenar_entidad o generar_entidad.");
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
