import { proyectarResumenEconomico, type AperturaPropuesta, type ServicioDesdeCotizacion } from "../domain/documento/propuesta-tecnica";
import type { MarcaDocumentoVista } from "./marca-documento";
import type { PlantillaPropuestaVista } from "./plantilla-propuesta";
import { parseArmador } from "./propuesta-tecnica";

export function renderPdfPropuestaTecnica(input: {
  codigo: string;
  titulo: string;
  borrador: boolean;
  bloquesJson: string;
  plantilla: PlantillaPropuestaVista;
  marca: MarcaDocumentoVista;
  servicio: ServicioDesdeCotizacion;
  netoTotalClp: number;
  apertura: AperturaPropuesta;
  gastosGeneralesYUtilidadClp?: number | null;
  tasaIvaPct?: number;
}): Uint8Array {
  const bloques = parseArmador(input.bloquesJson).filter((b) => b.activo);
  const resumen = proyectarResumenEconomico({
    apertura: input.apertura,
    secciones: input.servicio.secciones.map((s) => ({
      nombre: s.nombre,
      netoMensualClp: Math.round(input.netoTotalClp / Math.max(1, input.servicio.secciones.length)),
    })),
    netoTotalClp: input.netoTotalClp,
    ...(input.gastosGeneralesYUtilidadClp !== undefined
      ? { gastosGeneralesYUtilidadClp: input.gastosGeneralesYUtilidadClp }
      : {}),
    ...(input.tasaIvaPct !== undefined ? { tasaIvaPct: input.tasaIvaPct } : {}),
  });
  const lineas: string[] = [];
  if (input.borrador) lineas.push("*** BORRADOR ***", "");
  lineas.push(input.marca.nombreComercial ?? "—", `Propuesta técnica ${input.codigo}`, input.titulo, "");
  let pagina = 1;
  for (const b of bloques) {
    lineas.push(`— ${b.tipo.replaceAll("_", " ")} —`);
    switch (b.tipo) {
      case "detalle_servicio":
        lineas.push(`Desde ${input.servicio.codigo} v${input.servicio.versionNumero}`);
        for (const s of input.servicio.secciones) {
          lineas.push(`  ${s.nombre}`);
          for (const p of s.puestos) {
            lineas.push(
              `    · ${p.nombre} ×${p.posiciones} ${p.patron ?? ""} ${p.horaInicio ?? ""}-${p.horaFin ?? ""}`.trim(),
            );
          }
        }
        break;
      case "resumen_economico":
        for (const l of resumen.lineas) {
          lineas.push(`  ${l.instalacion}: $ ${l.netoMensualClp.toLocaleString("es-CL")}`);
        }
        lineas.push(`Neto: $ ${resumen.netoTotalClp.toLocaleString("es-CL")}`);
        lineas.push(`IVA: $ ${resumen.ivaClp.toLocaleString("es-CL")}`);
        if (resumen.gastosGeneralesYUtilidadClp != null) {
          lineas.push(
            `Gastos generales y utilidad: $ ${resumen.gastosGeneralesYUtilidadClp.toLocaleString("es-CL")}`,
          );
        }
        lineas.push(`Total: $ ${resumen.totalClp.toLocaleString("es-CL")}`);
        break;
      case "indice":
        lineas.push("Índice", ...bloques.map((x, i) => `  ${i + 1}. ${x.tipo.replaceAll("_", " ")}`));
        break;
      default:
        if (b.contenidoOverride) lineas.push(b.contenidoOverride);
        else lineas.push(`(bloque ${b.tipo})`);
    }
    lineas.push(`— pág. ${pagina} —`, "");
    pagina += 1;
  }
  lineas.push(input.marca.piePagina ?? "");
  return pdfPropuestaSimple(lineas.join("\n"), input.marca.tipografia === "times" ? "Times-Roman" : "Helvetica");
}

function pdfPropuestaSimple(texto: string, baseFont: string): Uint8Array {
  const esc = texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const lines = esc.split("\n");
  const ops = ["BT", `/F1 10 Tf`, "50 750 Td"];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) ops.push("0 -12 Td");
    ops.push(`(${lines[i]}) Tj`);
    if (i > 80) break;
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
