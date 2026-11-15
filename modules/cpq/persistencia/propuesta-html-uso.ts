import { reglaDeNegocio, resolverCamposDocumento, type Contexto } from "@opai/capabilities";
import { renderizarPlantillaCampos, validarPlantillaCampos } from "@opai/domain";

import type { ContratoCamposEnvio } from "../domain/documento/propuesta-tecnica";
import { sanearHtml } from "../domain/documento/sanear-html";
import { cuentaDeCotizacion } from "./propuesta-campos";

type ValoresHtml = ContratoCamposEnvio["valores"];
const SIN_VALORES: ValoresHtml = { campos: {}, colecciones: { instalaciones: [] } };

/** Plantilla HTML en uso de la empresa; con datos antiguos de más de una en uso, la más reciente. */
export function plantillaHtmlEnUso(ctx: Contexto) {
  return ctx.db.cpqPropuestaHtml.findFirst({
    where: { estado: "activa" },
    orderBy: { createdAt: "desc" },
    select: { id: true, version: true, hashSha256: true, htmlSaneado: true },
  });
}

/** La versión congelada en un envío: el HTML guardado es inmutable y se comprueba su huella. */
export async function plantillaHtmlDeEnvio(ctx: Contexto, ref: { id: string; hash: string }) {
  const f = await ctx.db.cpqPropuestaHtml.findFirst({ where: { id: ref.id }, select: { htmlSaneado: true, hashSha256: true } });
  if (!f || f.hashSha256 !== ref.hash) throw reglaDeNegocio("No se encontró la plantilla HTML congelada del envío.");
  return f.htmlSaneado;
}

/** Reemplaza los campos (escapados) y vuelve a sanear: al PDF solo llega HTML seguro y sin recursos externos. */
export function htmlConValores(html: string, valores: ValoresHtml = SIN_VALORES): string {
  const r = renderizarPlantillaCampos(html, valores, { finalidad: "propuesta", html: true });
  if (!r.ok) {
    throw reglaDeNegocio(`La plantilla HTML tiene campos que no se pueden usar: ${r.problemas.slice(0, 3).map((p) => p.mensaje).join(" ")}`);
  }
  const s = sanearHtml(r.texto);
  if (!s.ok) throw reglaDeNegocio("Los datos de la cotización no caben en la plantilla HTML: revisa los textos del cliente.");
  return s.html;
}

/** Valores para la vista previa: lo que falta queda vacío; el envío, en cambio, exige todos (contrato de campos). */
export async function valoresVistaHtml(ctx: Contexto, cotizacionId: string, html: string): Promise<ValoresHtml> {
  const v = validarPlantillaCampos(html, "propuesta");
  if (v.usados.length === 0 && v.colecciones.length === 0) return SIN_VALORES;
  const cuentaId = await cuentaDeCotizacion(ctx, cotizacionId);
  if (!cuentaId) return SIN_VALORES;
  const r = await resolverCamposDocumento(ctx, {
    finalidad: "propuesta",
    cuentaId,
    referencias: v.colecciones.includes("referencias"),
  });
  return { campos: r.campos, colecciones: r.colecciones };
}
