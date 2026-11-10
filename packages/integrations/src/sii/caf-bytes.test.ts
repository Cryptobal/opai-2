// CAR-240 · el CAF se guarda y se lee en sus bytes ISO-8859-1; nunca se decodifica como UTF-8. Datos sintéticos.
import { describe, expect, it } from "vitest";

import { bytesCafParaGuardar, cafXmlDesdeGuardado, diagnosticarCafGuardado } from "./caf-bytes";
import { bytesDeXml } from "./xml-iso";

/** Bytes de un CAF sintético en ISO-8859-1 con una «ñ» (0xF1), como los entrega el SII. */
const ORIGINAL = Buffer.concat([
  Buffer.from("<AUTORIZACION><CAF><DA><RE>76111222-8</RE><RS>COMPA", "latin1"),
  Buffer.from([0xf1]),
  Buffer.from("IA DE PRUEBA</RS></DA></CAF></AUTORIZACION>", "latin1"),
]);
/** Lo que el navegador entrega al servidor: un carácter por byte. */
const textoLatin1 = ORIGINAL.toString("latin1");

describe("bytes del CAF guardado", () => {
  it("un 0xF1 sobrevive ida y vuelta: guardar, leer y volver a bytes da el archivo original", () => {
    const guardado = bytesCafParaGuardar(textoLatin1);
    expect(guardado?.equals(ORIGINAL)).toBe(true); // se guarda en latin1, no los dos bytes UTF-8 de la ñ
    const xml = cafXmlDesdeGuardado(guardado!);
    expect(xml).toBe(textoLatin1);
    expect(bytesDeXml(xml!).equals(ORIGINAL)).toBe(true);
    expect(diagnosticarCafGuardado(guardado!).formato).toBe("latin1");
  });

  it("lee sin perder un byte un CAF guardado antes como UTF-8 del texto latin1", () => {
    const anterior = Buffer.from(textoLatin1, "utf8");
    const d = diagnosticarCafGuardado(anterior);
    expect(d).toMatchObject({ formato: "utf8-anterior", tieneReemplazo: false, idaYVueltaUtf8Latin1: false });
    expect(bytesDeXml(cafXmlDesdeGuardado(anterior)!).equals(ORIGINAL)).toBe(true);
  });

  it("un CAF con U+FFFD (tildes perdidas al cargarlo) queda dañado y no se lee", () => {
    const danado = Buffer.from(textoLatin1.replace("ñ", "�"), "utf8");
    expect(diagnosticarCafGuardado(danado)).toMatchObject({ formato: "danado", tieneReemplazo: true });
    expect(cafXmlDesdeGuardado(danado)).toBeNull();
    // Un carácter fuera de ISO-8859-1 también queda dañado, y no se puede guardar.
    expect(cafXmlDesdeGuardado(Buffer.from("<RS>€</RS>", "utf8"))).toBeNull();
    expect(bytesCafParaGuardar("<RS>�</RS>")).toBeNull();
  });

  it("un CAF ASCII es igual en cualquier formato y hace ida y vuelta UTF-8/latin1", () => {
    const ascii = Buffer.from("<AUTORIZACION><RE>76111222-8</RE></AUTORIZACION>", "latin1");
    expect(diagnosticarCafGuardado(ascii)).toEqual({ formato: "ascii", idaYVueltaUtf8Latin1: true, tieneReemplazo: false });
    expect(cafXmlDesdeGuardado(ascii)).toBe(ascii.toString("latin1"));
  });
});
