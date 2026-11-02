import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { contextoDePrueba } from "@opai/capabilities/testing";
import { almacenamientoEnMemoria } from "../../../packages/capabilities/src/testing/almacenamiento-memoria";

import {
  checksumPdfPropuesta,
  subirPdfPropuestaAlmacenamiento,
} from "../persistencia/registrar-pdf-propuesta";

describe("registrar PDF propuesta CPQ (C5)", () => {
  it("checksum y subida usan los mismos bytes binarios (no latin1)", async () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0xff, 0x00, 0x80, 0x7f]);
    const esperado = createHash("sha256").update(pdf).digest("hex");
    expect(checksumPdfPropuesta(pdf)).toBe(esperado);
    const corrupto = createHash("sha256")
      .update(Buffer.from(pdf).toString("latin1"))
      .digest("hex");
    expect(esperado).not.toBe(corrupto);

    const almacen = almacenamientoEnMemoria();
    let cuerpoSubido: string | Uint8Array | Buffer = "";
    vi.spyOn(almacen.almacenamiento, "subir").mockImplementation(async (_k, cuerpo, _m, sha) => {
      cuerpoSubido = cuerpo;
      almacen.subir(_k, Buffer.byteLength(cuerpo), "application/pdf", sha);
    });
    const { ctx: base } = contextoDePrueba();
    const ctx = {
      ...base,
      servicios: { ...base.servicios, almacenamiento: almacen.almacenamiento },
    };
    const subido = await subirPdfPropuestaAlmacenamiento(ctx, { codigo: "CPQ-2026-1", pdf });
    expect(subido.checksum).toBe(esperado);
    expect(Buffer.from(cuerpoSubido as Buffer).equals(Buffer.from(pdf))).toBe(true);
  });
});
