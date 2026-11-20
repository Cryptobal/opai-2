// PDF laboral de una persona desde plantilla vigente (compartido: generar y envío masivo).
import { nombreSeguro } from "@opai/domain";

import type { Contexto } from "../../types";
import { marcaDe } from "../comunicaciones/resolver";
import { logoDeMarca } from "../../finanzas/ventas-pdf-logo";
import { guardarPdfGenerado } from "./guardar-generado";
import { generarPdfLaboral } from "./pdf-laboral";
type PlantillaDoc = { id: string; nombre: string; clase: string; nivelFirma: string; firmantes: string | null };
type VersionDoc = { numero: number };

export async function generarPdfLaboralPersona(
  ctx: Contexto,
  plantilla: PlantillaDoc,
  version: VersionDoc,
  persona: { id: string; nombres: string; apellidos: string; rut: string },
  relleno: { parrafos: Parameters<typeof generarPdfLaboral>[0]["parrafos"] },
) {
  const marca = await marcaDe(ctx.db, ctx.tenantId, ctx.servicios.urlBase);
  const { bytes, paginas } = await generarPdfLaboral({
    titulo: plantilla.nombre,
    marca,
    parrafos: relleno.parrafos,
    logo: await logoDeMarca(ctx),
  });
  const nombre = nombreSeguro(`${plantilla.nombre}-${persona.rut}.pdf`);
  const titulo = `${plantilla.nombre} · ${persona.nombres} ${persona.apellidos}`.trim();
  const documento = await guardarPdfGenerado(ctx, {
    bytes,
    nombre,
    titulo,
    plantilla,
    version,
    propietario: { tipo: "persona", id: persona.id },
  });
  return { documento, paginas };
}