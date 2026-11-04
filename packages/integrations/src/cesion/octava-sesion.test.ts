import { describe, expect, it } from "vitest";

import { clienteOctava } from "./octava-cliente";
import { almacenMemoria, CEDENTE, fetchGrabado } from "./octava-doble";
import { asegurarPassAcceso, asegurarToken, TOKEN_TTL_MS, type DepsSesion } from "./octava-sesion";
import registraOk from "./fixtures/octava-registra-ok.json";
import registraYa from "./fixtures/octava-registra-ya-existe.json";
import tdupNull from "./fixtures/octava-token-tdup-null.json";
import tokenOk from "./fixtures/octava-token-ok.json";

function deps(respuestas: Record<string, unknown[]>, ini = {}, cedente = CEDENTE) {
  const f = fetchGrabado(respuestas);
  const a = almacenMemoria(ini);
  const d: DepsSesion = {
    cliente: clienteOctava({ fetch: f.fetch }),
    integrador: { usuario: "77888999-0", clave: "x" },
    cedente,
    almacen: a.almacen,
    ahora: () => 1_000,
  };
  return { d, ...f, ...a };
}

describe("sesión Octava", () => {
  it("RegistraCedente ok guarda la PassAccesoApi", async () => {
    const { d, estado } = deps({ RegistraCedente: [registraOk] });
    expect(await asegurarPassAcceso(d)).toBe("PASS-ACCESO-1");
    expect(estado.pass).toBe("PASS-ACCESO-1");
  });

  it("IdResultadoFE=3 con PassAccesoApi 'NULL' explica qué falta y no inventa clave", async () => {
    const { d, estado } = deps({ RegistraCedente: [registraYa] });
    await expect(asegurarPassAcceso(d)).rejects.toThrow(/ya está registrado.*PassAccesoApi/s);
    expect(estado.pass).toBeNull();
  });

  it("sin certificado del cedente falla antes de llamar a Octava", async () => {
    const { d, llamadas } = deps({}, {}, { ...CEDENTE, certificado: null });
    await expect(asegurarPassAcceso(d)).rejects.toThrow(/certificado digital/);
    expect(llamadas).toHaveLength(0);
  });

  it("no pide otro token mientras el guardado siga vigente", async () => {
    const { d, llamadas } = deps({}, { pass: "P", token: { token: "T", expiraEn: 1_000 + TOKEN_TTL_MS } });
    expect(await asegurarToken(d)).toBe("T");
    expect(llamadas).toHaveLength(0);
  });

  it("token vencido: pide uno nuevo con el RUT del cedente y la PassAccesoApi", async () => {
    const { d, llamadas, estado } = deps({ ObtenerToken: [tokenOk] }, { pass: "P", token: { token: "VIEJO", expiraEn: 500 } });
    expect(await asegurarToken(d)).toBe("TOKEN-A");
    expect(llamadas[0]?.cuerpo).toEqual({ RUTACCESOAPI: "76111222-8", PASSWORDACCESOAPI: "P" });
    expect(estado.token?.expiraEn).toBe(1_000 + TOKEN_TTL_MS);
  });

  it("TDUP con Token 'NULL': reutiliza el guardado, pero no si se fuerza la renovación", async () => {
    const ini = { pass: "P", token: { token: "ACTIVO", expiraEn: 500 } };
    expect(await asegurarToken(deps({ ObtenerToken: [tdupNull] }, ini).d)).toBe("ACTIVO");
    await expect(asegurarToken(deps({ ObtenerToken: [tdupNull] }, ini).d, true)).rejects.toThrow(/TDUP/);
  });
});
