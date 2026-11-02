import type { BloqueConfig } from "../domain/documento/bloques";
import type { MarcaDocumentoVista } from "./marca-documento";
import type { PlantillaDocumentoVista } from "./plantilla-documento";

export type EntradaPdfCotizacion = {
  codigo: string;
  titulo: string;
  negocio: string;
  secciones: readonly { nombre: string; lineas: readonly { nombre: string }[] }[];
  calculo: { ventaMensual: number | null; fecha: string; pagosUnicos?: number; borradorSinPrecio?: boolean };
  condiciones?: string | null;
};

export function renderPdfCotizacion(
  entrada: EntradaPdfCotizacion,
  marca: MarcaDocumentoVista,
  plantilla: PlantillaDocumentoVista,
): Uint8Array {
  const lineas: string[] = [];
  const bloques = plantilla.bloques.filter((b) => b.activo);
  for (const b of bloques) {
    lineas.push(...bloqueTexto(b, entrada, marca, plantilla.base));
    lineas.push("");
  }
  const fuente = marca.tipografia === "times" ? "Times-Roman" : "Helvetica";
  return pdfSimple(lineas.join("\n").trim(), fuente, marca.colorPrimario);
}

function bloqueTexto(
  bloque: BloqueConfig,
  e: EntradaPdfCotizacion,
  marca: MarcaDocumentoVista,
  base: PlantillaDocumentoVista["base"],
): string[] {
  switch (bloque.id) {
    case "encabezado": {
      const titulo =
        base === "compacta" ? `${e.codigo} · ${e.titulo}` : `Propuesta ${e.codigo}\n${e.titulo}`;
      return [marca.nombreComercial ?? "Empresa", titulo];
    }
    case "datos_empresa":
      return [
        marca.razonSocial ?? marca.nombreComercial ?? "Datos de empresa",
        marca.rut ? `RUT ${marca.rut}` : "",
        marca.direccion ?? "",
      ].filter(Boolean);
    case "resumen_comercial": {
      const venta =
        e.calculo.ventaMensual == null
          ? e.calculo.borradorSinPrecio
            ? "Venta mensual: Borrador sin precio"
            : "Venta mensual: costo pendiente"
          : `Venta mensual: $ ${e.calculo.ventaMensual.toLocaleString("es-CL")} CLP`;
      const unicos =
        e.calculo.pagosUnicos && e.calculo.pagosUnicos > 0
          ? `Pagos únicos: $ ${e.calculo.pagosUnicos.toLocaleString("es-CL")} CLP`
          : null;
      return [`Negocio: ${e.negocio}`, `Válida hasta: ${e.calculo.fecha}`, venta, unicos].filter(
        Boolean,
      ) as string[];
    }
    case "detalle_secciones":
      return e.secciones.flatMap((s) => {
        const ls = s.lineas.map((l) => `  · ${l.nombre}`);
        return [s.nombre, ...(ls.length ? ls : ["  (sin líneas)"])];
      });
    case "condiciones":
      return [e.condiciones ?? marca.condicionesDefault ?? "Condiciones comerciales estándar."];
    case "pie":
      return [marca.piePagina ?? `${marca.nombreComercial ?? "Empresa"} · documento generado en OPAI`];
    default:
      return [];
  }
}

function pdfSimple(texto: string, baseFont: string, _colorPrimario: string | null): Uint8Array {
  const esc = texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const lines = esc.split("\n");
  const ops = ["BT", `/F1 11 Tf`, "50 750 Td"];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ops.push("0 -14 Td");
    ops.push(`(${lines[i]}) Tj`);
    if (i > 50) break;
  }
  ops.push("ET");
  const stream = ops.join("\n");
  const len = stream.length;
  const doc = `%PDF-1.4
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length ${len} >>stream
${stream}
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /${baseFont} >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000${String(350 + len).padStart(3, "0")} 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
${400 + len}
%%EOF`;
  return new TextEncoder().encode(doc);
}
