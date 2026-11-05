import { describe, expect, it } from "vitest";

import { clienteOctava } from "./octava-cliente";
import { almacenMemoria, CEDENTE, fetchGrabado } from "./octava-doble";
import { asegurarToken, TOKEN_TTL_MS, type DepsSesion } from "./octava-sesion";
import tdupNull from "./fixtures/octava-token-tdup-null.json";
import tokenOk from "./fixtures/octava-token-ok.json";

function deps(respuestas: Record<string, unknown[]>, ini = {}) {
  const f = fetchGrabado(respuestas);
  const a = almacenMemoria(ini);
  const d: DepsSesion = {
    cliente: clienteOctava({ fetch: f.fetch }),
    acceso: { usuario: "76.111.222-8", clave: "clave-acceso" },
    cedente: CEDENTE,
    almacen: a.almacen,
    ahora: () => 1_000,
  };
  return { d, ...f, ...a };
}

describe("sesión Octava", () => {
  it("no pide otro token mientras el guardado siga vigente", async () => {
    const { d, llamadas } = deps({}, { token: { token: "T", expiraEn: 1_000 + TOKEN_TTL_MS } });
    expect(await asegurarToken(d)).toBe("T");
    expect(llamadas).toHaveLength(0);
  });

  it("token vencido: pide uno nuevo con el RUT y la contraseña de acceso, sin registrar al cedente", async () => {
    const { d, llamadas, estado } = deps({ ObtenerToken: [tokenOk] }, { token: { token: "VIEJO", expiraEn: 500 } });
    expect(await asegurarToken(d)).toBe("TOKEN-A");
    expect(llamadas.map((l) => l.endpoint)).toEqual(["ObtenerToken"]);
    expect(llamadas[0]?.cuerpo).toEqual({ RUTACCESOAPI: "76111222-8", PASSWORDACCESOAPI: "clave-acceso" });
    expect(estado.token?.expiraEn).toBe(1_000 + TOKEN_TTL_MS);
  });

  it("TDUP con Token 'NULL': reutiliza el guardado, pero no si se fuerza la renovación", async () => {
    const ini = { token: { token: "ACTIVO", expiraEn: 500 } };
    expect(await asegurarToken(deps({ ObtenerToken: [tdupNull] }, ini).d)).toBe("ACTIVO");
    await expect(asegurarToken(deps({ ObtenerToken: [tdupNull] }, ini).d, true)).rejects.toThrow(/TDUP/);
  });
});
