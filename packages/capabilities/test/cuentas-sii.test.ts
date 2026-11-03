import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { contribuyenteNoConfigurado, contribuyenteSimulado } from "@opai/integrations";

import { executeCapability, fijarFuenteContribuyente } from "../src";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

const CU = "0192f3a0-0000-7000-8000-00000000aa01";
const SIN_RUT = "0192f3a0-0000-7000-8000-00000000aa02";
const RUT = "76418552-8";

const sii = contribuyenteSimulado({
  [RUT]: {
    estado: "ok",
    datos: {
      rut: RUT,
      razonSocial: "CLINICA LOS LEONES S.A.",
      actividades: [{ codigo: "861010", descripcion: "Hospitales y clínicas", afectaIva: true }],
      direccion: "Av. Providencia 2330",
      comuna: "Providencia",
      ciudad: "Santiago",
      correoIntercambio: "dte@clinica.cl",
      inicioActividades: "2011-03-14",
    },
  },
});

function ctx(permisos?: string[]) {
  return contextoDePrueba({
    ...(permisos ? { permisos } : {}),
    semilla: {
      tenant: [
        { id: TENANT_DE_PRUEBA, slug: "t", nombre: "T", vertical: "seguridad", estado: "activo" },
      ],
      cuenta: [
        {
          id: CU,
          tenantId: TENANT_DE_PRUEBA,
          nombre: "Clínica",
          razonSocial: "Clínica Los Leones S.A.",
          rut: RUT,
          giro: "Servicios de salud",
          estado: "prospecto",
        },
        { id: SIN_RUT, tenantId: TENANT_DE_PRUEBA, nombre: "Sin RUT", estado: "prospecto" },
      ],
    },
  });
}

beforeEach(() => {
  reiniciar();
  fijarFuenteContribuyente(sii);
});
afterEach(() => fijarFuenteContribuyente(null));

describe("core.cuentas · datos del SII", () => {
  it("consulta compara campo por campo y dice qué falta para facturar", async () => {
    const r = await dato<{
      estado: string;
      campos: { campo: string; estado: string }[];
      facturar: { lista: boolean; faltan: string[] };
      facturarAlAplicar: { lista: boolean };
    }>(ctx().ctx, "core.cuentas.consultar_sii", { id: CU });
    expect(r.estado).toBe("ok");
    const por = Object.fromEntries(r.campos.map((c) => [c.campo, c.estado]));
    expect(por).toMatchObject({ razonSocial: "igual", giro: "distinto", calle: "vacio_ficha" });
    expect(r.facturar).toEqual({ lista: false, faltan: ["calle", "comuna", "destinatario"] });
    expect(r.facturarAlAplicar.lista).toBe(true);
  });

  it("aplicar con vista previa no escribe; real aplica solo lo elegido y emite evento", async () => {
    const c = ctx();
    const previa = await dato<{ cambios: { campo: string }[] }>(
      c.ctx,
      "core.cuentas.aplicar_sii",
      { id: CU, campos: ["calle", "comuna"] },
      { dryRun: true },
    );
    expect(previa.cambios.map((x) => x.campo)).toEqual(["calle", "comuna"]);
    const cuenta = () => c.tabla("cuenta")?.find((x) => x["id"] === CU);
    expect(cuenta()?.["calle"]).toBeUndefined();
    await dato(c.ctx, "core.cuentas.aplicar_sii", {
      id: CU,
      campos: ["calle", "comuna", "razonSocial"],
    });
    expect(cuenta()).toMatchObject({ calle: "Av. Providencia 2330", comuna: "Providencia" });
    // «Igual» no se reescribe: la razón social conserva cómo la escribió la persona.
    expect(cuenta()?.["razonSocial"]).toBe("Clínica Los Leones S.A.");
    expect(cuenta()?.["giro"]).toBe("Servicios de salud");
    expect(c.tabla("evento")?.some((e) => e["tipo"] === "core.cuenta.actualizada")).toBe(true);
  });

  it("sin RUT válido es regla de negocio; sin permiso de gestión no aplica", async () => {
    expect(await codigo(ctx().ctx, "core.cuentas.consultar_sii", { id: SIN_RUT })).toBe(
      "UNPROCESSABLE",
    );
    const lector = ctx(["core:cuentas.read"]).ctx;
    expect(await codigo(lector, "core.cuentas.consultar_sii", { id: CU })).toBe("OK");
    expect(await codigo(lector, "core.cuentas.aplicar_sii", { id: CU, campos: ["calle"] })).toBe(
      "FORBIDDEN",
    );
  });

  it("sin credencial, el proveedor «no configurado» lo dice y aplicar no escribe", async () => {
    fijarFuenteContribuyente(contribuyenteNoConfigurado());
    const c = ctx();
    const r = await dato<{ estado: string; mensaje: string; campos: unknown[] }>(
      c.ctx,
      "core.cuentas.consultar_sii",
      { id: CU },
    );
    expect(r.estado).toBe("no_configurado");
    expect(r.mensaje).toMatch(/SimpleAPI RUT/);
    expect(r.campos).toEqual([]);
    const a = await executeCapability(c.ctx, "core.cuentas.aplicar_sii", {
      id: CU,
      campos: ["calle"],
    });
    expect(a).toMatchObject({ ok: false, error: { code: "UNPROCESSABLE" } });
  });
});
