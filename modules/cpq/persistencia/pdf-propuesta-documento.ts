import { noEncontrado, type Contexto } from "@opai/capabilities";

import type { CapituloVista } from "../domain/documento/capitulo-instalacion";
import { htmlBasePropuesta } from "../domain/documento/html-base-propuesta";
import { conSecciones, htmlSecciones } from "../domain/documento/html-secciones";
import {
  parseBloquesArmadorPropuesta,
  type AperturaPropuesta,
  type ContratoCamposEnvio,
  type ServicioDesdeCotizacion,
} from "../domain/documento/propuesta-tecnica";
import { entradaPdfDesdeCotizacion } from "./entrada-pdf-cotizacion";
import type { MarcaDocumentoVista } from "./marca-documento";
import { cargarLogoMarca } from "./pdf/logo";
import { textosBiblioteca } from "./pdf-propuesta-biblioteca";
import { renderPdfPropuestaHtml } from "./pdf-propuesta-html";
import { htmlConValores, valoresVistaHtml } from "./propuesta-html-uso";
import { tasaIvaVentaTenant } from "./tasa-iva-tenant";

export type EntradaDocumentoPropuesta = {
  cotizacionId: string;
  codigo: string;
  titulo: string;
  borrador: boolean;
  bloquesJson: string;
  /** Versiones de biblioteca congeladas del envío; sin ellas, las publicadas hoy. */
  versionesBiblioteca?: Readonly<Record<string, number>>;
  /** HTML saneado de la plantilla de la empresa; sin ella, la plantilla base de OPAI. */
  htmlPlantilla: string | null;
  marca: MarcaDocumentoVista;
  servicio: ServicioDesdeCotizacion;
  netoTotalClp: number;
  apertura: AperturaPropuesta;
  capitulos: readonly CapituloVista[];
  /** Valores congelados del envío; sin ellos se resuelven los vigentes (los datos que faltan quedan vacíos). */
  valores?: ContratoCamposEnvio["valores"];
};

/**
 * Único motor del PDF de la propuesta (CAR-575): la plantilla HTML de la empresa (o la base de OPAI) con las secciones
 * activas del armador donde está `{{secciones}}`. La vista previa y el envío pasan por aquí; solo cambian los valores.
 */
export async function pdfPropuestaDocumento(ctx: Contexto, d: EntradaDocumentoPropuesta): Promise<Uint8Array> {
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
  const html = conSecciones(base, secciones);
  return renderPdfPropuestaHtml({
    codigo: d.codigo,
    fecha: entrada.calculo.fecha,
    borrador: d.borrador,
    marca: d.marca,
    logo: await cargarLogoMarca(ctx),
    html: htmlConValores(html, d.valores ?? (await valoresVistaHtml(ctx, d.cotizacionId, html))),
  });
}
