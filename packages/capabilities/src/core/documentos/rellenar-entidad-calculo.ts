// Cálculo compartido de «rellenar_entidad» y «generar_entidad» (CAR-315 parte 2): la plantilla vigente
// de una cuenta o de una instalación con los datos de la entidad.
import {
  ambitoDeClase,
  ETIQUETA_AMBITO_PLANTILLA,
  etiquetaDeVariable,
  fechaDeDocumento,
  rellenarPlantilla,
  type ClasePlantilla,
} from "@opai/domain";

import { reglaDeNegocio } from "../../errores";
import type { Contexto } from "../../types";
import { hoy } from "../maestros/comun";
import { plantillaVigente } from "./plantilla-vigente";
import { valoresDeEntidad } from "./rellenar-valores-entidad";

export async function calcularRellenoEntidad(ctx: Contexto, input: { plantillaId: string; entidadId: string; fecha?: string | undefined }) {
  const { plantilla, version } = await plantillaVigente(ctx, input.plantillaId);
  const ambito = ambitoDeClase(plantilla.clase as ClasePlantilla);
  if (ambito === "persona")
    throw reglaDeNegocio("Esta plantilla se genera sobre una persona: usa rellenar o generar con la persona.");
  const fecha = input.fecha ?? hoy();
  const { nombre, valores, motivos } = await valoresDeEntidad(ctx, ambito, input.entidadId);
  const relleno = rellenarPlantilla(version.contenido, { ...valores, "contrato.fecha": fechaDeDocumento(fecha) });
  const faltantes = relleno.faltantes.map((clave) => ({
    clave,
    etiqueta: etiquetaDeVariable(clave),
    motivo: motivos[clave] ?? "Falta el dato.",
  }));
  return { entidad: { tipo: ambito, id: input.entidadId, nombre, etiqueta: ETIQUETA_AMBITO_PLANTILLA[ambito] }, plantilla, version, fecha, relleno, faltantes };
}
