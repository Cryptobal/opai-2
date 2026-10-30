import { describe, expect, it } from "vitest";

import {
  selloDelEntorno,
  SelloNoConfigurado,
  selloNoConfigurado,
  verificacionDelEntorno,
  VerificacionNoConfigurada,
  verificacionNoConfigurada,
} from "./index";

const evidencia = {
  solicitudId: "sol-1",
  sha256Documento: "h1abc",
  nivel: "N1",
  firmantes: [
    { nombre: "Ana Rojas", run: "•••43-0", nivel: "N1", metodo: "trazo", firmadoEn: "2026-10-30T12:00:00.000Z" },
  ],
  comprobanteUrl: "https://test.opai.cl/verificar/gard.xyz",
};

describe("sello de firma (R6, P7)", () => {
  it("el falso arma bytes deterministas, sin sello de tiempo ni proveedor real", async () => {
    const sello = selloDelEntorno();
    const a = await sello.sellar(evidencia);
    const b = await sello.sellar(evidencia);
    expect(a.bytes).toBe(b.bytes);
    expect(a.prestador).toBe("falso");
    expect(a.selloDeTiempo).toBeNull();
    expect(a.bytes).toContain("h1abc");
    expect(a.bytes).toContain("Ana Rojas");
  });

  it("el no-configurado falla cerrado al sellar (prestador P7 sin contratar)", async () => {
    const sello = selloNoConfigurado();
    expect(sello.disponible).toBe(false);
    await expect(sello.sellar(evidencia)).rejects.toBeInstanceOf(SelloNoConfigurado);
  });
});

describe("verificación de identidad N2 (R13, diferida)", () => {
  it("el falso verifica según el tipo y nunca devuelve imagen", async () => {
    const v = verificacionDelEntorno();
    const trabajador = await v.verificar({ firmanteId: "f1", tipo: "trabajador", run: null });
    const externo = await v.verificar({ firmanteId: "f2", tipo: "externo", run: "1-9" });
    expect(trabajador).toMatchObject({ verificado: true, metodo: "prueba_vida", prestador: "falso" });
    expect(externo).toMatchObject({ verificado: true, metodo: "externa" });
    expect(Object.keys(externo)).not.toContain("imagen");
  });

  it("el no-configurado falla cerrado al verificar", async () => {
    const v = verificacionNoConfigurada();
    expect(v.disponible).toBe(false);
    await expect(v.verificar({ firmanteId: "f1", tipo: "externo", run: null })).rejects.toBeInstanceOf(
      VerificacionNoConfigurada,
    );
  });
});
