import { PDFDocument } from "pdf-lib";

import type {
  AperturaPropuesta,
  ServicioDesdeCotizacion,
} from "../domain/documento/propuesta-tecnica";
import type { CapituloVista } from "../domain/documento/capitulo-instalacion";
import { armarIndice } from "../domain/documento/indice-propuesta";
import type { EntradaPdfCotizacion } from "./documento-pdf-tipos";
import type { MarcaDocumentoVista } from "./marca-documento";
import { acentoDeMarca } from "./pdf/colores";
import { incrustarFuentes } from "./pdf/fuentes";
import { Hoja } from "./pdf/hoja";
import type { LogoPdf } from "./pdf/logo";
import { membrete } from "./pdf/membrete";
import {
  contactoEjecutivo,
  detalleServicio,
  indice,
  resumenEconomico,
  textoSeccion,
  TITULOS_BLOQUE,
} from "./pdf-propuesta-bloques";
import { capituloInstalacion, itemIndice } from "./pdf-propuesta-capitulos";
import { parseArmador } from "./propuesta-tecnica";

export type EntradaPdfPropuesta = {
  codigo: string;
  titulo: string;
  borrador: boolean;
  bloquesJson: string;
  marca: MarcaDocumentoVista;
  servicio: ServicioDesdeCotizacion;
  /** Valores reales por línea de la cotización (los mismos del PDF de cotización). */
  economia: Pick<
    EntradaPdfCotizacion,
    "secciones" | "cliente" | "ejecutivo" | "negocio" | "validaHasta" | "condiciones"
  > & {
    fecha: string;
  };
  netoTotalClp: number;
  apertura: AperturaPropuesta;
  gastosGeneralesYUtilidadClp?: number | null;
  tasaIvaPct?: number;
  /** Texto de la biblioteca por `bibliotecaClave`, ya resuelto a la versión del envío. */
  textosBiblioteca?: Readonly<Record<string, string>>;
  logo?: LogoPdf | null;
  /** Capítulos por instalación (se imprimen tras el detalle del servicio). */
  capitulos?: readonly CapituloVista[];
};

export async function renderPdfPropuestaTecnica(i: EntradaPdfPropuesta): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Propuesta técnica ${i.codigo}`);
  doc.setProducer("OPAI");
  const h = new Hoja(doc, await incrustarFuentes(doc), acentoDeMarca(i.marca.colorPrimario));
  const nombre = i.marca.nombreComercial ?? i.marca.razonSocial ?? "";
  const bloques = parseArmador(i.bloquesJson).filter((b) => b.activo);
  const texto = (b: (typeof bloques)[number]) =>
    (
      b.contenidoOverride ??
      (b.bibliotecaClave ? i.textosBiblioteca?.[b.bibliotecaClave] : null) ??
      ""
    ).trim();
  const titulo = (b: (typeof bloques)[number]) =>
    b.titulo?.trim() || TITULOS_BLOQUE[b.tipo] || "Información adicional";
  const condiciones = (b: (typeof bloques)[number]) =>
    texto(b) || (i.economia.condiciones ?? i.marca.condicionesDefault ?? "").trim();
  const tieneContenido = (b: (typeof bloques)[number]) => {
    switch (b.tipo) {
      case "portada":
      case "indice":
      case "salto_pagina":
        return false;
      case "detalle_servicio":
        return i.servicio.secciones.some((s) => s.puestos.length > 0);
      case "resumen_economico":
        return true;
      case "contacto_ejecutivo":
        return Boolean(i.economia.ejecutivo);
      case "condiciones":
        return condiciones(b) !== "";
      default:
        return texto(b) !== "";
    }
  };
  const conContenido = bloques.filter(tieneContenido);
  const capitulos = i.capitulos ?? [];
  const items = conContenido.map((b) => itemIndice(titulo(b), b.tipo, capitulos));
  const numero = (b: (typeof bloques)[number]) =>
    capitulos.length ? String(conContenido.indexOf(b) + 1) : undefined;
  const conNum = (b: (typeof bloques)[number]) => (numero(b) ? `${numero(b)}. ${titulo(b)}` : titulo(b));

  for (const b of bloques) {
    switch (b.tipo) {
      case "portada":
        await membrete(h, i.marca, i.logo ?? null, {
          etiqueta: "Propuesta técnica",
          codigo: i.codigo,
          detalle: i.economia.fecha,
        });
        h.espacio(70);
        h.parrafo(i.titulo, { tam: 24, fuente: "negrita", interlineado: 1.25 });
        if (i.economia.negocio) h.parrafo(i.economia.negocio, { tam: 12, color: [113, 113, 122] });
        h.espacio(26);
        if (i.economia.cliente)
          h.parrafo(
            `Preparada para ${i.economia.cliente.razonSocial ?? i.economia.cliente.nombre}`,
            { tam: 11, fuente: "semi" },
          );
        if (i.economia.validaHasta)
          h.parrafo(`Vigencia hasta el ${i.economia.validaHasta}`, {
            tam: 9.5,
            color: [113, 113, 122],
          });
        h.nueva();
        break;
      case "indice":
        if (items.length) indice(h, armarIndice(items));
        break;
      case "salto_pagina":
        h.nueva();
        break;
      case "detalle_servicio":
        if (tieneContenido(b)) detalleServicio(h, i.servicio, numero(b));
        capitulos.forEach((c, k) => capituloInstalacion(h, c, `${numero(b) ?? "0"}.${k + 1}`, i.borrador));
        break;
      case "resumen_economico":
        resumenEconomico(h, {
          apertura: i.apertura,
          secciones: i.economia.secciones,
          netoTotalClp: i.netoTotalClp,
          ...(i.gastosGeneralesYUtilidadClp !== undefined
            ? { gastosGeneralesYUtilidadClp: i.gastosGeneralesYUtilidadClp }
            : {}),
          ...(i.tasaIvaPct !== undefined ? { tasaIvaPct: i.tasaIvaPct } : {}),
          ...(numero(b) ? { numero: numero(b)! } : {}),
        });
        break;
      case "contacto_ejecutivo":
        if (i.economia.ejecutivo) contactoEjecutivo(h, i.economia.ejecutivo, i.marca, numero(b));
        break;
      case "condiciones":
        if (condiciones(b)) textoSeccion(h, conNum(b), condiciones(b));
        break;
      default:
        if (texto(b)) textoSeccion(h, conNum(b), texto(b));
    }
  }
  h.cerrar({
    pie: i.marca.piePagina ?? `${nombre} · ${i.codigo}`,
    marcaAgua: i.borrador ? "BORRADOR" : null,
  });
  return doc.save();
}
