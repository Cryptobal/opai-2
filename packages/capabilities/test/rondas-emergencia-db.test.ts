// CAR-501: botón «Emergencia» por la cola de Terreno contra Postgres real. La alerta emite `rondas.emergencia` una
// sola vez (aunque se reenvíe), con la instalación, la ronda y la ubicación; sin Rondas activo se rechaza; la otra
// empresa no recibe nada; no crea asistencia.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Res = { clave: string; estado: string; motivo: string | null };

describe.skipIf(!urlPropietario)("emergencia de ronda en base real (CAR-501)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const inst = { A: "", B: "" };
  const disp = { A: "", B: "" };
  let plantilla = "";

  const recibir = async (k: "A" | "B", hechos: unknown[], modulos = ["rondas"]) => {
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
  const hecho = (tipo: string, payload: object) => ({
    clave: randomUUID(),
    tipo,
    payload,
    horaHecho: new Date(Date.now() - 10_000).toISOString(),
  });
  const alertas = (k: "A" | "B") =>
    e.admin.evento.findMany({ where: { tenantId: t[k], tipo: "rondas.emergencia" } });

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
      const cuentaId = (await e.admin.cuenta.create({ data: { tenantId: t[k], nombre: "C" } })).id;
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
    plantilla = (
      await e.admin.plantillaRonda.create({
        data: { tenantId: t.A, instalacionId: inst.A, nombre: "R", tiempoMaxMin: 60 },
      })
    ).id;
  }, 120_000);
  afterAll(async () => {
    await e?.cerrar?.();
  });

  it("emite la alerta una vez, con la ronda y la ubicación, aunque se reenvíe", async () => {
    const i = hecho("rondas.inicio", { plantillaId: plantilla });
    await recibir("A", [i]);
    const lectura = { lat: -33.45, lng: -70.66, precisionM: 12 };
    const alerta = hecho("rondas.emergencia", { ejecucionClave: i.clave, lectura });
    expect((await recibir("A", [alerta]))[0]?.estado).toBe("recibido");
    expect((await recibir("A", [alerta]))[0]?.estado).toBe("duplicado");
    const ev = await alertas("A");
    expect(ev).toHaveLength(1);
    const ej = await e.admin.ejecucionRonda.findFirstOrThrow({ where: { clave: i.clave } });
    expect(ev[0]?.payload).toMatchObject({
      instalacionId: inst.A,
      dispositivoId: disp.A,
      ejecucionId: ej.id,
      ubicacion: lectura,
    });
    expect(ev[0]?.payload).not.toHaveProperty("personaId");
  });

  it("dos envíos simultáneos de la misma alerta (página y service worker) emiten una sola señal", async () => {
    const antes = (await alertas("A")).length;
    const alerta = hecho("rondas.emergencia", {});
    await Promise.all([recibir("A", [alerta]), recibir("A", [alerta])]);
    expect(await alertas("A")).toHaveLength(antes + 1);
  });

  it("sin ronda ni GPS igual avisa; sin Rondas activo se rechaza; la otra empresa no recibe nada", async () => {
    const antes = (await alertas("A")).length;
    expect((await recibir("A", [hecho("rondas.emergencia", {})]))[0]?.estado).toBe("recibido");
    expect((await alertas("A"))[antes]?.payload).toMatchObject({
      ejecucionId: null,
      ubicacion: null,
    });
    const r = await recibir("B", [hecho("rondas.emergencia", {})], ["acceso"]);
    expect(r[0]?.motivo).toBe("modulo_inactivo");
    expect(await alertas("B")).toHaveLength(0);
    expect(await e.admin.marca.count({ where: { tenantId: t.A } })).toBe(0);
  });
});
