import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { parsearCartolaSantander } from "./santander";
import { leerXlsxTolerante } from "./xlsx-tolerante";

// XLSX al estilo de la «Cartola Provisoria» de Santander: relaciones con destino absoluto, la hoja en `sheet.xml`
// y el prefijo `x:`. ExcelJS no lo abre; el lector tolerante sí (CAR-284). Datos ficticios.
async function cartolaEstiloSantander(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
  );
  zip.file("_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="R1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="/xl/workbook.xml"/></Relationships>');
  zip.file("xl/workbook.xml", '<?xml version="1.0"?><x:workbook xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheets><x:sheet name="Cartola" sheetId="1" r:id="R2" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/></x:sheets></x:workbook>');
  zip.file("xl/_rels/workbook.xml.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="R2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet.xml"/></Relationships>');
  zip.file(
    "xl/sharedStrings.xml",
    '<?xml version="1.0"?><x:sst xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:si><x:t>MONTO</x:t></x:si><x:si><x:t>DESCRIPCIÓN MOVIMIENTO</x:t></x:si><x:si><x:t>FECHA</x:t></x:si><x:si><x:t>N° DOCUMENTO</x:t></x:si><x:si><x:r><x:t>Transf a Cliente </x:t></x:r><x:r><x:t>Ficticio &amp; Cía</x:t></x:r></x:si><x:si><x:t>05/11/2026</x:t></x:si></x:sst>',
  );
  zip.file(
    "xl/worksheets/sheet.xml",
    '<?xml version="1.0"?><x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheetData>' +
      '<x:row r="1"><x:c r="A1" t="s"><x:v>0</x:v></x:c><x:c r="B1" t="s"><x:v>1</x:v></x:c><x:c r="C1" t="s"><x:v>2</x:v></x:c><x:c r="D1" t="s"><x:v>3</x:v></x:c></x:row>' +
      '<x:row r="2"><x:c r="A2"><x:v>-15000</x:v></x:c><x:c r="B2" t="s"><x:v>4</x:v></x:c><x:c r="C2" t="s"><x:v>5</x:v></x:c><x:c r="D2" t="inlineStr"><x:is><x:t>12345</x:t></x:is></x:c></x:row>' +
      '<x:row r="3"><x:c r="B3" t="str"><x:v>sin monto</x:v></x:c></x:row>' +
      "</x:sheetData></x:worksheet>",
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("lector XLSX tolerante (cartolas Santander que ExcelJS no abre)", () => {
  it("lee la grilla: textos compartidos, rich text, texto en línea, números y columnas vacías", async () => {
    const filas = await leerXlsxTolerante(await cartolaEstiloSantander());
    expect(filas[0]).toEqual(["MONTO", "DESCRIPCIÓN MOVIMIENTO", "FECHA", "N° DOCUMENTO"]);
    expect(filas[1]).toEqual([-15000, "Transf a Cliente Ficticio & Cía", "05/11/2026", "12345"]);
    expect(filas[2]).toEqual([null, "sin monto"]);
  });

  it("la cartola se importa aunque ExcelJS falle", async () => {
    const r = await parsearCartolaSantander(await cartolaEstiloSantander());
    expect(r.filas).toHaveLength(1);
    expect(r.filas[0]).toMatchObject({ fecha: "2026-11-05", monto: -15000, glosa: "Transf a Cliente Ficticio & Cía", referencia: "12345" });
    expect(r.rechazadas).toHaveLength(1);
  });

  it("un archivo que no es XLSX sigue fallando", async () => {
    await expect(parsearCartolaSantander(Buffer.from("esto no es un xlsx"))).rejects.toThrow();
  });
});
