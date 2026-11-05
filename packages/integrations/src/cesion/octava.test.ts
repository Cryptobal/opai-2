import { describe, expect, it } from "vitest";

import { adaptadorOctava } from "./octava";
import { almacenMemoria, depsPrueba, fetchGrabado } from "./octava-doble";
import { OctavaApiError } from "./octava-http";
import type { PayloadCesion } from "./tipos";
import cargaOk from "./fixtures/octava-carga-ok.json";
import cargaYaCargado from "./fixtures/octava-carga-ya-cargado.json";
import cargaExpirado from "./fixtures/octava-carga-token-expirado.json";
import cedeOk from "./fixtures/octava-cede-ok.json";
import cedeYa from "./fixtures/octava-cede-ya-cedido.json";
import estadoEok from "./fixtures/octava-estado-eok.json";
import estadoPen from "./fixtures/octava-estado-pendiente.json";
import estadoRsc from "./fixtures/octava-estado-rsc.json";
import tokenOk from "./fixtures/octava-token-ok.json";

const PAYLOAD: PayloadCesion = {
  documentoId: "d1",
  folio: 450,
  rutEmisor: "76111222-8",
  rutDeudor: "76543210-5",
  montoTotal: 1_190_000,
  xmlBase64: Buffer.from("<DTE>ñ</DTE>", "utf8").toString("base64"),
  factorRut: "96.999.000-1",
  tasaBps: 250,
  tipoDte: 33,
  factorNombre: "Factoring SA",
  factorEmail: "ops@factor.test",
  emailDeudor: "pagos@cliente.test",
  fechaVencimiento: "2026-12-15",
};
const vivo = { token: "TOKEN-VIVO", expiraEn: 9_999_999_999 };
const SIN_RED = () => Promise.reject(new Error("no debe llamar a la red"));

describe("adaptador Octava", () => {
  it("no está disponible sin credenciales de acceso", () => {
    const { almacen } = almacenMemoria();
    expect(adaptadorOctava(depsPrueba(SIN_RED, almacen, { acceso: null })).disponible).toBe(false);
  });

  it("envía: carga el XML y cede con los datos del cesionario; no usa Basic ni rutas inventadas", async () => {
    const { almacen } = almacenMemoria({ token: vivo });
    const { fetch, llamadas } = fetchGrabado({ CargaXmlCesion: [cargaOk], CedeDte: [cedeOk] });
    const r = await adaptadorOctava(depsPrueba(fetch, almacen)).enviar(PAYLOAD);
    expect(r).toEqual({ operacionExternaId: "octava:0:76111222-8:33:450", estado: "enviada" });
    expect(llamadas.map((l) => l.endpoint)).toEqual(["CargaXmlCesion", "CedeDte"]);
    expect(llamadas[0]?.cuerpo["STRINGXML"]).toBe("<DTE>ñ</DTE>");
    expect(llamadas[1]?.cuerpo).toMatchObject({
      FOLIO: "450", TIPODTE: "33", RUTEMISOR: "76111222-8", AMBIENTE: "0", RUTCESIONARIO: "96999000-1",
      EMAILDEUDOR: "pagos@cliente.test", EMAILCESIONARIO: "ops@factor.test", MONTOCEDER: "1190000",
      FECHAVENCIMIENTO: "2026-12-15", TOKEN: "TOKEN-VIVO",
    });
  });

  it("sin token guardado pide uno con el RUT y la contraseña de acceso, y lo guarda", async () => {
    const { almacen, estado } = almacenMemoria();
    const { fetch, llamadas } = fetchGrabado({ ObtenerToken: [tokenOk], CargaXmlCesion: [cargaYaCargado], CedeDte: [cedeOk] });
    await adaptadorOctava(depsPrueba(fetch, almacen)).enviar(PAYLOAD);
    expect(llamadas.map((l) => l.endpoint)).toEqual(["ObtenerToken", "CargaXmlCesion", "CedeDte"]);
    expect(llamadas[0]?.cuerpo).toEqual({ RUTACCESOAPI: "76111222-8", PASSWORDACCESOAPI: "clave-acceso" });
    expect(estado.token?.token).toBe("TOKEN-A");
  });

  it("CedeDte con IdResultadoFE=3 (ya cedido) sigue como enviada", async () => {
    const { almacen } = almacenMemoria({ token: vivo });
    const { fetch } = fetchGrabado({ CargaXmlCesion: [cargaOk], CedeDte: [cedeYa] });
    expect((await adaptadorOctava(depsPrueba(fetch, almacen)).enviar(PAYLOAD)).estado).toBe("enviada");
  });

  it("token expirado (TEXP): renueva una vez y reintenta", async () => {
    const { almacen, estado } = almacenMemoria({ token: vivo });
    const { fetch, llamadas } = fetchGrabado({
      CargaXmlCesion: [cargaExpirado, cargaOk], ObtenerToken: [tokenOk], CedeDte: [cedeOk],
    });
    await adaptadorOctava(depsPrueba(fetch, almacen)).enviar(PAYLOAD);
    expect(llamadas.map((l) => l.endpoint)).toEqual(["CargaXmlCesion", "ObtenerToken", "CargaXmlCesion", "CedeDte"]);
    expect(llamadas[2]?.cuerpo["TOKEN"]).toBe("TOKEN-A");
    expect(estado.token?.token).toBe("TOKEN-A");
  });

  it("falla con mensaje claro si falta un dato exigido o la respuesta no es JSON", async () => {
    const { almacen } = almacenMemoria({ token: vivo });
    const a = adaptadorOctava(depsPrueba(SIN_RED, almacen));
    await expect(a.enviar({ ...PAYLOAD, emailDeudor: " " })).rejects.toThrow(/correo del deudor/);
    const { fetch } = fetchGrabado({ CargaXmlCesion: ["<html>502</html>"] });
    await expect(adaptadorOctava(depsPrueba(fetch, almacen)).enviar(PAYLOAD)).rejects.toBeInstanceOf(OctavaApiError);
  });

  it("consulta: EOK → aprobada; vacío/PEN → enviada; RSC → anulada con glosa", async () => {
    const { almacen } = almacenMemoria({ token: vivo });
    const { fetch, llamadas } = fetchGrabado({ ConsultaEstadoAEC: [estadoEok, estadoPen, estadoRsc] });
    const a = adaptadorOctava(depsPrueba(fetch, almacen));
    const id = "octava:0:76111222-8:33:450";
    expect((await a.consultar(id)).estado).toBe("aprobada");
    expect((await a.consultar(id)).estado).toBe("enviada");
    expect(await a.consultar(id)).toEqual({ estado: "anulada", glosa: "RSC: Error en schema" });
    expect(llamadas[0]?.cuerpo).toMatchObject({ FOLIO: "450", TIPODTE: "33", RUTEMISOR: "76111222-8", AMBIENTE: "0" });
    await expect(a.consultar("SIM-CES-1")).rejects.toThrow(/no reconocido/);
  });
});
