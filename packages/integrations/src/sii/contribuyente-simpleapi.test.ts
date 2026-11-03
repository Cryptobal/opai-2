import { describe, expect, it } from "vitest";

import { contribuyenteNoConfigurado } from "./contribuyente";
import {
  contribuyenteSimpleApi,
  normalizarContribuyente,
  type PedirHttp,
} from "./contribuyente-simpleapi";

const RUT = "76418552-8";
const CRUDO = {
  rut: RUT,
  razonSocial: "CLINICA LOS LEONES S.A.",
  actividadesEconomicas: [
    {
      codigo: "861010",
      descripcion: "HOSPITALES Y CLINICAS",
      categoria: "Primera",
      afectaIVA: true,
      fecha: "14-03-2011",
    },
  ],
  correoIntercambio: "dte@clinica.cl",
  domicilios: [{ direccion: "AV PROVIDENCIA 2330", ciudad: "SANTIAGO", comuna: "PROVIDENCIA" }],
  presentaInicioActividades: true,
  fechaInicioActividades: "14-03-2011",
};

const respuesta =
  (status: number, cuerpo: unknown): PedirHttp =>
  async () =>
    new Response(JSON.stringify(cuerpo), { status });

describe("SII · contribuyente por RUT (SimpleAPI RUT)", () => {
  it("normaliza la respuesta y la fecha", () => {
    const r = normalizarContribuyente(RUT, CRUDO);
    expect(r).toMatchObject({
      estado: "ok",
      datos: {
        razonSocial: "CLINICA LOS LEONES S.A.",
        comuna: "PROVIDENCIA",
        inicioActividades: "2011-03-14",
      },
    });
    expect(
      normalizarContribuyente(RUT, { ...CRUDO, presentaInicioActividades: false }).estado,
    ).toBe("sin_inicio");
  });

  it("pide con Basic api:<key> a rut.simpleapi.cl/v2 y no expone la key", async () => {
    let url = "";
    let auth = "";
    const f: PedirHttp = async (u, init) => {
      url = u;
      auth = init.headers["Authorization"] ?? "";
      return new Response(JSON.stringify(CRUDO), { status: 200 });
    };
    const r = await contribuyenteSimpleApi("clave-de-prueba", { fetch: f }).consultar(RUT);
    expect(r.estado).toBe("ok");
    expect(url).toBe(`https://rut.simpleapi.cl/v2/${RUT}`);
    expect(auth).toBe(`Basic ${Buffer.from("api:clave-de-prueba").toString("base64")}`);
    expect(JSON.stringify(r)).not.toContain("clave-de-prueba");
  });

  it("traduce 400, 401 y 500 a estados de negocio", async () => {
    const con = (s: number) =>
      contribuyenteSimpleApi("k", { fetch: respuesta(s, "x") }).consultar(RUT);
    expect((await con(400)).estado).toBe("no_encontrado");
    expect((await con(401)).estado).toBe("no_configurado");
    expect((await con(500)).estado).toBe("sin_respuesta");
  });

  it("un tiempo de espera agotado es «sin respuesta» y reintentable", async () => {
    const lenta: PedirHttp = (_u, init) =>
      new Promise((_r, rechazar) =>
        init.signal.addEventListener("abort", () =>
          rechazar(Object.assign(new Error("abort"), { name: "AbortError" })),
        ),
      );
    const r = await contribuyenteSimpleApi("k", { fetch: lenta, timeoutMs: 10 }).consultar(RUT);
    expect(r).toMatchObject({ estado: "sin_respuesta" });
  });

  it("sin key, ambos proveedores dicen que no está configurado", async () => {
    expect((await contribuyenteSimpleApi(null).consultar(RUT)).estado).toBe("no_configurado");
    expect((await contribuyenteNoConfigurado().consultar(RUT)).estado).toBe("no_configurado");
  });
});
