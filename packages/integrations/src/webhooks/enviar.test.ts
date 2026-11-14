import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { enviarWebhook, firmaWebhook } from "./enviar";

const interna = (ip: string) => !(ip.startsWith("127.") || ip === "::1");

describe("envío de eventos salientes (CAR-352)", () => {
  it("firma «t.cuerpo» con HMAC-SHA256, como Stripe", () => {
    const esperado = createHmac("sha256", "whsec_x").update('1700000000.{"a":1}').digest("hex");
    expect(firmaWebhook("whsec_x", 1_700_000_000, '{"a":1}')).toBe(`t=1700000000,v1=${esperado}`);
  });

  it("no conecta si el dominio resuelve a la red interna, aunque la dirección pasara la validación", async () => {
    const r = await enviarWebhook({
      url: "https://localhost:9/hook",
      secreto: "whsec_x",
      cuerpo: "{}",
      eventoId: "e1",
      ipPermitida: interna,
    });
    expect(r).toMatchObject({
      ok: false,
      codigo: null,
      error: "La dirección resuelve a una red interna",
    });
  });

  it("rechaza lo que no es https sin conectar", async () => {
    const r = await enviarWebhook({
      url: "http://ejemplo.cl/hook",
      secreto: "whsec_x",
      cuerpo: "{}",
      eventoId: "e1",
      ipPermitida: () => true,
    });
    expect(r).toMatchObject({ ok: false, error: "La dirección no es https" });
  });

  it("revisa también una IP escrita en la dirección, que no pasa por la resolución", async () => {
    const r = await enviarWebhook({
      url: "https://127.0.0.1:9/hook",
      secreto: "whsec_x",
      cuerpo: "{}",
      eventoId: "e1",
      ipPermitida: interna,
    });
    expect(r.error).toBe("La dirección resuelve a una red interna");
  });
});
