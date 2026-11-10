import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  contribuyenteNoConfigurado,
  contribuyenteSimulado,
  type ResultadoContribuyente,
} from "@opai/integrations";

import { fijarFuenteContribuyente } from "../src";
import { trabajoConsultarContribuyenteSii } from "../src/core/maestros/cuentas-sii-trabajo";
import { contextoDePrueba, TENANT_DE_PRUEBA } from "../src/testing";
import { dato, reiniciar } from "./maestros-ayuda";

// Empresa y RUT ficticios (CAR-156); ningún dato real.
const CU = "0192f3a0-0000-7000-8000-00000000ab01";
const RUT = "76418552-8";
const OTRO = "77777777-7";
const OK: ResultadoContribuyente = {
  estado: "ok",
  datos: {
    rut: RUT,
    razonSocial: "SERVICIOS FICTICIOS SPA",
    actividades: [{ codigo: "801000", descripcion: "Actividades de seguridad", afectaIva: true }],
    direccion: "Calle Inventada 123",
    comuna: "Ñuñoa",
    ciudad: "Santiago",
    correoIntercambio: "dte@ficticia.cl",
    inicioActividades: "2015-01-02",
  },
};

let sii = contribuyenteSimulado({ [RUT]: OK });

function ctx() {
  return contextoDePrueba({
    semilla: {
      tenant: [
        { id: TENANT_DE_PRUEBA, slug: "t", nombre: "T", vertical: "seguridad", estado: "activo" },
      ],
      cuenta: [{ id: CU, tenantId: TENANT_DE_PRUEBA, nombre: "Ficticia", rut: RUT, estado: "prospecto" }],
    },
  });
}

beforeEach(() => {
  reiniciar();
  sii = contribuyenteSimulado({ [RUT]: OK });
  fijarFuenteContribuyente(sii);
});
afterEach(() => fijarFuenteContribuyente(null));

type Consulta = { estado: string; origen: string | null; consultadoEn: string | null };

describe("consulta al SII con caché por (empresa, RUT)", () => {
  it("la segunda consulta y aplicar reutilizan la caché: una sola llamada al proveedor", async () => {
    const c = ctx();
    const a = await dato<Consulta>(c.ctx, "core.cuentas.consultar_sii", { id: CU });
    const b = await dato<Consulta>(c.ctx, "core.cuentas.consultar_sii", { id: CU });
    expect([a.origen, b.origen]).toEqual(["sii", "cache"]);
    expect(b.consultadoEn).toBe(a.consultadoEn);
    // «Refrescar» antes de 10 minutos no vuelve a salir al proveedor.
    await dato(c.ctx, "core.cuentas.consultar_sii", { id: CU, refrescar: true });
    await dato(c.ctx, "core.cuentas.aplicar_sii", { id: CU, campos: ["calle"] }, { dryRun: true });
    await dato(c.ctx, "core.cuentas.aplicar_sii", { id: CU, campos: ["calle"] });
    expect(sii.llamadas).toEqual([RUT]);
    expect(c.tabla("cuenta")?.find((x) => x["id"] === CU)?.["calle"]).toBe("Calle Inventada 123");
    const filas = c.tabla("siiContribuyente") ?? [];
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ tenantId: TENANT_DE_PRUEBA, rut: RUT, estado: "ok" });
  });

  it("no guarda «no configurado» ni «sin respuesta»: la próxima vez se vuelve a intentar", async () => {
    fijarFuenteContribuyente(contribuyenteNoConfigurado());
    const c = ctx();
    const r = await dato<Consulta>(c.ctx, "core.cuentas.consultar_sii", { id: CU });
    expect(r).toMatchObject({ estado: "no_configurado", origen: null, consultadoEn: null });
    const caido = contribuyenteSimulado({
      [RUT]: { estado: "sin_respuesta", mensaje: "El SII no responde." },
    });
    fijarFuenteContribuyente(caido);
    await dato(c.ctx, "core.cuentas.consultar_sii", { id: CU });
    await dato(c.ctx, "core.cuentas.consultar_sii", { id: CU });
    expect(caido.llamadas).toHaveLength(2);
    expect(c.tabla("siiContribuyente") ?? []).toHaveLength(0);
  });
});

describe("consulta al crear la cuenta", () => {
  type Creada = { id: string; sii: string };

  it("con RUT encola la consulta (no llama al SII ni aplica nada); la vista previa no encola", async () => {
    const c = ctx();
    const previa = await dato<Creada>(
      c.ctx,
      "core.cuentas.create",
      { nombre: "Nueva", rut: OTRO },
      { dryRun: true },
    );
    expect(previa.sii).toBe("en_cola");
    expect(c.tabla("trabajo") ?? []).toHaveLength(0);
    const r = await dato<Creada>(c.ctx, "core.cuentas.create", { nombre: "Nueva", rut: OTRO });
    expect(r.sii).toBe("en_cola");
    expect(sii.llamadas).toEqual([]);
    const trabajos = c.tabla("trabajo") ?? [];
    expect(trabajos).toHaveLength(1);
    expect(trabajos[0]).toMatchObject({ tipo: "core.sii.consultar_contribuyente", payload: { rut: OTRO } });
    const cuenta = c.tabla("cuenta")?.find((x) => x["id"] === r.id);
    expect(cuenta?.["razonSocial"] ?? null).toBeNull();
  });

  it("sin RUT o sin integración no encola; con caché vigente lo ofrece de inmediato", async () => {
    const c = ctx();
    expect((await dato<Creada>(c.ctx, "core.cuentas.create", { nombre: "Sin RUT" })).sii).toBe(
      "sin_rut",
    );
    fijarFuenteContribuyente(contribuyenteNoConfigurado());
    const sinKey = await dato<Creada>(c.ctx, "core.cuentas.create", { nombre: "Otra", rut: OTRO });
    expect(sinKey.sii).toBe("no_configurado");
    expect(c.tabla("trabajo") ?? []).toHaveLength(0);
    // Con la respuesta del SII ya guardada (p. ej. por el importador), se ofrece sin encolar.
    fijarFuenteContribuyente(sii);
    await trabajoConsultarContribuyenteSii.ejecutar(c.ctx, { rut: "11111111-1" });
    const conCache = await dato<Creada>(c.ctx, "core.cuentas.create", {
      nombre: "Tercera",
      rut: "11111111-1",
    });
    expect(conCache.sii).toBe("en_cache");
    expect(c.tabla("trabajo") ?? []).toHaveLength(0);
  });
});

describe("trabajo core.sii.consultar_contribuyente", () => {
  it("llena la caché, no repite si está vigente y reintenta si el SII no responde", async () => {
    const c = ctx();
    expect(await trabajoConsultarContribuyenteSii.ejecutar(c.ctx, { rut: RUT })).toEqual({
      estado: "ok",
    });
    expect(await trabajoConsultarContribuyenteSii.ejecutar(c.ctx, { rut: RUT })).toEqual({
      omitido: "en_cache",
    });
    expect(sii.llamadas).toEqual([RUT]);
    // La pantalla ya no sale al proveedor: usa lo que dejó el trabajo.
    const r = await dato<Consulta>(c.ctx, "core.cuentas.consultar_sii", { id: CU });
    expect(r.origen).toBe("cache");
    fijarFuenteContribuyente(
      contribuyenteSimulado({ [OTRO]: { estado: "sin_respuesta", mensaje: "caído" } }),
    );
    await expect(trabajoConsultarContribuyenteSii.ejecutar(c.ctx, { rut: OTRO })).rejects.toThrow(
      /no respondió/,
    );
  });
});
