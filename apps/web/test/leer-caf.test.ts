// CAR-240 · El CAF se lee byte a byte: un CAF ISO-8859-1 con eñe o tilde vuelve a los mismos bytes al emitir
// (`bytesDeXml`, latin1), así que su firma sigue valiendo. Antes se leía como UTF-8 y esos bytes quedaban en U+FFFD.
import { describe, expect, it } from "vitest";

import { leerCafXml } from "../app/(erp)/finanzas/folios/_componentes/leer-caf";

describe("lectura del archivo CAF", () => {
  it("conserva cada byte, incluidos los de ISO-8859-1 y 0x80–0x9F", async () => {
    const original = Buffer.concat([
      Buffer.from("<AUTORIZACION><CAF><DA><RS>", "latin1"),
      Buffer.from([0xd1, 0xf3, 0x80, 0x9f]), // Ñ, ó y dos bytes que windows-1252 alteraría
      Buffer.from("</RS></DA></CAF></AUTORIZACION>", "latin1"),
    ]);
    const texto = await leerCafXml(new Blob([original]));
    expect(texto).not.toContain("�");
    expect(Buffer.from(texto, "latin1").equals(original)).toBe(true);
  });
  it("un archivo grande no desborda la pila", async () => {
    const grande = Buffer.alloc(200_000, 0x41);
    expect((await leerCafXml(new Blob([grande]))).length).toBe(200_000);
  });
});
