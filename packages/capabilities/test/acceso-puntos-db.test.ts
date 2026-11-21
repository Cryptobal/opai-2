// CAR-479 parte 2: puntos de acceso por instalación contra Postgres real (rol sin BYPASSRLS).
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { urlPropietario } from "../../db/test/entorno";
import { prepararAccesoAB } from "./acceso-entorno-a-b";

type Punto = { id: string; nombre: string; tipo: string; activo: boolean };

describe.skipIf(!urlPropietario)("puntos de acceso en base real (CAR-479)", () => {
  let x: Awaited<ReturnType<typeof prepararAccesoAB>>;
  const puntos = async (k: "A" | "B") =>
    (await x.ok<{ items: Punto[] }>(k, "acceso.puntos.list", { instalacionId: x.inst[k] })).items;

  beforeAll(async () => {
    x = await prepararAccesoAB();
  }, 120_000);
  afterAll(async () => {
    vi.unstubAllEnvs();
    await x?.e?.cerrar?.();
  });

  it("crea, ordena y desactiva en vez de borrar; la vista previa no escribe", async () => {
    const instalacionId = x.inst.A;
    const vista = await x.mod.executeCapability(
      x.ctx("A"),
      "acceso.puntos.set",
      { instalacionId, puntos: [{ nombre: "Portería principal", tipo: "peatonal", activo: true }] },
      { dryRun: true },
    );
    expect(vista).toMatchObject({ ok: true, data: { items: [{ nombre: "Portería principal" }] } });
    expect(await puntos("A")).toEqual([]);
    const [p1, p2] = (
      await x.ok<{ items: Punto[] }>("A", "acceso.puntos.set", {
        instalacionId,
        puntos: [
          { nombre: "Portería principal", tipo: "peatonal", activo: true },
          { nombre: "Acceso vehicular", tipo: "vehicular", activo: true },
        ],
      })
    ).items;
    await x.ok("A", "acceso.puntos.set", {
      instalacionId,
      puntos: [{ ...p2, nombre: "Portón vehicular" }],
    });
    expect(await puntos("A")).toEqual([
      { ...p2, nombre: "Portón vehicular" },
      { ...p1, activo: false },
    ]);
    const repetido = await x.run("A", "acceso.puntos.set", {
      instalacionId,
      puntos: [{ nombre: "portería principal", tipo: "peatonal", activo: true }],
    });
    expect(repetido.ok).toBe(false);
  });

  it("otra empresa no ve ni cambia los puntos de A, ni usa un punto de A como propio", async () => {
    const [deA] = await puntos("A");
    expect((await x.run("B", "acceso.puntos.list", { instalacionId: x.inst.A })).ok).toBe(false);
    const ajeno = await x.run("B", "acceso.puntos.set", {
      instalacionId: x.inst.B,
      puntos: [{ ...deA, nombre: "Robado" }],
    });
    expect(ajeno.ok).toBe(false);
    expect(await x.e.forTenant(x.t.B).puntoAcceso.count()).toBe(0);
  });

  it("la portería ofrece los activos y el registro guarda el punto solo si es activo de su instalación", async () => {
    const activos = await puntos("A");
    const sitio = await x.ok<{ puntos: { id: string }[] }>("A", "core.terreno.en_sitio", {
      dispositivoId: x.disp.A,
    });
    expect(sitio.puntos.map((p) => p.id)).toEqual(activos.filter((p) => p.activo).map((p) => p.id));
    await x.ok("A", "acceso.config.set", {
      config: {
        ...(await x.ok<{ efectiva: object }>("A", "acceso.config.get", {})).efectiva,
        permitirFueraDeLista: true,
      },
    });
    const doc = { tipo: "run", numero: "12.345.678-5" };
    const punto = activos.find((p) => p.activo)?.id;
    const conPunto = await x.entrada({ documento: doc, nombre: "Con punto", puntoId: punto });
    const r = await x.registro(conPunto);
    expect(r?.puntoId).toBe(punto);
    expect(await x.ok<{ punto: string }>("A", "acceso.registros.get", { id: r?.id })).toMatchObject(
      {
        punto: "Portón vehicular",
      },
    );
    const inactivo = activos.find((p) => !p.activo)?.id;
    const sinPunto = await x.entrada({
      documento: doc,
      nombre: "Punto inactivo",
      puntoId: inactivo,
    });
    expect((await x.registro(sinPunto))?.puntoId).toBeNull();
  });
});
