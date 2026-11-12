import ExcelJS from "exceljs";

// CAR-27 (parte 2): planilla de negocios para Excel. Dominio puro: sin base de datos ni red.

export type FilaExportNegocio = {
  titulo: string;
  cuenta: string;
  etapa: string;
  estado: string;
  responsable: string | null;
  probabilidad: number;
  montoEstimadoMensual: number | null;
  valorMensual: number | null;
  cierreEstimado: string | null;
  inicioServicioEstimado: string | null;
  cotizacionEnviadaEn: string | null;
  ganadoEn: string | null;
  perdidoEn: string | null;
  motivoPerdida: string | null;
  competidor: string | null;
  etiquetas: string[];
  creadoEn: string;
};

type Columna = {
  clave: keyof FilaExportNegocio;
  titulo: string;
  ancho: number;
  /** Las cifras en pesos van como número con formato; el resto como texto. */
  tipo: "texto" | "entero" | "clp";
};

export const COLUMNAS_NEGOCIOS: readonly Columna[] = [
  { clave: "titulo", titulo: "Negocio", ancho: 38, tipo: "texto" },
  { clave: "cuenta", titulo: "Cuenta", ancho: 30, tipo: "texto" },
  { clave: "etapa", titulo: "Etapa", ancho: 20, tipo: "texto" },
  { clave: "estado", titulo: "Estado", ancho: 12, tipo: "texto" },
  { clave: "responsable", titulo: "Responsable", ancho: 22, tipo: "texto" },
  { clave: "probabilidad", titulo: "Probabilidad (%)", ancho: 16, tipo: "entero" },
  { clave: "montoEstimadoMensual", titulo: "Monto estimado mensual (CLP)", ancho: 28, tipo: "clp" },
  { clave: "valorMensual", titulo: "Valor mensual (CLP)", ancho: 20, tipo: "clp" },
  { clave: "cierreEstimado", titulo: "Cierre estimado", ancho: 16, tipo: "texto" },
  { clave: "inicioServicioEstimado", titulo: "Inicio de servicio estimado", ancho: 26, tipo: "texto" },
  { clave: "cotizacionEnviadaEn", titulo: "Cotización enviada", ancho: 20, tipo: "texto" },
  { clave: "ganadoEn", titulo: "Ganado el", ancho: 14, tipo: "texto" },
  { clave: "perdidoEn", titulo: "Perdido el", ancho: 14, tipo: "texto" },
  { clave: "motivoPerdida", titulo: "Motivo de pérdida", ancho: 30, tipo: "texto" },
  { clave: "competidor", titulo: "Competidor", ancho: 22, tipo: "texto" },
  { clave: "etiquetas", titulo: "Etiquetas", ancho: 24, tipo: "texto" },
  { clave: "creadoEn", titulo: "Creado el", ancho: 14, tipo: "texto" },
];

const DISPARA_FORMULA = /^[=+\-@\t\r]/;

/**
 * Los textos van como cadenas (Excel no las evalúa), pero si alguien copia la hoja a un CSV un texto que parte con
 * = + - @ sí se leería como fórmula: se antepone un apóstrofo como defensa en profundidad.
 */
function aTexto(v: string): string {
  return DISPARA_FORMULA.test(v) ? `'${v}` : v;
}

/** Fecha o instante ISO como aaaa-mm-dd (la hora no aporta en una planilla de gestión). */
function soloDia(iso: string | null): string | null {
  return iso ? iso.slice(0, 10) : null;
}

function valorDe(f: FilaExportNegocio, c: Columna): string | number | null {
  const v = f[c.clave];
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.length ? aTexto(v.join(", ")) : null;
  if (typeof v === "number") return v;
  if (c.clave === "cotizacionEnviadaEn" || c.clave === "ganadoEn" || c.clave === "perdidoEn" || c.clave === "creadoEn")
    return soloDia(v);
  return aTexto(v);
}

/** Arma el .xlsx de negocios: una hoja, encabezado fijo y una fila por negocio. */
export async function construirExcelNegocios(filas: readonly FilaExportNegocio[]): Promise<Uint8Array> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Negocios", { views: [{ state: "frozen", ySplit: 1 }] });
  hoja.columns = COLUMNAS_NEGOCIOS.map((c) => ({ header: c.titulo, key: c.clave, width: c.ancho }));
  hoja.getRow(1).font = { bold: true };
  for (const f of filas) {
    const fila = hoja.addRow(COLUMNAS_NEGOCIOS.map((c) => valorDe(f, c)));
    COLUMNAS_NEGOCIOS.forEach((c, i) => {
      if (c.tipo === "clp") fila.getCell(i + 1).numFmt = "#,##0";
    });
  }
  return new Uint8Array(await libro.xlsx.writeBuffer());
}
