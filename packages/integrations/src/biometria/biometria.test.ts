import { describe, expect, it } from "vitest";

import {
  BiometriaError,
  BiometriaNoConfigurada,
  biometriaDelEntorno,
  biometriaSimulada,
} from "./index";

describe("biometría simulada", () => {
  it("enrola, verifica 1:1 con prueba de vida y borra", async () => {
    const b = biometriaSimulada();
    const { referencia } = await b.enrolar({ sujetoId: "p1", muestra: "rostro:ana" });
    expect(referencia).toMatch(/^sim:[0-9a-f]{32}$/);
    expect(referencia).not.toContain("ana");
    expect(await b.verificar({ referencia, muestra: "rostro:ana" })).toMatchObject({
      coincide: true,
      vivo: true,
    });
    expect(await b.verificar({ referencia, muestra: "rostro:beto" })).toMatchObject({
      coincide: false,
    });
    await b.borrar(referencia);
    await expect(b.verificar({ referencia, muestra: "rostro:ana" })).rejects.toMatchObject({
      motivo: "referencia_inexistente",
    });
    await expect(b.borrar(referencia)).resolves.toBeUndefined();
  });

  it("rechaza una foto en el enrolamiento y la marca sin vida al verificar", async () => {
    const b = biometriaSimulada();
    await expect(b.enrolar({ sujetoId: "p1", muestra: "rostro:ana:foto" })).rejects.toMatchObject({
      motivo: "sin_prueba_de_vida",
    });
    const { referencia } = await b.enrolar({ sujetoId: "p1", muestra: "rostro:ana" });
    expect(await b.verificar({ referencia, muestra: "rostro:ana:foto" })).toMatchObject({
      coincide: true,
      vivo: false,
    });
  });

  it("una muestra ilegible falla con su motivo", async () => {
    const b = biometriaSimulada();
    for (const muestra of ["", "cualquiera", "rostro:"]) {
      await expect(b.enrolar({ sujetoId: "p1", muestra })).rejects.toBeInstanceOf(BiometriaError);
    }
  });
});

describe("biometría del entorno", () => {
  it("en pruebas y desarrollo usa el simulado, compartido entre llamadas", async () => {
    const a = biometriaDelEntorno({ NODE_ENV: "test" });
    expect(a.nombre).toBe("simulado");
    const { referencia } = await a.enrolar({ sujetoId: "p1", muestra: "rostro:zeta" });
    const otra = biometriaDelEntorno({ NODE_ENV: "development" });
    expect((await otra.verificar({ referencia, muestra: "rostro:zeta" })).coincide).toBe(true);
  });

  it("en producción y preview falla cerrado al usarse", async () => {
    for (const NODE_ENV of ["production", undefined]) {
      const b = biometriaDelEntorno({ NODE_ENV });
      expect(b.disponible).toBe(false);
      await expect(b.enrolar({ sujetoId: "p1", muestra: "rostro:ana" })).rejects.toBeInstanceOf(
        BiometriaNoConfigurada,
      );
    }
  });
});
