import { describe, expect, it } from "vitest";

import { almacenMemoria, fetchGrabado } from "./octava-doble";
import { probarAccesoOctava } from "./octava-probar";
import tokenOk from "./fixtures/octava-token-ok.json";

describe("probar acceso a Octava", () => {
  it("pide el token con el RUT y la contraseña de acceso y lo deja guardado, sin llamar a nada más", async () => {
    const { fetch, llamadas } = fetchGrabado({ ObtenerToken: [tokenOk] });
    const { almacen } = almacenMemoria();
    const r = await probarAccesoOctava({
      acceso: { usuario: "76.111.222-8", clave: "clave-acceso" }, almacen, fetch, ahora: () => 1_000,
    });
    expect(llamadas.map((l) => l.endpoint)).toEqual(["ObtenerToken"]);
    expect(llamadas[0]?.cuerpo).toEqual({ RUTACCESOAPI: "76111222-8", PASSWORDACCESOAPI: "clave-acceso" });
    expect(r.venceEn).toBeGreaterThan(1_000);
  });

  it("credenciales rechazadas: lanza con el motivo de Octava, sin incluir la contraseña", async () => {
    const { fetch } = fetchGrabado({ ObtenerToken: [{ status: "exito", DescripcionResultado: "TERR", message: "Datos de Acceso para Generar Token Incorrectos" }] });
    const { almacen } = almacenMemoria();
    const p = probarAccesoOctava({ acceso: { usuario: "76111222-8", clave: "secreta-123" }, almacen, fetch });
    await expect(p).rejects.toThrow(/TERR/);
    await expect(p).rejects.not.toThrow(/secreta-123/);
  });
});
