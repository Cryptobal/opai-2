/** Bloques del PDF de cotización (A4): cada uno dibuja sobre la hoja y mueve el cursor. */
import { formatearClp, formatearNumero } from "@opai/domain";
import { IVA_PCT, UF_ESCALA } from "@opai/domain/dinero";

import { etiquetaIva, totalesDocumento } from "../domain/documento/totales";
import type { EntradaPdfCotizacion } from "./documento-pdf-tipos";
import type { MarcaDocumentoVista } from "./marca-documento";
import { TENUE } from "./pdf/colores";
import { type Hoja, MARGEN } from "./pdf/hoja";
import { cajaTotales, tabla } from "./pdf/hoja-tabla";
import { etiquetaSeccion } from "./pdf/membrete";

const TIPOS: Record<string, string> = { puesto: "Puesto", item: "Ítem", adicional: "Adicional" };

export function datosProveedor(h: Hoja, marca: MarcaDocumentoVista): void {
  etiquetaSeccion(h, "Proveedor");
  h.parrafo(marca.razonSocial ?? marca.nombreComercial ?? "", { fuente: "semi", tam: 10 });
  if (marca.rut) h.parrafo(`RUT ${marca.rut}`, { color: TENUE, tam: 9 });
  if (marca.direccion) h.parrafo(marca.direccion, { color: TENUE, tam: 9 });
}

export function datosCliente(h: Hoja, e: EntradaPdfCotizacion): void {
  const cli = e.cliente;
  if (cli) {
    etiquetaSeccion(h, "Cliente");
    h.parrafo(cli.razonSocial ?? cli.nombre, { fuente: "semi", tam: 10 });
    if (cli.rut) h.parrafo(`RUT ${cli.rut}`, { color: TENUE, tam: 9 });
    if (cli.giro) h.parrafo(`Giro: ${cli.giro}`, { color: TENUE, tam: 9 });
    if (cli.direccion) h.parrafo(cli.direccion, { color: TENUE, tam: 9 });
  }
  etiquetaSeccion(h, "Vigencia");
  if (e.validaHasta) h.parrafo(`Válida hasta el ${e.validaHasta}`, { tam: 9 });
  h.parrafo(`Valores calculados al ${e.calculo.fecha || "—"}`, { color: TENUE, tam: 9 });
}

export function detalleYTotales(h: Hoja, e: EntradaPdfCotizacion): void {
  const sinPrecio = e.calculo.borradorSinPrecio === true;
  const venta = (v: number | null | undefined) => (v == null ? "—" : formatearClp(v));
  etiquetaSeccion(h, "Detalle de servicios");
  for (const s of e.secciones.filter((x) => x.lineas.length)) {
    h.asegurar(70);
    h.espacio(6);
    h.parrafo(s.nombre, { fuente: "semi", tam: 10 });
    h.espacio(2);
    const filas = s.lineas.map((l) => ({
      celdas: [
        l.nombre,
        TIPOS[l.tipo] ?? l.tipo,
        l.posiciones != null && l.posiciones > 0 ? `×${l.posiciones}` : "",
        venta(l.ventaMensualClp),
      ],
    }));
    const valores = s.lineas.map((l) => l.ventaMensualClp);
    if (s.lineas.length > 1 && valores.every((v): v is number => v != null)) {
      filas.push({
        celdas: ["Subtotal sección", "", "", formatearClp(valores.reduce((a, v) => a + v, 0))],
      });
    }
    tabla(
      h,
      [
        { titulo: "Ítem", peso: 5 },
        { titulo: "Tipo", peso: 1.6 },
        { titulo: "Dotación", peso: 1.4, alinear: "der", mono: true },
        { titulo: "Neto mensual", peso: 2.4, alinear: "der", mono: true },
      ],
      filas,
    );
  }
  if (e.calculo.ventaMensual == null) {
    h.espacio(10);
    h.parrafo(
      sinPrecio
        ? "Borrador sin precio: aún no hay valores para totalizar."
        : "Valor pendiente de cálculo.",
      {
        fuente: "semi",
      },
    );
    return;
  }
  const t = totalesDocumento(e.calculo.ventaMensual, e.calculo.tasaIvaPct ?? IVA_PCT);
  cajaTotales(h, [
    { etiqueta: "Neto mensual", valor: formatearClp(t.netoClp) },
    { etiqueta: etiquetaIva(t.tasaIvaPct), valor: formatearClp(t.ivaClp) },
    { etiqueta: "Total mensual", valor: formatearClp(t.totalClp), fuerte: true },
  ]);
  if (e.calculo.uf && e.calculo.uf.valorClpEscalado > 0) {
    const clpUf = e.calculo.uf.valorClpEscalado / UF_ESCALA;
    h.espacio(6);
    h.parrafo(
      `Neto mensual equivalente: UF ${formatearNumero(t.netoClp / clpUf, 2)} (UF al ${e.calculo.uf.fecha}: ${formatearClp(clpUf)})`,
      {
        tam: 8.5,
        color: TENUE,
      },
    );
  }
  if (e.calculo.pagosUnicos && e.calculo.pagosUnicos > 0) {
    h.parrafo(`Pagos únicos (neto): ${formatearClp(e.calculo.pagosUnicos)}`, {
      tam: 8.5,
      color: TENUE,
    });
  }
}

export function condiciones(h: Hoja, texto: string): void {
  etiquetaSeccion(h, "Condiciones comerciales");
  for (const p of texto
    .split(/\n+/)
    .map((x) => x.trim())
    .filter(Boolean)) {
    h.parrafo(p, { tam: 9 });
    h.espacio(2);
  }
}

export function firma(h: Hoja, nombre: string): void {
  h.asegurar(80);
  h.espacio(36);
  h.regla(TENUE, 0.6, MARGEN.x, MARGEN.x + 190);
  h.parrafo(nombre, { tam: 9, fuente: "semi" });
}
