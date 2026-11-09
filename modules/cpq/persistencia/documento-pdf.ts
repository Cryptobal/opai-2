import { PDFDocument } from "pdf-lib";

import type { EntradaPdfCotizacion } from "./documento-pdf-tipos";
import {
  condiciones,
  datosCliente,
  datosProveedor,
  detalleYTotales,
  firma,
} from "./documento-pdf-bloques";
import type { MarcaDocumentoVista } from "./marca-documento";
import type { PlantillaDocumentoVista } from "./plantilla-documento";
import { acentoDeMarca } from "./pdf/colores";
import { incrustarFuentes } from "./pdf/fuentes";
import { Hoja } from "./pdf/hoja";
import type { LogoPdf } from "./pdf/logo";
import { membrete } from "./pdf/membrete";

export type { EntradaPdfCotizacion, LineaPdfCotizacion } from "./documento-pdf-tipos";

/** Marca de agua mientras la versión no se haya enviado, o si no hay precio. */
export function marcaDeAgua(e: Pick<EntradaPdfCotizacion, "enviada" | "calculo">): string | null {
  if (e.calculo.borradorSinPrecio) return "BORRADOR SIN PRECIO";
  return e.enviada ? null : "BORRADOR";
}

/** PDF A4 de la cotización: tipografías incrustadas, logo y colores de la marca del tenant. */
export async function renderPdfCotizacion(
  entrada: EntradaPdfCotizacion,
  marca: MarcaDocumentoVista,
  plantilla: PlantillaDocumentoVista,
  opciones?: { logo?: LogoPdf | null },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const nombre = marca.nombreComercial ?? marca.razonSocial ?? "";
  doc.setTitle(`Cotización ${entrada.codigo}`);
  doc.setProducer("OPAI");
  const h = new Hoja(doc, await incrustarFuentes(doc), acentoDeMarca(marca.colorPrimario));
  const v = entrada.versionNumero != null ? ` · versión ${entrada.versionNumero}` : "";

  for (const b of plantilla.bloques.filter((x) => x.activo)) {
    switch (b.id) {
      case "encabezado":
        await membrete(h, marca, opciones?.logo ?? null, {
          etiqueta: "Cotización",
          codigo: entrada.codigo,
          detalle: `${entrada.calculo.fecha}${v}`,
        });
        h.parrafo(entrada.titulo, { tam: 15, fuente: "negrita" });
        if (entrada.negocio) h.parrafo(entrada.negocio, { tam: 10, color: [113, 113, 122] });
        if (entrada.ejecutivo)
          h.parrafo(`Ejecutivo: ${entrada.ejecutivo}`, { tam: 9, color: [113, 113, 122] });
        break;
      case "datos_empresa":
        datosProveedor(h, marca);
        break;
      case "resumen_comercial":
        datosCliente(h, entrada);
        break;
      case "detalle_secciones":
        detalleYTotales(h, entrada);
        break;
      case "condiciones": {
        const texto = (entrada.condiciones ?? marca.condicionesDefault ?? "").trim();
        if (texto) condiciones(h, texto);
        break;
      }
      case "pie":
        firma(h, nombre);
        break;
    }
  }
  h.cerrar({
    pie: marca.piePagina ?? `${nombre} · ${entrada.codigo}`,
    marcaAgua: marcaDeAgua(entrada),
  });
  return doc.save();
}
