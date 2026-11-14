// Fixtures sintéticos de Office Banking (Santander Chile) para pruebas (CAR-327). Imitan la estructura real
// (prefijo `x:`, hoja `sheet.xml`, relaciones absolutas, bloques de saldos y de línea de crédito antes del
// detalle) con datos inventados. Nunca datos bancarios reales.
import JSZip from "jszip";

type Celda = string | number | null;

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const letra = (j: number) => String.fromCharCode(65 + j);

/** XLSX con el empaquetado de Office Banking a partir de una grilla de filas. */
export async function xlsxOfficeBanking(filas: Celda[][]): Promise<Buffer> {
  const zip = new JSZip();
  const ns = 'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
  );
  zip.file("_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="R1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="/xl/workbook.xml"/></Relationships>');
  zip.file("xl/workbook.xml", `<?xml version="1.0"?><x:workbook ${ns}><x:sheets><x:sheet name="Cartola" sheetId="1" r:id="R2" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></x:sheets></x:workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="R2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet.xml"/></Relationships>');
  const compartidos: string[] = [];
  const filasXml = filas
    .map((fila, i) => {
      const celdas = fila
        .map((c, j) => {
          const ref = `${letra(j)}${i + 1}`;
          if (c == null) return "";
          if (typeof c === "number") return `<x:c r="${ref}"><x:v>${c}</x:v></x:c>`;
          compartidos.push(c);
          return `<x:c r="${ref}" t="s"><x:v>${compartidos.length - 1}</x:v></x:c>`;
        })
        .join("");
      return `<x:row r="${i + 1}">${celdas}</x:row>`;
    })
    .join("");
  zip.file("xl/sharedStrings.xml", `<?xml version="1.0"?><x:sst ${ns}>${compartidos.map((t) => `<x:si><x:t>${escapar(t)}</x:t></x:si>`).join("")}</x:sst>`);
  zip.file("xl/worksheets/sheet.xml", `<?xml version="1.0"?><x:worksheet ${ns}><x:sheetData>${filasXml}</x:sheetData></x:worksheet>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

/** Cartola histórica: encabezado en la fila 15, sin SALDO, con CARGO/ABONO. */
export function filasCartolaHistorica(movs: Celda[][]): Celda[][] {
  return [
    ["Cartola Histórica Cuenta Corriente"],
    ["Cliente", "Empresa Ficticia SpA"],
    ["Empresa", "Empresa Ficticia SpA"],
    ["RUT", "11.111.111-1"],
    ["Cuenta", "000000000"],
    ["Moneda", "Pesos"],
    [null],
    ["Número cartola", 99, "Fecha desde", "01/10/2026", "Fecha hasta", "31/10/2026"],
    ["SALDO INICIAL", "DEPÓSITOS", "OTROS ABONOS", "CHEQUES", "OTROS CARGOS", "IMPUESTOS", "SALDO FINAL"],
    [1000000, 0, 250000, 0, 15000, 0, 1235000],
    [null],
    ["Línea de crédito"],
    ["CUPO APROBADO", "MONTO UTILIZADO", "SALDO DISPONIBLE"],
    [500000, 0, 500000],
    ["Detalle movimientos"],
    ["MONTO", "DESCRIPCIÓN MOVIMIENTO", "FECHA", "N° DOCUMENTO", "SUCURSAL", "CARGO/ABONO"],
    ...movs,
  ];
}

/** Consulta de movimientos: encabezado en la fila 11, con SALDO y N° MOVIMIENTO. */
export function filasConsultaMovimientos(movs: Celda[][]): Celda[][] {
  return [
    ["Consulta de Movimientos"],
    ...Array.from({ length: 9 }, () => [null] as Celda[]),
    ["Fecha desde", "01/11/2026", "Fecha hasta", "12/11/2026"],
    ["MONTO", "DESCRIPCIÓN MOVIMIENTO", "FECHA", "SALDO", "N° DOCUMENTO", "SUCURSAL", "CARGO/ABONO", "N° MOVIMIENTO"],
    ...movs,
  ];
}
