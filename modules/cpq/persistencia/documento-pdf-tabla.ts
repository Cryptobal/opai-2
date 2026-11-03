/** Tabla de servicios y totales del PDF de cotización. */
import { formatearClp, formatearNumero } from "@opai/domain";
import { UF_ESCALA } from "@opai/domain/dinero";

import type { EntradaPdfCotizacion } from "./documento-pdf-tipos";
import { etiquetaTipo, formatoVenta, formatoVentaLinea } from "./documento-pdf-texto";
import type { LineaPdf } from "./pdf-compositor";

export function tablaServicios(e: EntradaPdfCotizacion): LineaPdf[] {
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
