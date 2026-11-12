import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { firmarEstadoOAuth, verificarEstadoOAuth, VIGENCIA_ESTADO_OAUTH_S } from "./estado-oauth";
import { verificarFirmaSlack } from "./firma";

const SECRETO = "secreto-de-firma-de-prueba";
const firmar = (ts: string, cuerpo: string, s = SECRETO) =>
  `v0=${createHmac("sha256", s).update(`v0:${ts}:${cuerpo}`).digest("hex")}`;

describe("verificarFirmaSlack (ADR-093 §10)", () => {
  const ahora = 1_800_000_000;
  const ts = String(ahora);
  const cuerpo = '{"type":"url_verification"}';

  it("acepta una firma válida y reciente", () => {
    expect(
      verificarFirmaSlack(SECRETO, cuerpo, { timestamp: ts, firma: firmar(ts, cuerpo) }, ahora),
    ).toBe(true);
  });

  it("rechaza cuerpo alterado, otro secreto, marca vieja o futura, y cabeceras faltantes o raras", () => {
    const ok = firmar(ts, cuerpo);
    expect(verificarFirmaSlack(SECRETO, cuerpo + " ", { timestamp: ts, firma: ok }, ahora)).toBe(
      false,
    );
    expect(verificarFirmaSlack("otro", cuerpo, { timestamp: ts, firma: ok }, ahora)).toBe(false);
    expect(verificarFirmaSlack(SECRETO, cuerpo, { timestamp: ts, firma: ok }, ahora + 301)).toBe(
      false,
    );
    expect(verificarFirmaSlack(SECRETO, cuerpo, { timestamp: ts, firma: ok }, ahora - 301)).toBe(
      false,
    );
    expect(verificarFirmaSlack("", cuerpo, { timestamp: ts, firma: ok }, ahora)).toBe(false);
    expect(verificarFirmaSlack(SECRETO, cuerpo, { timestamp: null, firma: ok }, ahora)).toBe(false);
    expect(verificarFirmaSlack(SECRETO, cuerpo, { timestamp: ts, firma: null }, ahora)).toBe(false);
    expect(verificarFirmaSlack(SECRETO, cuerpo, { timestamp: "1e9", firma: ok }, ahora)).toBe(
      false,
    );
    expect(
      verificarFirmaSlack(
        SECRETO,
        cuerpo,
        { timestamp: ts, firma: ok.replace("v0=", "v1=") },
        ahora,
      ),
    ).toBe(false);
  });
});

describe("estado del OAuth de Slack", () => {
  const clave = "clave-servidor";
  const datos = {
    tenantId: "0190f0a0-0000-7000-8000-000000000001",
    userId: "0190f0a0-0000-7000-8000-000000000002",
  };

  it("liga la vuelta a la empresa y al usuario, y vence en 10 minutos", () => {
    const estado = firmarEstadoOAuth(clave, datos, 1000);
    const v = verificarEstadoOAuth(clave, estado, 1000);
    expect(v).toMatchObject({
      t: datos.tenantId,
      u: datos.userId,
      e: 1000 + VIGENCIA_ESTADO_OAUTH_S,
    });
    expect(verificarEstadoOAuth(clave, estado, 1000 + VIGENCIA_ESTADO_OAUTH_S + 1)).toBeNull();
  });

  it("dos enlaces nunca son iguales", () => {
    expect(firmarEstadoOAuth(clave, datos, 1000)).not.toBe(firmarEstadoOAuth(clave, datos, 1000));
  });

  it("rechaza estado manipulado, de otra clave o con basura", () => {
    const estado = firmarEstadoOAuth(clave, datos, 1000);
    const [cuerpo, firma] = estado.split(".") as [string, string];
    const otro = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(cuerpo, "base64url").toString()),
        t: datos.userId,
      }),
    ).toString("base64url");
    expect(verificarEstadoOAuth(clave, `${otro}.${firma}`, 1000)).toBeNull();
    expect(verificarEstadoOAuth("otra", estado, 1000)).toBeNull();
    expect(verificarEstadoOAuth(clave, "abc", 1000)).toBeNull();
    expect(verificarEstadoOAuth(clave, null, 1000)).toBeNull();
    expect(verificarEstadoOAuth("", estado, 1000)).toBeNull();
  });

  it("sin clave no firma", () => {
    expect(() => firmarEstadoOAuth("", datos)).toThrow();
  });
});
