import { describe, expect, it } from "vitest";

import { prepararCesion } from "../src/finanzas/ventas-cesion-prep";
import type { Contexto } from "../src/types";

const baseDoc = {
  id: "doc-1",
  tipoDte: 33,
  estadoDte: "aceptado",
  cesionEstado: "no_cedido",
  xmlStorageKey: "dte/x.xml",
  estadoCobro: "pendiente",
  montoTotal: 1_000_000,
  montoCobrado: 0,
  cuentaId: "cta-1",
  folio: 10,
};

function ctxFalso(doc: typeof baseDoc | null, previas: { montoTotal: number; codigoReferencia: number | null }[] = []): Contexto {
  return {
    tenantId: "t-ficticio",
    db: {
      documentoEmitido: {
        findFirst: async () => doc,
        findMany: async () => previas,
      },
    },
  } as unknown as Contexto;
}

describe("prepararCesion (CAR-439)", () => {
  it("devuelve el documento y el cálculo cuando la factura se puede ceder", async () => {
    const { doc, calc } = await prepararCesion(ctxFalso(baseDoc), "doc-1", 250);
    expect(doc.id).toBe("doc-1");
    expect(calc).toMatchObject({ anticipo: 975_000, merma: 25_000, saldoFactor: 25_000, netoAlCeder: 975_000 });
  });

  it("falla si el documento no existe", async () => {
    await expect(prepararCesion(ctxFalso(null), "doc-x", 250)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("falla si la factura no cumple las reglas de cesión", async () => {
    await expect(
      prepararCesion(ctxFalso({ ...baseDoc, estadoDte: "enviado" }), "doc-1", 250),
    ).rejects.toMatchObject({ code: "UNPROCESSABLE" });
  });
});
