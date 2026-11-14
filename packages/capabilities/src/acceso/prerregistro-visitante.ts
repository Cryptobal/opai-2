import { z } from "zod";

import { normalizarDocumento, normalizarPatente } from "@opai/domain";

import { reglaDeNegocio } from "../errores";
import type { Contexto } from "../types";
import { huellaVigente } from "./huella";

export const visitanteSchema = z
  .object({
    nombre: z.string().trim().min(2).max(120),
    documento: z
      .object({
        tipo: z.enum(["run", "pasaporte", "otro"]),
        numero: z.string().min(1).max(40),
        pais: z.string().min(2).max(3).optional(),
      })
      .strict(),
    empresa: z.string().trim().max(120).optional(),
    patente: z.string().trim().max(12).optional(),
  })
  .strict();
type Visitante = z.infer<typeof visitanteSchema>;

/** Documento y patente normalizados, con la huella vigente; sin el número completo (Ley 21.719). */
export function visitanteParaGuardar(ctx: Contexto, v: Visitante) {
  const d = normalizarDocumento({
    tipo: v.documento.tipo,
    numero: v.documento.numero,
    ...(v.documento.pais === undefined ? {} : { pais: v.documento.pais }),
  });
  if (!d) throw reglaDeNegocio(`El documento de ${v.nombre} no es válido.`);
  const patente = v.patente ? normalizarPatente(v.patente) : null;
  if (patente === null && v.patente)
    throw reglaDeNegocio(`La patente de ${v.nombre} no es válida.`);
  const h = huellaVigente({ tenantId: ctx.tenantId, tipo: d.tipo, clave: d.clave });
  return {
    tenantId: ctx.tenantId,
    nombre: v.nombre,
    docTipo: d.tipo,
    huella: h.huella,
    huellaKid: h.kid,
    mascara: d.mascara,
    empresa: v.empresa || null,
    patente,
  };
}
