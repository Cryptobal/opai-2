import { describe, expect, it } from "vitest";

import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";
import { createHash } from "node:crypto";

import { guardarXmlFirmadoDte, leerXmlFirmadoDte, xmlBase64ParaCesion, xmlParaEnvioSii } from "../src/finanzas/ventas-xml";
import { adaptadorSiiSimulado } from "@opai/integrations";

describe("ventas XML DTE (C1)", () => {
  it("simulado sigue usando XML de prueba; real exige archivo guardado", async () => {
    const sim = adaptadorSiiSimulado();
    const xmlSim = await xmlParaEnvioSii(
      { servicios: { almacenamiento: almacenamientoEnMemoria().almacenamiento } } as never,
      { folio: 10, xmlStorageKey: null },
      sim,
    );
    expect(xmlSim).toBe('<DTE folio="10"/>');
    const { almacenamiento } = almacenamientoEnMemoria();
    const fake = { nombre: "simpleapi", disponible: true } as never;
    await expect(
      xmlParaEnvioSii(
        { servicios: { almacenamiento } } as never,
        { folio: 10, xmlStorageKey: "dte/x.xml" },
        fake,
      ),
    ).rejects.toMatchObject({ code: "UNPROCESSABLE" });
  });

  // ADR-075: el XML firmado es ISO-8859-1 y se trata como bytes opacos. Con ñ y tildes, un paso por UTF-8
  // cambiaría los bytes (y rompería la firma): el viaje guardar → leer → enviar debe devolver los mismos.
  it("guarda, hashea y lee el XML firmado como bytes ISO-8859-1, sin transcodificar (ñ y tildes)", async () => {
    const original = Buffer.from(
      '<?xml version="1.0" encoding="ISO-8859-1"?><DTE><RznSoc>Ñandú Compañía Ltda. – Peñalolén, camión</RznSoc><TED>áéíóúüñÑ</TED></DTE>',
      "latin1",
    );
    const xmlLatin1 = original.toString("latin1");
    const { almacenamiento, bytes, objetos } = almacenamientoEnMemoria();
    const ctx = { servicios: { almacenamiento } } as never;

    await guardarXmlFirmadoDte(ctx, "doc-1", xmlLatin1);

    const guardado = bytes.get("dte/doc-1.xml");
    expect(guardado?.equals(original)).toBe(true);
    // Un UTF-8 mal aplicado habría dejado más bytes (ñ = 2 bytes) y otro hash.
    expect(guardado?.length).toBe(original.length);
    expect(objetos.get("dte/doc-1.xml")?.sha256).toBe(createHash("sha256").update(original).digest("hex"));

    const leido = await leerXmlFirmadoDte(ctx, "dte/doc-1.xml");
    expect(Buffer.from(leido, "latin1").equals(original)).toBe(true);

    const adaptador = { nombre: "simpleapi", disponible: true } as never;
    const paraEnvio = await xmlParaEnvioSii(ctx, { folio: 1, xmlStorageKey: "dte/doc-1.xml" }, adaptador);
    expect(Buffer.from(paraEnvio, "latin1").equals(original)).toBe(true);
    const base64 = await xmlBase64ParaCesion(ctx, { folio: 1, xmlStorageKey: "dte/doc-1.xml" }, adaptador);
    expect(Buffer.from(base64, "base64").equals(original)).toBe(true);
  });
});
