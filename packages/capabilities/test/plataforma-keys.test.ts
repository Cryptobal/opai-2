// CAR-40: una key con el scope "platform" vence pronto (≤ 7 días, por defecto 7) y, al autenticar,
// solo conserva el acceso de plataforma si su vencimiento cumple esa regla.
import { beforeEach, describe, expect, it } from "vitest";

import { capacidadesDelNucleo } from "../src/core";
import { plataformaVigente, VIDA_KEY_PLATAFORMA_MS } from "../src/core/apikey-scopes";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba, USUARIO_DE_PRUEBA } from "../src/testing";
import { semillaTenant } from "./semilla";

beforeEach(() => {
  limpiarRegistro();
  registrarCapacidades(capacidadesDelNucleo);
});

const owner = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };
const DIA = 86_400_000;
const crear = (scopes: string[], expiraEn?: string) => {
  const { ctx, tabla } = contextoDePrueba({ usuario: owner, semilla: semillaTenant() });
  return executeCapability(ctx, "core.apikeys.create", {
    nombre: "Plataforma",
    scopes,
    ...(expiraEn ? { expiraEn } : {}),
  }).then((r) => ({ r, keys: tabla("apiKey") }));
};

describe("keys de plataforma con vencimiento corto (CAR-40)", () => {
  it("sin fecha vence en 7 días; más de 7 días se rechaza; sin el scope, no cambia", async () => {
    const { r, keys } = await crear(["*", "platform"]);
    expect(r).toMatchObject({ ok: true });
    const vence = (keys[0]?.["expiraEn"] as Date).getTime() - Date.now();
    expect(vence).toBeGreaterThan(VIDA_KEY_PLATAFORMA_MS - 60_000);
    expect(vence).toBeLessThanOrEqual(VIDA_KEY_PLATAFORMA_MS);
    const larga = new Date(Date.now() + 30 * DIA).toISOString();
    expect((await crear(["*", "platform"], larga)).r).toMatchObject({
      ok: false,
      error: { code: "UNPROCESSABLE" },
    });
    const comun = await crear(["*"]);
    expect(comun.keys[0]?.["expiraEn"]).toBeNull();
  });

  it("al autenticar: solo con vencimiento y a no más de 7 días", () => {
    const ahora = Date.now();
    expect(plataformaVigente(null, ahora)).toBe(false);
    expect(plataformaVigente(new Date(ahora + 30 * DIA), ahora)).toBe(false);
    expect(plataformaVigente(new Date(ahora + 7 * DIA), ahora)).toBe(true);
    expect(plataformaVigente(new Date(ahora + DIA), ahora)).toBe(true);
  });
});
