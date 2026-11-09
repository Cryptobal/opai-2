// CAR-78 · E2: contexto del equipo de terreno (instalación, turnos de ahora y módulos activos), contra Postgres
// real con dos empresas: cada equipo ve solo lo de su instalación y su empresa.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type Turno = { nombre: string; estado: string };
type Contexto = {
  instalacion: { nombre: string };
  turnos: Turno[];
  modulos: { asistencia: boolean; rondas: boolean; acceso: boolean };
};

const H = 3_600_000;

describe.skipIf(!urlPropietario)("contexto de terreno en base real (CAR-78 E2)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const medidor = { registrar: async () => undefined };
  const t = { A: "", B: "" };
  const inst = { A: "", A2: "", B: "" };
  const disp = { A: "", B: "", revocado: "" };

  const ctx = (tenantId: string, modulosActivos: string[] = []) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      alcance: null,
      medidor,
      modulosActivos,
    });
  const contexto = (tenant: string, dispositivoId: string, modulos: string[] = []) =>
    mod.executeCapability(ctx(tenant, modulos), "core.terreno.contexto", { dispositivoId });
  const dato = async (tenant: string, dispositivoId: string, modulos: string[] = []) => {
    const r = await contexto(tenant, dispositivoId, modulos);
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data as Contexto;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const sufijo = randomUUID().slice(0, 8);
    for (const k of ["A", "B"] as const) {
      t[k] = (
        await e.admin.tenant.create({
          data: { slug: `ctx-${k.toLowerCase()}-${sufijo}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
      const cuenta = await mod.executeCapability(ctx(t[k]), "core.cuentas.create", {
        nombre: `Cliente ${k}`,
      });
      if (!cuenta.ok) throw new Error("cuenta");
      const crear = async (nombre: string) => {
        const r = await mod.executeCapability(ctx(t[k]), "core.instalaciones.create", {
          cuentaId: (cuenta.data as { id: string }).id,
          nombre,
        });
        if (!r.ok) throw new Error("instalación");
        return (r.data as { id: string }).id;
      };
      inst[k] = await crear(`Planta ${k}`);
      if (k === "A") inst.A2 = await crear("Bodega A2");
    }
    const nuevoDisp = (tenantId: string, instalacionId: string, n: number, estado = "activo") =>
      e.admin.dispositivo.create({
        data: {
          tenantId,
          instalacionId,
          identificador: `DSP-100${n}`,
          estado,
          tokenHash: `h-${sufijo}-${tenantId}-${n}`,
        },
      });
    disp.A = (await nuevoDisp(t.A, inst.A, 1)).id;
    disp.B = (await nuevoDisp(t.B, inst.B, 1)).id;
    disp.revocado = (await nuevoDisp(t.A, inst.A, 2, "revocado")).id;

    const ahora = Date.now();
    const persona = async (tenantId: string, nombres: string, extra = {}) =>
      (
        await e.admin.persona.create({
          data: {
            tenantId,
            rut: `${Math.floor(Math.random() * 8e7 + 1e7)}-${nombres.length}`,
            nombres,
            apellidos: "Prueba",
            ...extra,
          },
        })
      ).id;
    const turno = (
      tenantId: string,
      personaId: string,
      instalacionId: string,
      ini: number,
      fin: number,
      vigente = true,
    ) =>
      e.admin.turnoEsperado.create({
        data: {
          tenantId,
          personaId,
          instalacionId,
          fecha: new Date(ahora),
          inicio: new Date(ahora + ini * H),
          fin: new Date(ahora + fin * H),
          origen: "manual",
          vigente,
        },
      });
    await turno(t.A, await persona(t.A, "Ana"), inst.A, -1, 7); // en curso
    await turno(t.A, await persona(t.A, "Beto"), inst.A, 3, 11); // próximo
    await turno(t.A, await persona(t.A, "Carla"), inst.A, -9, -1); // terminó hace 1 h: cambio de turno
    await turno(t.A, await persona(t.A, "Dani"), inst.A, -17, -5); // terminó hace 5 h: fuera de la ventana
    await turno(t.A, await persona(t.A, "Eva"), inst.A2, -1, 7); // otra instalación
    await turno(t.A, await persona(t.A, "Fran"), inst.A, -1, 7, false); // turno reemplazado
    await turno(t.A, await persona(t.A, "Gabo", { anonimizadaEn: new Date() }), inst.A, -1, 7); // anonimizada
    await turno(t.B, await persona(t.B, "Hugo"), inst.B, -1, 7);
  }, 120_000);

  afterAll(async () => {
    await e?.cerrar?.();
  });

  it("da la instalación y los turnos de ahora en orden, con su estado, sin los ajenos ni los vencidos", async () => {
    const c = await dato(t.A, disp.A);
    expect(c.instalacion.nombre).toBe("Planta A");
    expect(c.turnos.map((x) => [x.nombre, x.estado])).toEqual([
      ["Carla Prueba", "terminado"],
      ["Ana Prueba", "en_curso"],
      ["Beto Prueba", "proximo"],
    ]);
  });

  it("muestra solo los módulos de terreno que la empresa tiene activos", async () => {
    expect((await dato(t.A, disp.A)).modulos).toEqual({
      asistencia: false,
      rondas: false,
      acceso: false,
    });
    expect((await dato(t.A, disp.A, ["rondas", "asistencia", "tickets"])).modulos).toEqual({
      asistencia: true,
      rondas: true,
      acceso: false,
    });
  });

  it("dos empresas: cada equipo ve lo suyo y uno no puede pedir el contexto del otro", async () => {
    const b = await dato(t.B, disp.B);
    expect(b.instalacion.nombre).toBe("Planta B");
    expect(b.turnos.map((x) => x.nombre)).toEqual(["Hugo Prueba"]);
    expect((await contexto(t.B, disp.A)).ok).toBe(false); // el dispositivo de A no existe para B
    expect((await contexto(t.A, disp.B)).ok).toBe(false);
  });

  it("un equipo revocado no recibe contexto y el error lo dice", async () => {
    const r = await contexto(t.A, disp.revocado);
    expect(r.ok).toBe(false);
    expect(JSON.stringify(r)).toContain("revocado");
  });
});
