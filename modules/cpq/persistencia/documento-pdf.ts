import { formatearClp, formatearNumero } from "@opai/domain";
import { UF_ESCALA } from "@opai/domain/dinero";

import type { BloqueConfig } from "../domain/documento/bloques";
import type { MarcaDocumentoVista } from "./marca-documento";
import type { PlantillaDocumentoVista } from "./plantilla-documento";
import { componerPdf, escPdf, parseColorHex, type LineaPdf, type PaginaPdf } from "./pdf-compositor";

export type LineaPdfCotizacion = {
  nombre: string;
  tipo: string;
  posiciones?: number;
  ventaMensualClp?: number | null;
};

export type EntradaPdfCotizacion = {
  codigo: string;
  titulo: string;
  negocio: string;
  versionNumero?: number;
  secciones: readonly {
    nombre: string;
    lineas: readonly LineaPdfCotizacion[];
  }[];
  calculo: {
    ventaMensual: number | null;
    fecha: string;
    pagosUnicos?: number;
    borradorSinPrecio?: boolean;
    uf?: { valorClpEscalado: number; fecha: string } | null;
  };
  condiciones?: string | null;
  validaHasta?: string | null;
  cliente?: {
    nombre: string;
    razonSocial: string | null;
    rut: string | null;
    giro: string | null;
    direccion: string | null;
  } | null;
  ejecutivo?: string | null;
  enviada?: boolean;
};

export function renderPdfCotizacion(
  entrada: EntradaPdfCotizacion,
  marca: MarcaDocumentoVista,
  plantilla: PlantillaDocumentoVista,
): Uint8Array {
  const bloques = plantilla.bloques.filter((b) => b.activo);
  const fuente = marca.tipografia === "times" ? "Times-Roman" : "Helvetica";
  const acento = parseColorHex(marca.colorPrimario);
  const paginas: PaginaPdf[] = [{ lineas: [] }];
  let pagina = paginas[0]!;

  const push = (l: LineaPdf) => {
    if (pagina.lineas.length > 52) {
      pagina = { lineas: [] };
      paginas.push(pagina);
    }
    pagina.lineas.push(l);
  };

  const marcaAgua =
    !entrada.enviada || entrada.calculo.borradorSinPrecio
      ? entrada.calculo.borradorSinPrecio
        ? "BORRADOR SIN PRECIO"
        : "BORRADOR"
      : null;
  if (marcaAgua) {
    push({ texto: marcaAgua, tamano: 22, negrita: true, colorRgb: [180, 180, 180], espacioAntes: 0 });
    push({ texto: "", espacioAntes: 8 });
  }

  for (const b of bloques) {
    for (const l of bloqueLineas(b, entrada, marca, plantilla.base, acento)) push(l);
    push({ texto: "", espacioAntes: 6 });
  }

  return componerPdf(paginas, fuente);
}

function bloqueLineas(
  bloque: BloqueConfig,
  e: EntradaPdfCotizacion,
  marca: MarcaDocumentoVista,
  base: PlantillaDocumentoVista["base"],
  acento: [number, number, number] | undefined,
): LineaPdf[] {
  const titulo =
    base === "compacta"
      ? `${e.codigo}${e.versionNumero != null ? ` v${e.versionNumero}` : ""} · ${e.titulo}`
      : `Cotización ${e.codigo}${e.versionNumero != null ? ` · v${e.versionNumero}` : ""}`;

  switch (bloque.id) {
    case "encabezado": {
      const empresa = marca.nombreComercial ?? marca.razonSocial ?? "Empresa";
      const lineas: LineaPdf[] = [
        { texto: empresa, tamano: 14, negrita: true, ...(acento ? { colorRgb: acento } : {}) },
        { texto: titulo, tamano: 12, negrita: true, espacioAntes: 4 },
        { texto: e.negocio, tamano: 10, espacioAntes: 2 },
      ];
      if (e.ejecutivo) lineas.push({ texto: `Ejecutivo: ${e.ejecutivo}`, tamano: 9, espacioAntes: 2 });
      return lineas;
    }
    case "datos_empresa":
      return [
        { texto: "Datos del proveedor", tamano: 10, negrita: true, espacioAntes: 4 },
        { texto: marca.razonSocial ?? marca.nombreComercial ?? "—", tamano: 10 },
        ...(marca.rut ? [{ texto: `RUT ${marca.rut}`, tamano: 9 }] : []),
        ...(marca.direccion ? [{ texto: marca.direccion, tamano: 9 }] : []),
      ];
    case "resumen_comercial": {
      const cli = e.cliente;
      const lineas: LineaPdf[] = [
        { texto: "Cliente", tamano: 10, negrita: true, espacioAntes: 4 },
        { texto: cli?.razonSocial ?? cli?.nombre ?? "—", tamano: 10 },
      ];
      if (cli?.rut) lineas.push({ texto: `RUT ${cli.rut}`, tamano: 9 });
      if (cli?.giro) lineas.push({ texto: `Giro: ${cli.giro}`, tamano: 9 });
      if (cli?.direccion) lineas.push({ texto: cli.direccion, tamano: 9 });
      lineas.push(
        { texto: "Validez y referencia", tamano: 10, negrita: true, espacioAntes: 8 },
        {
          texto: `Válida hasta: ${e.validaHasta ?? e.calculo.fecha ?? "—"}`,
          tamano: 9,
        },
        {
          texto: `Valores al ${e.calculo.fecha || "—"}`,
          tamano: 9,
        },
      );
      return lineas;
    }
    case "detalle_secciones":
      return tablaServicios(e);
    case "condiciones": {
      const texto = e.condiciones ?? marca.condicionesDefault ?? "Condiciones comerciales estándar del tenant.";
      return [
        { texto: "Condiciones comerciales", tamano: 10, negrita: true, espacioAntes: 4 },
        ...partirParrafos(texto).map((p) => ({ texto: p, tamano: 9 })),
      ];
    }
    case "pie":
      return [
        { texto: "Firma", tamano: 10, negrita: true, espacioAntes: 12 },
        { texto: "_______________________________", tamano: 10 },
        { texto: marca.nombreComercial ?? marca.razonSocial ?? "Empresa", tamano: 9, espacioAntes: 4 },
        {
          texto: marca.piePagina ?? `${marca.nombreComercial ?? "Empresa"} · documento generado en OPAI`,
          tamano: 8,
          espacioAntes: 10,
        },
      ];
    default:
      return [];
  }
}

function tablaServicios(e: EntradaPdfCotizacion): LineaPdf[] {
  const lineas: LineaPdf[] = [
    { texto: "Detalle de servicios", tamano: 10, negrita: true, espacioAntes: 4 },
    {
      texto: "Instalación / ítem · Tipo · Dotación · Venta mensual (CLP)",
      tamano: 8,
      negrita: true,
      espacioAntes: 4,
    },
  ];
  for (const s of e.secciones) {
    lineas.push({ texto: s.nombre, tamano: 9, negrita: true, espacioAntes: 6 });
    for (const l of s.lineas) {
      const dot = l.posiciones != null && l.posiciones > 0 ? ` ×${l.posiciones}` : "";
      const venta = formatoVentaLinea(l.ventaMensualClp, e.calculo.borradorSinPrecio);
      lineas.push({
        texto: `  ${l.nombre} · ${etiquetaTipo(l.tipo)}${dot} · ${venta}`,
        tamano: 9,
      });
    }
    if (!s.lineas.length) lineas.push({ texto: "  (sin líneas)", tamano: 9 });
  }
  lineas.push(
    { texto: "Totales", tamano: 10, negrita: true, espacioAntes: 10 },
    { texto: `Venta mensual: ${formatoVenta(e.calculo.ventaMensual, e.calculo.borradorSinPrecio)}`, tamano: 10, negrita: true },
  );
  if (e.calculo.uf && e.calculo.ventaMensual != null && e.calculo.uf.valorClpEscalado > 0) {
    const clpUf = e.calculo.uf.valorClpEscalado / UF_ESCALA;
    const enUf = e.calculo.ventaMensual / clpUf;
    lineas.push({
      texto: `Equivalente UF ${formatearNumero(enUf, 2)} (UF ${formatearClp(clpUf)})`,
      tamano: 9,
    });
  }
  if (e.calculo.pagosUnicos && e.calculo.pagosUnicos > 0) {
    lineas.push({
      texto: `Pagos únicos: ${formatearClp(e.calculo.pagosUnicos)} CLP`,
      tamano: 9,
      espacioAntes: 2,
    });
  }
  return lineas;
}

function formatoVenta(venta: number | null, borrador?: boolean): string {
  if (venta == null) return borrador ? "Borrador sin precio" : "Pendiente";
  return `${formatearClp(venta)} CLP`;
}

function formatoVentaLinea(venta: number | null | undefined, borrador?: boolean): string {
  if (venta == null || venta === undefined) return borrador ? "Borrador sin precio" : "—";
  return formatearClp(venta);
}

function etiquetaTipo(tipo: string): string {
  if (tipo === "puesto") return "Puesto";
  if (tipo === "item") return "Ítem";
  if (tipo === "adicional") return "Adicional";
  return tipo;
}

function partirParrafos(texto: string): string[] {
  return texto
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .flatMap((p) => (p.length > 110 ? partirLinea(p, 110) : [p]));
}

function partirLinea(texto: string, max: number): string[] {
  const out: string[] = [];
  let rest = texto;
  while (rest.length > max) {
    let corte = rest.lastIndexOf(" ", max);
    if (corte < 20) corte = max;
    out.push(rest.slice(0, corte).trim());
    rest = rest.slice(corte).trim();
  }
  if (rest) out.push(rest);
  return out;
}

/** Compatibilidad tests: el PDF contiene texto escapado legible. */
export function pdfContieneTexto(bytes: Uint8Array, fragmento: string): boolean {
  const raw = new TextDecoder("latin1").decode(bytes);
  return raw.includes(escPdf(fragmento)) || raw.includes(fragmento);
}
