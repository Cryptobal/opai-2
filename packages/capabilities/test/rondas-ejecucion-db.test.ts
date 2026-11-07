// CAR-78 · E3d: ejecución de rondas por la cola contra Postgres real con dos empresas: inicio, marcas de la ronda y
// cierre (completa o incompleta), rechazos, idempotencia, solo inserción y sin tocar asistencia.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Res = { clave: string; estado: string; motivo: string | null };
const LAT = -33.45;
const LNG = -70.66;

describe.skipIf(!urlPropietario)("ejecución de rondas en base real (CAR-78 E3d)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const inst = { A: "", B: "" };
  const disp = { A: "", B: "" };
  const cod = { p1: "", p2: "", p3: "" };
  let plantillaA = "";
  let plantillaB = "";
  let plantillaSinAdhoc = "";

  const recibir = async (k: "A" | "B", hechos: unknown[], modulos: string[] = ["rondas"]) => {
    const ctx = mod.crearContexto({
      tenantId: t[k],
      actor: { tipo: "system" },
      rol: "owner",
      alcance: null,
      medidor: { registrar: async () => undefined },
      modulosActivos: modulos,
    });
    const r = await mod.executeCapability(ctx, "core.hechos_terreno.recibir", {
      dispositivoId: disp[k],
      horaEnvio: new Date().toISOString(),
      hechos,
    });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return (r.data as { resultados: Res[] }).resultados;
  };
  const hecho = (tipo: string, payload: object, extra: Record<string, unknown> = {}) => ({
    clave: randomUUID(),
    tipo,
    payload,
    horaHecho: new Date(Date.now() - 30_000).toISOString(),
    ...extra,
  });
  const inicio = (plantillaId: string) => hecho("rondas.inicio", { plantillaId });
  const marca = (codigo: string, ejecucionClave?: string) =>
    hecho("rondas.marca", {
      codigo,
      ...(ejecucionClave ? { ejecucionClave } : {}),
      lectura: { lat: LAT, lng: LNG, precisionM: 5 },
    });
  const cierre = (ejecucionClave: string) => hecho("rondas.cierre", { ejecucionClave });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const s = randomUUID().slice(0, 8);
    for (const k of ["A", "B"] as const) {
      t[k] = (
        await e.admin.tenant.create({
          data: { slug: `re-${k.toLowerCase()}-${s}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
      const cuentaId = (
        await e.admin.cuenta.create({ data: { tenantId: t[k], nombre: `Cliente ${k}` } })
      ).id;
      inst[k] = (
        await e.admin.instalacion.create({
          data: { tenantId: t[k], cuentaId, nombre: `Planta ${k}` },
        })
      ).id;
      disp[k] = (
        await e.admin.dispositivo.create({
          data: {
            tenantId: t[k],
            instalacionId: inst[k],
            identificador: "DSP-1",
            estado: "activo",
            tokenHash: `h-${s}-${k}`,
          },
        })
      ).id;
    }
    const punto = async (n: string) => {
      const codigo = `QR-${n}-${s}`;
      const p = await e.admin.puntoControl.create({
        data: {
          tenantId: t.A,
          instalacionId: inst.A,
          nombre: n,
          modo: "qr_gps",
          latitud: LAT,
          longitud: LNG,
          radioM: 15,
          precisionMinM: 20,
          etiquetaQr: codigo,
        },
      });
      await e.admin.etiquetaQr.create({
        data: { tenantId: t.A, puntoId: p.id, codigo, firmada: false, estado: "vigente" },
      });
      return { id: p.id, codigo };
    };
    const [p1, p2, p3] = [await punto("P1"), await punto("P2"), await punto("P3")];
    cod.p1 = p1.codigo;
    cod.p2 = p2.codigo;
    cod.p3 = p3.codigo;
    const plantilla = async (k: "A" | "B", puntos: string[], extra = {}) => {
      const pl = await e.admin.plantillaRonda.create({
        data: {
          tenantId: t[k],
          instalacionId: inst[k],
          nombre: `Ronda ${randomUUID().slice(0, 6)}`,
          tiempoMaxMin: 60,
          umbralIncompletaPct: 20,
          ...extra,
        },
      });
      for (const [i, pid] of puntos.entries())
        await e.admin.plantillaPunto.create({
          data: { tenantId: t[k], plantillaId: pl.id, puntoId: pid, orden: i, obligatorio: true },
        });
      return pl.id;
    };
    plantillaA = await plantilla("A", [p1.id, p2.id, p3.id], { umbralIncompletaPct: 40 });
    plantillaSinAdhoc = await plantilla("A", [p1.id], { permiteAdhoc: false });
    plantillaB = await plantilla("B", []);
  }, 120_000);
  afterAll(async () => {
    await e?.cerrar?.();
  });

  it("inicio, marcas de la ronda y cierre en un lote: queda completa y en orden", async () => {
    const i = inicio(plantillaA);
    const m = [marca(cod.p1, i.clave), marca(cod.p2, i.clave), marca(cod.p3, i.clave)];
    const c = cierre(i.clave);
    const r = await recibir("A", [i, ...m, c]);
    expect(r.every((x) => x.estado === "recibido")).toBe(true);
    const ej = await e.admin.ejecucionRonda.findFirstOrThrow({
      where: { clave: i.clave },
      include: { cierre: true, marcas: true },
    });
    expect(ej.marcas).toHaveLength(3);
    expect(ej.cierre).toMatchObject({
      estado: "completada",
      puntosObligatorios: 3,
      puntosMarcados: 3,
    });
    expect(await e.admin.marca.count({ where: { tenantId: t.A } })).toBe(0);
  });

  it("con faltantes sobre el umbral queda incompleta; los reenvíos no duplican", async () => {
    const i = inicio(plantillaA);
    const lote = [i, marca(cod.p1, i.clave), cierre(i.clave)];
    await recibir("A", lote);
    const ej = await e.admin.ejecucionRonda.findFirstOrThrow({
      where: { clave: i.clave },
      include: { cierre: true },
    });
    expect(ej.cierre).toMatchObject({ estado: "incompleta", puntosMarcados: 1 });
    expect((await recibir("A", lote)).every((x) => x.estado === "duplicado")).toBe(true);
    expect(await e.admin.ejecucionRonda.count({ where: { clave: i.clave } })).toBe(1);
  });

  it("rechaza plantilla ajena o inexistente, ronda no permitida, ronda desconocida y segundo cierre", async () => {
    expect(
      (await recibir("A", [inicio(plantillaB), inicio(randomUUID())])).map((x) => x.motivo),
    ).toEqual(["plantilla_invalida", "plantilla_invalida"]);
    expect((await recibir("A", [inicio(plantillaSinAdhoc)]))[0]?.motivo).toBe("ronda_no_permitida");
    expect(
      (await recibir("A", [marca(cod.p1, randomUUID()), cierre(randomUUID())])).map(
        (x) => x.motivo,
      ),
    ).toEqual(["ejecucion_desconocida", "ejecucion_desconocida"]);
    const i = inicio(plantillaA);
    await recibir("A", [i, cierre(i.clave)]);
    expect((await recibir("A", [cierre(i.clave)]))[0]?.motivo).toBe("ronda_ya_cerrada");
  });

  it("una marca puede llegar después en otro lote; la otra empresa no ve ni cierra rondas ajenas", async () => {
    const i = inicio(plantillaA);
    await recibir("A", [i]);
    const tarde = marca(cod.p2, i.clave);
    expect((await recibir("A", [tarde]))[0]?.estado).toBe("recibido");
    expect(
      await e.admin.marcaRonda.count({ where: { clave: tarde.clave, ejecucionId: { not: null } } }),
    ).toBe(1);
    expect((await recibir("B", [cierre(i.clave)]))[0]?.motivo).toBe("ejecucion_desconocida");
    expect(await e.forTenant(t.B).ejecucionRonda.count()).toBe(0);
  });

  it("solo inserción y con el módulo Rondas activo", async () => {
    const ej = await e.admin.ejecucionRonda.findFirstOrThrow({ where: { tenantId: t.A } });
    await expect(
      e.forTenant(t.A).ejecucionRonda.update({ where: { id: ej.id }, data: { adhoc: false } }),
    ).rejects.toThrow();
    await expect(
      e.forTenant(t.A).ejecucionRonda.delete({ where: { id: ej.id } }),
    ).rejects.toThrow();
    expect((await recibir("A", [inicio(plantillaA)], []))[0]?.motivo).toBe("modulo_inactivo");
  });

  it("si el inicio cae por otra regla, su marca y su cierre del mismo lote también caen (no se pierde el cierre)", async () => {
    const i = { ...inicio(plantillaA), personaId: randomUUID() };
    const m = marca(cod.p1, i.clave);
    const c = cierre(i.clave);
    const r = await recibir("A", [i, m, c]);
    expect(r.map((x) => x.motivo)).toEqual([
      "persona_no_valida",
      "ejecucion_desconocida",
      "ejecucion_desconocida",
    ]);
    expect(await e.admin.ejecucionRonda.count({ where: { clave: i.clave } })).toBe(0);
    expect(await e.admin.cierreRonda.count({ where: { clave: c.clave } })).toBe(0);
    expect(
      await e.admin.hechoTerreno.count({ where: { clave: { in: [i.clave, m.clave, c.clave] } } }),
    ).toBe(0);
  });
});
