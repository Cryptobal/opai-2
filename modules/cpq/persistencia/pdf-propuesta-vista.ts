import type { Contexto } from "@opai/capabilities";

import { aperturaEfectiva, type ServicioDesdeCotizacion } from "../domain/documento/propuesta-tecnica";
import { entradaPdfDesdeCotizacion } from "./entrada-pdf-cotizacion";
import type { MarcaDocumentoVista } from "./marca-documento";
import { cargarLogoMarca } from "./pdf/logo";
import { textosBiblioteca } from "./pdf-propuesta-biblioteca";
import { renderPdfPropuestaTecnica } from "./pdf-propuesta-tecnica";
import type { PlantillaPropuestaVista } from "./plantilla-propuesta";
import { tasaIvaVentaTenant } from "./tasa-iva-tenant";

/** Vista previa (o borrador) del PDF de la propuesta técnica con los datos vigentes de la cotización. */
export async function pdfPropuestaVista(
  ctx: Contexto,
  d: {
    cotizacionId: string;
    codigo: string;
    titulo: string;
    fecha: string;
    borrador: boolean;
    bloquesJson: string;
    plantilla: PlantillaPropuestaVista;
    marca: MarcaDocumentoVista;
    servicio: ServicioDesdeCotizacion;
    netoTotalClp: number;
  },
): Promise<Uint8Array> {
  const entrada = await entradaPdfDesdeCotizacion(ctx, d.cotizacionId);
  return renderPdfPropuestaTecnica({
    codigo: d.codigo,
    titulo: d.titulo,
    borrador: d.borrador,
    bloquesJson: d.bloquesJson,
    marca: d.marca,
    servicio: d.servicio,
    economia: {
      secciones: entrada?.secciones ?? [],
      cliente: entrada?.cliente ?? null,
      ejecutivo: entrada?.ejecutivo ?? null,
      negocio: entrada?.negocio ?? "",
      validaHasta: entrada?.validaHasta ?? null,
      condiciones: entrada?.condiciones ?? null,
      fecha: d.fecha,
    },
    netoTotalClp: d.netoTotalClp,
    apertura: aperturaEfectiva(d.plantilla.aperturaMaxima, d.plantilla.aperturaMaxima),
    tasaIvaPct: await tasaIvaVentaTenant(ctx),
    textosBiblioteca: await textosBiblioteca(ctx, d.bloquesJson),
    logo: await cargarLogoMarca(ctx),
  });
}
