// CAR-78 · E3: marca de ronda por QR y GPS que captura un equipo de terreno, contra Postgres real con dos
// empresas. QR de otra instalación o empresa rechazado, idempotencia, geocerca, etiqueta reemplazada, solo
// inserción y sin inferir presencia laboral.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Resultado = { clave: string; estado: string; motivo: string | null };
const LAT = -33.45;
const LNG = -70.66;

describe.skipIf(!urlPropietario)("marcas de ronda en base real (CAR-78 E3)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const inst = { A: "", A2: "", B: "" };
  const disp = { A: "", B: "" };
  const cod = { propio: "", ajeno: "", otraEmpresa: "", reemplazado: "", estricto: "" };
  let puntoPropio = "";
  let personaA = "";

  const recibir = async (tenant: string, dispositivoId: string, hechos: unknown[]) => {
    const r = await mod.executeCapability(
      mod.crearContexto({
        tenantId: tenant,
        actor: { tipo: "system" },
        rol: "owner",
        alcance: null,
        medidor: { registrar: async () => undefined },
      }),
      "core.hechos_terreno.recibir",
      { dispositivoId, horaEnvio: new Date().toISOString(), hechos },
    );
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return (r.data as { resultados: Resultado[] }).resultados;
  };
  const marca = (
    codigo: string | null,
    extra: Record<string, unknown> = {},
    payload: object = {},
  ) => ({
    clave: randomUUID(),
    tipo: "rondas.marca",
    payload: { ...(codigo ? { codigo } : {}), ...payload },
    personaId: personaA,
    horaHecho: new Date(Date.now() - 30_000).toISOString(),
    ...extra,
  });
  const lectura = (lat = LAT, lng = LNG, precisionM = 5) => ({ lectura: { lat, lng, precisionM } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const s = randomUUID().slice(0, 8);
    for (const k of ["A", "B"] as const) {
      const tenantId = (
        await e.admin.tenant.create({
          data: { slug: `rm-${k.toLowerCase()}-${s}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
      t[k] = tenantId;
      const cuentaId = (await e.admin.cuenta.create({ data: { tenantId, nombre: `Cliente ${k}` } }))
        .id;
      const crear = async (nombre: string) =>
        (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre } })).id;
      inst[k] = await crear(`Planta ${k}`);
      if (k === "A") inst.A2 = await crear("Bodega A2");
      disp[k] = (
        await e.admin.dispositivo.create({
          data: {
            tenantId,
            instalacionId: inst[k],
            identificador: "DSP-1",
            estado: "activo",
            tokenHash: `h-${s}-${k}`,
          },
        })
      ).id;
    }
    const punto = async (
      tenantId: string,
      instalacionId: string,
      nombre: string,
      codigo: string,
      extra = {},
    ) => {
      const p = await e.admin.puntoControl.create({
        data: {
          tenantId,
          instalacionId,
          nombre,
          modo: "qr_gps",
          latitud: LAT,
          longitud: LNG,
          radioM: 15,
          precisionMinM: 20,
          etiquetaQr: codigo,
          ...extra,
        },
      });
      await e.admin.etiquetaQr.create({
        data: { tenantId, puntoId: p.id, codigo, firmada: false, estado: "vigente" },
      });
      return p.id;
    };
    cod.propio = `QR-PROPIO-${s}`;
    cod.ajeno = `QR-AJENO-${s}`;
    cod.otraEmpresa = `QR-B-${s}`;
    cod.reemplazado = `QR-VIEJO-${s}`;
    cod.estricto = `QR-ESTRICTO-${s}`;
    puntoPropio = await punto(t.A, inst.A, "Portón", cod.propio);
    await punto(t.A, inst.A2, "Bodega", cod.ajeno);
    await punto(t.B, inst.B, "Portón B", cod.otraEmpresa);
    await punto(t.A, inst.A, "Estricto", cod.estricto, { estricto: true });
    const viejo = await punto(t.A, inst.A, "Reemplazado", cod.reemplazado);
    await e.admin.etiquetaQr.updateMany({
      where: { puntoId: viejo },
      data: { estado: "reemplazada" },
    });
    personaA = (
      await e.admin.persona.create({
        data: {
          tenantId: t.A,
          nombres: "Guardia",
          apellidos: "A",
          rut: `${Math.floor(Math.random() * 8e7 + 1e7)}-1`,
        },
      })
    ).id;
    const cargo = await e.admin.cargo.create({ data: { tenantId: t.A, nombre: "Guardia" } });
    await e.admin.vinculoLaboral.create({
      data: {
        tenantId: t.A,
        personaId: personaA,
        cargoId: cargo.id,
        tipo: "indefinido",
        instalacionId: inst.A,
        inicio: new Date("2026-01-01"),
      },
    });
  });
  afterAll(async () => {
    await e?.cerrar?.();
  });

  it("QR del punto propio, dentro de la geocerca: queda una marca inmutable y el hecho", async () => {
    const m = marca(cod.propio, {}, lectura());
    expect(await recibir(t.A, disp.A, [m])).toEqual([
      { clave: m.clave, estado: "recibido", motivo: null },
    ]);
    const fila = await e.admin.marcaRonda.findFirstOrThrow({
      where: { tenantId: t.A, clave: m.clave },
    });
    expect(fila).toMatchObject({
      puntoId: puntoPropio,
      instalacionId: inst.A,
      geocerca: "dentro",
      anomalias: [],
      personaId: personaA,
    });
    expect(await e.admin.hechoTerreno.count({ where: { tenantId: t.A, clave: m.clave } })).toBe(1);
    await expect(
      e.forTenant(t.A).marcaRonda.update({ where: { id: fila.id }, data: { geocerca: "fuera" } }),
    ).rejects.toThrow();
    await expect(e.forTenant(t.A).marcaRonda.delete({ where: { id: fila.id } })).rejects.toThrow();
  });

  it("reenviar la misma marca no la duplica (reintento)", async () => {
    const m = marca(cod.propio, {}, lectura());
    await recibir(t.A, disp.A, [m]);
    expect((await recibir(t.A, disp.A, [m]))[0]?.estado).toBe("duplicado");
    expect(await e.admin.marcaRonda.count({ where: { tenantId: t.A, clave: m.clave } })).toBe(1);
  });

  it("el QR de otra instalación, de otra empresa o inventado se rechaza sin tumbar el lote", async () => {
    const buena = marca(cod.propio, {}, lectura());
    const lote = [marca(cod.ajeno), marca(cod.otraEmpresa), marca("QR-INVENTADO"), buena];
    const r = await recibir(t.A, disp.A, lote);
    expect(r.map((x) => x.motivo)).toEqual(["qr_ajeno", "qr_invalido", "qr_invalido", null]);
    for (const h of lote.slice(0, 3)) {
      expect(await e.admin.marcaRonda.count({ where: { clave: h.clave } })).toBe(0);
      expect(await e.admin.hechoTerreno.count({ where: { clave: h.clave } })).toBe(0);
    }
    expect(await e.admin.marcaRonda.count({ where: { clave: buena.clave } })).toBe(1);
  });

  it("sin GPS la marca vale; modo estricto fuera de la geocerca y etiqueta reemplazada dejan anomalía", async () => {
    const sinGps = marca(cod.propio);
    const lejos = marca(cod.estricto, {}, lectura(-33.4505, LNG));
    const viejo = marca(cod.reemplazado, {}, lectura());
    await recibir(t.A, disp.A, [sinGps, lejos, viejo]);
    const por = async (clave: string) => e.admin.marcaRonda.findFirstOrThrow({ where: { clave } });
    expect((await por(sinGps.clave)).geocerca).toBe("sin_gps");
    expect((await por(lejos.clave)).anomalias).toContain("fuera_de_geocerca");
    expect((await por(viejo.clave)).anomalias).toEqual(["etiqueta_reemplazada"]);
  });

  it("una marca no es asistencia, y los hechos de una empresa no aparecen en la otra", async () => {
    expect(await e.admin.marca.count({ where: { tenantId: t.A } })).toBe(0);
    expect(await e.forTenant(t.B).marcaRonda.count()).toBe(0);
    expect(await e.forTenant(t.A).marcaRonda.count()).toBeGreaterThan(0);
  });

  it("payload sin QR ni punto, o con campos de más, se rechaza", async () => {
    const r = await recibir(t.A, disp.A, [marca(null), marca(cod.propio, {}, { extra: 1 })]);
    expect(r.map((x) => x.motivo)).toEqual(["payload_invalido", "payload_invalido"]);
  });
});
