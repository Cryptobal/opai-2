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
    let cuerpoSubido: Uint8Array | null = null;
    vi.spyOn(almacen.almacenamiento, "subir").mockImplementation(async (_k, cuerpo, _m, sha) => {
      cuerpoSubido = typeof cuerpo === "string" ? new TextEncoder().encode(cuerpo) : new Uint8Array(cuerpo);
      almacen.subir(_k, cuerpoSubido.byteLength, "application/pdf", sha);
    });
    const { ctx: base } = contextoDePrueba();
    const ctx = {
      ...base,
      servicios: { ...base.servicios, almacenamiento: almacen.almacenamiento },
    };
    const subido = await subirPdfPropuestaAlmacenamiento(ctx, { codigo: "CPQ-2026-1", pdf });
    expect(subido.checksum).toBe(esperado);
    expect(cuerpoSubido).toEqual(pdf);
  });
});
