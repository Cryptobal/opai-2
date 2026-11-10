// CAR-240 · Cuerpo multipart igual al de OPAI 1.0: `input` JSON en ISO-8859-1 con su Content-Type, archivos con sus
// bytes originales y todos con el nombre de campo `file`. Sin red.
import { describe, expect, it } from "vitest";

import { leerMultipart, textoInput } from "./multipart-prueba";
import { cuerpoMultipart, sanitizarJsonLatin1 } from "./simpleapi-multipart";

describe("sanitizarJsonLatin1", () => {
  it("la tipografía «linda» pasa a ASCII y el JSON sigue siendo válido", () => {
    const json = JSON.stringify({ g: "Guardia — turno “noche” ‘A’… fin" });
    const limpio = sanitizarJsonLatin1(json);
    expect(JSON.parse(limpio)).toEqual({ g: "Guardia - turno \"noche\" 'A'... fin" });
  });
  it("conserva ñ y tildes de Latin-1; fuera de Latin-1 quita la tilde o deja «?»", () => {
    const json = JSON.stringify({ a: "Ñuñoa áéíóú", b: "Łódź ő", c: "漢 😀" });
    expect(JSON.parse(sanitizarJsonLatin1(json))).toEqual({ a: "Ñuñoa áéíóú", b: "?ódz o", c: "? ?" });
    expect([...sanitizarJsonLatin1(json)].every((ch) => (ch.codePointAt(0) ?? 0) <= 0xff)).toBe(true);
  });
});

describe("cuerpoMultipart", () => {
  it("input con charset ISO-8859-1 y archivos con nombre `file`, tipo y bytes intactos", () => {
    const pfx = Uint8Array.from([0x30, 0x82, 0x00, 0xff, 0x0d, 0x0a]);
    const caf = Buffer.from("<AUTORIZACION>Compañía</AUTORIZACION>", "latin1");
    const { cuerpo, contentType } = cuerpoMultipart([
      { nombre: "input", texto: JSON.stringify({ RazonSocial: "Compañía — Ñuñoa" }) },
      { nombre: "file", bytes: pfx, tipo: "application/x-pkcs12", nombreArchivo: "certificado.pfx" },
      { nombre: "file", bytes: caf, tipo: "application/xml", nombreArchivo: "caf.xml" },
    ]);
    expect(contentType).toMatch(/^multipart\/form-data; boundary=----opai2-simpleapi-/);
    const partes = leerMultipart(cuerpo, contentType);
    expect(partes.map((p) => [p.nombre, p.archivo, p.tipo])).toEqual([
      ["input", null, "application/json; charset=ISO-8859-1"],
      ["file", "certificado.pfx", "application/x-pkcs12"],
      ["file", "caf.xml", "application/xml"],
    ]);
    expect(JSON.parse(textoInput(partes))).toEqual({ RazonSocial: "Compañía - Ñuñoa" });
    expect(partes[0]?.bytes.includes(Buffer.from([0xf1]))).toBe(true); // ñ en un byte, no UTF-8
    expect(partes[1]?.bytes.equals(Buffer.from(pfx))).toBe(true);
    expect(partes[2]?.bytes.equals(caf)).toBe(true);
  });
  it("cada cuerpo usa un boundary distinto", () => {
    const a = cuerpoMultipart([{ nombre: "input", texto: "{}" }]).contentType;
    expect(cuerpoMultipart([{ nombre: "input", texto: "{}" }]).contentType).not.toBe(a);
  });
  it("un parser independiente (FormData de undici) lee las mismas partes y bytes", async () => {
    const pfx = Uint8Array.from([0x00, 0xff, 0x0d, 0x0a, 0x2d, 0x2d, 0x41]);
    const { cuerpo, contentType } = cuerpoMultipart([
      { nombre: "input", texto: JSON.stringify({ a: "Ñ" }) },
      { nombre: "file", bytes: pfx, tipo: "application/x-pkcs12", nombreArchivo: "certificado.pfx" },
    ]);
    const form = await new Response(new Uint8Array(cuerpo), { headers: { "content-type": contentType } }).formData();
    expect([...form.keys()]).toEqual(["input", "file"]);
    const archivo = form.get("file") as File;
    expect([archivo.name, archivo.type]).toEqual(["certificado.pfx", "application/x-pkcs12"]);
    expect(Buffer.from(await archivo.arrayBuffer()).equals(Buffer.from(pfx))).toBe(true);
  });
});
