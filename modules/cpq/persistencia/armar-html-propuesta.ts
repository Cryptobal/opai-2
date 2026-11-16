import { noEncontrado, reglaDeNegocio, type Contexto } from "@opai/capabilities";
import { renderizarPlantillaCampos } from "@opai/domain";

import type { CapituloVista } from "../domain/documento/capitulo-instalacion";
import { htmlBasePropuesta } from "../domain/documento/html-base-propuesta";
import { conSecciones, htmlSecciones } from "../domain/documento/html-secciones";
import { sanearHtml } from "../domain/documento/sanear-html";
import {
  parseBloquesArmadorPropuesta,
  type AperturaPropuesta,
  type ContratoCamposEnvio,
  type ServicioDesdeCotizacion,
} from "../domain/documento/propuesta-tecnica";
import { entradaPdfDesdeCotizacion } from "./entrada-pdf-cotizacion";
import type { MarcaDocumentoVista } from "./marca-documento";
import { textosBiblioteca } from "./pdf-propuesta-biblioteca";
import { htmlConValores, plantillaHtmlEnUso, valoresVistaHtml } from "./propuesta-html-uso";
import { tasaIvaVentaTenant } from "./tasa-iva-tenant";

export type EntradaHtmlPropuesta = {
  cotizacionId: string;
  titulo: string;
  borrador: boolean;
  bloquesJson: string;
  versionesBiblioteca?: Readonly<Record<string, number>>;
  htmlPlantilla: string | null;
  marca: MarcaDocumentoVista;
  servicio: ServicioDesdeCotizacion;
  netoTotalClp: number;
  apertura: AperturaPropuesta;
  capitulos: readonly CapituloVista[];
  valores?: ContratoCamposEnvio["valores"];
};

const CRUDOS = /\{\{[\s#/]?[^}]+\}\}/g;

async function plantillaConSecciones(ctx: Contexto, d: EntradaHtmlPropuesta): Promise<string> {
  const entrada = await entradaPdfDesdeCotizacion(ctx, d.cotizacionId, { enviada: !d.borrador });
  if (!entrada) throw noEncontrado("La cotización");
  const secciones = htmlSecciones({
    bloques: parseBloquesArmadorPropuesta(d.bloquesJson),
    textosBiblioteca: await textosBiblioteca(ctx, d.bloquesJson, d.versionesBiblioteca),
    servicio: d.servicio,
    capitulos: d.capitulos,
    resumen: {
      apertura: d.apertura,
      secciones: entrada.secciones.map((s) => ({
        nombre: s.nombre,
        tienePuestos: s.lineas.some((l) => l.tipo === "puesto"),
        netoMensualClp: s.lineas.reduce((a, l) => a + (l.ventaMensualClp ?? 0), 0),
      })),
      netoTotalClp: d.netoTotalClp,
      tasaIvaPct: await tasaIvaVentaTenant(ctx),
    },
    ejecutivo: entrada.ejecutivo ?? null,
    empresa: d.marca.nombreComercial ?? d.marca.razonSocial ?? "",
    condiciones: (entrada.condiciones ?? d.marca.condicionesDefault ?? "").trim(),
    borrador: d.borrador,
  });
  const base =
    d.htmlPlantilla ??
    htmlBasePropuesta({
      titulo: d.titulo,
      negocio: entrada.negocio,
      cliente: entrada.cliente?.razonSocial ?? entrada.cliente?.nombre ?? null,
      validaHasta: entrada.validaHasta ?? null,
    });
  return conSecciones(base, secciones);
}

/** Arma el HTML final de la propuesta (plantilla + secciones + datos), igual que el PDF. */
export async function armarHtmlPropuesta(ctx: Contexto, d: EntradaHtmlPropuesta): Promise<string> {
  const plantilla = await plantillaConSecciones(ctx, d);
  const valores = d.valores ?? (await valoresVistaHtml(ctx, d.cotizacionId, plantilla));
  return htmlConValores(plantilla, valores);
}

/** Vista previa: tolera marcadores vacíos e informa los que quedaron sin resolver. */
export async function armarHtmlPropuestaVista(
  ctx: Contexto,
  d: EntradaHtmlPropuesta,
): Promise<{ html: string; faltantes: string[]; crudos: string[] }> {
  const plantilla = await plantillaConSecciones(ctx, d);
  const valores = d.valores ?? (await valoresVistaHtml(ctx, d.cotizacionId, plantilla));
  const r = renderizarPlantillaCampos(plantilla, valores, { finalidad: "propuesta", html: true });
  if (!r.ok) throw reglaDeNegocio(r.problemas.map((p) => p.mensaje).join(" "));
  const s = sanearHtml(r.texto);
  const html = s.ok ? s.html : r.texto;
  return {
    html,
    faltantes: r.faltantes,
    crudos: [...new Set(html.match(CRUDOS) ?? [])],
  };
}

/** HTML de plantilla en uso o base OPAI si no hay una activa. */
export async function htmlPlantillaVigente(ctx: Contexto, tituloCotizacion: string, cotizacionId: string) {
  const enUso = await plantillaHtmlEnUso(ctx);
  if (enUso) return { html: enUso.htmlSaneado, origen: "empresa" as const, nombre: enUso.nombre, version: enUso.version };
  const entrada = await entradaPdfDesdeCotizacion(ctx, cotizacionId, {});
  return {
    html: htmlBasePropuesta({
      titulo: tituloCotizacion,
      negocio: entrada?.negocio ?? null,
      cliente: entrada?.cliente?.razonSocial ?? entrada?.cliente?.nombre ?? null,
      validaHasta: entrada?.validaHasta ?? null,
    }),
    origen: "opai" as const,
    nombre: null as string | null,
    version: null as number | null,
  };
}