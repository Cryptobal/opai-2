import { noEncontrado, reglaDeNegocio, type Contexto } from "@opai/capabilities";

import {
  parseBloquesArmadorPropuesta,
  type DestinatarioEnvio,
  type SnapshotEnvioPropuesta,
} from "../domain/documento/propuesta-tecnica";
import { asegurarMarcaDocumento } from "./marca-documento";
import { contratoCamposPropuesta } from "./propuesta-campos";
import { plantillaActivaPropuestaLectura, vistaPlantillaPropuesta } from "./plantilla-propuesta";

export async function construirSnapshotEnvioPropuesta(
  ctx: Contexto,
  input: {
    cotizacionId: string;
    propuestaTecnicaId: string | null | undefined;
    destinatarios: DestinatarioEnvio[];
  },
): Promise<SnapshotEnvioPropuesta> {
  const marcaRow = await asegurarMarcaDocumento(ctx);
  const plantillaRow = await plantillaActivaPropuestaLectura(ctx);
  if (!plantillaRow) {
    throw reglaDeNegocio(
      "Falta la plantilla activa de propuesta técnica; configúrala antes de enviar.",
    );
  }
  const plantilla = vistaPlantillaPropuesta(plantillaRow);
  let propuestaBloquesJson = "[]";
  const bloquesBiblioteca: Record<string, number> = {};
  if (input.propuestaTecnicaId) {
    const prop = await ctx.db.cpqPropuestaTecnica.findFirst({
      where: { id: input.propuestaTecnicaId, cotizacionId: input.cotizacionId },
    });
    if (!prop) throw noEncontrado("La propuesta técnica");
    propuestaBloquesJson = prop.bloquesJson;
    const bloques = parseBloquesArmadorPropuesta(prop.bloquesJson);
    const claves = [
      ...new Set(
        bloques.map((b) => b.bibliotecaClave).filter((c): c is string => Boolean(c?.trim())),
      ),
    ];
    if (claves.length) {
      const rows = await ctx.db.cpqBibliotecaBloque.findMany({
        where: { tenantId: ctx.tenantId, clave: { in: claves } },
        select: { clave: true, versionPublicada: true },
      });
      for (const r of rows) {
        bloquesBiblioteca[r.clave] = r.versionPublicada;
      }
    }
  }
  const camposContrato = input.propuestaTecnicaId
    ? await contratoCamposPropuesta(ctx, {
        cotizacionId: input.cotizacionId,
        propuestaBloquesJson,
        bloquesBiblioteca,
        destinatarios: input.destinatarios,
      })
    : undefined;
  return {
    marcaDocumentoVersion: marcaRow.version,
    plantillaDocumentoId: plantilla.id,
    plantillaDocumentoVersion: plantilla.version,
    bloquesBiblioteca,
    propuestaBloquesJson,
    destinatarios: input.destinatarios,
    ...(camposContrato ? { camposContrato } : {}),
  };
}

export function snapshotEnvioPendiente(destinatarios: DestinatarioEnvio[]): SnapshotEnvioPropuesta {
  return {
    marcaDocumentoVersion: 0,
    plantillaDocumentoId: "",
    plantillaDocumentoVersion: 0,
    bloquesBiblioteca: {},
    propuestaBloquesJson: "[]",
    destinatarios,
  };
}

export function parseSnapshotEnvioPropuesta(json: string): SnapshotEnvioPropuesta {
  const raw = JSON.parse(json) as SnapshotEnvioPropuesta;
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.destinatarios)) {
    throw reglaDeNegocio("El snapshot del envío está corrupto.");
  }
  return raw;
}
