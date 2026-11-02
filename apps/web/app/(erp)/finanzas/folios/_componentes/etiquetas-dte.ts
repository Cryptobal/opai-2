import { cafVencido } from "@opai/domain";

/** Nombre corto del tipo de DTE de venta para la UI. */
export function nombreTipoDte(tipo: number): string {
  switch (tipo) {
    case 33:
      return "Factura 33";
    case 34:
      return "Factura exenta 34";
    case 56:
      return "Nota de débito 56";
    case 61:
      return "Nota de crédito 61";
    default:
      return `DTE ${tipo}`;
  }
}

export function foliosUsados(f: { folioDesde: number; folioActual: number }): number {
  return Math.max(0, f.folioActual - f.folioDesde);
}

export function estadoFolio(f: FolioEstadoInput, hoyIso: string): { etiqueta: string; tono: "success" | "warning" | "danger" | "neutro" } {
  if (!f.activo) return { etiqueta: "Inactivo", tono: "neutro" };
  if (f.cafVenceEn && cafVencido(f.cafVenceEn, hoyIso)) return { etiqueta: "CAF vencido", tono: "danger" };
  if (f.restantes <= 0) return { etiqueta: "Agotado", tono: "warning" };
  if (f.alerta) return { etiqueta: "Revisar", tono: "warning" };
  return { etiqueta: "Vigente", tono: "success" };
}

type FolioEstadoInput = {
  activo: boolean;
  cafVenceEn: string | null;
  restantes: number;
  alerta: boolean;
};
