// CAR-474: lecturas del ERP de Accesos (registros de todas las instalaciones, ficha e intentos) contra Postgres
// real con dos empresas. Alcance del supervisor en la consulta, cursor, búsqueda y nada de número completo.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const CLAVE_PRUEBA = "clave-solo-para-pruebas-no-es-un-secreto-real-0123456789";
type K = "A" | "B";
type Pagina<T> = { items: T[]; siguiente: string | null };
type Reg = {
  id: string;
  nombre: string;
  instalacion: string;
  documento: string;
  patente: string | null;
};

describe.skipIf(!urlPropietario)("Accesos en el ERP, base real (CAR-474)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const inst = { A: "", A2: "", B: "" };
  const disp = { A: "", A2: "", B: "" };
  const medidor = { registrar: async () => undefined };

  const ctx = (k: K, extra: Record<string, unknown> = {}) =>
    mod.crearContexto({
      tenantId: t[k],
      actor: { tipo: "system" },
      rol: "owner",
      alcance: null,
      medidor,
      modulosActivos: ["acceso"],
      ...extra,
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown) =>
    mod.executeCapability(c, id, input);
  const ok = async <T>(c: ReturnType<typeof ctx>, id: string, input: unknown): Promise<T> => {
    const r = await run(c, id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  };
  const entrada = (
    k: K,
    d: string,
    i: string,
    nombre: string,
    extra: Record<string, unknown> = {},
  ) =>
    ok(ctx(k), "core.hechos_terreno.recibir", {
      dispositivoId: d,
      horaEnvio: new Date().toISOString(),
      hechos: [
        {
          clave: randomUUID(),
          tipo: "acceso.entrada",
          payload: {
            tipoRegistro: "visita",
            documento: { tipo: "run", numero: "12.345.678-5" },
            nombre,
            ...extra,
          },
          horaHecho: new Date(Date.now() - 10_000).toISOString(),
        },
      ],
    }).then(() => i);

  beforeAll(async () => {
    vi.stubEnv("ACCESO_HUELLA_SECRET", CLAVE_PRUEBA);
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarCapacidades(mod.capacidadesAcceso);
    const s = randomUUID().slice(0, 8);
    const crear = async (tenantId: string, nombre: string, n: string) => {
      const cuentaId = (await e.admin.cuenta.create({ data: { tenantId, nombre: `C ${n}` } })).id;
      const i = (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre } })).id;
      const d = await e.admin.dispositivo.create({
        data: {
          tenantId,
          instalacionId: i,
          identificador: `DSP-${n}`,
          estado: "activo",
          tokenHash: `h-${s}-${n}`,
        },
      });
      return { i, d: d.id };
    };
    for (const k of ["A", "B"] as const) {
      t[k] = (
        await e.admin.tenant.create({
          data: { slug: `ae-${k.toLowerCase()}-${s}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
    }
    ({ i: inst.A, d: disp.A } = await crear(t.A, "Planta Norte", "1"));
    ({ i: inst.A2, d: disp.A2 } = await crear(t.A, "Bodega Sur", "2"));
    ({ i: inst.B, d: disp.B } = await crear(t.B, "Otra empresa", "3"));
    await entrada("A", disp.A, inst.A, "Visita Norte", { empresa: "Andes Ltda." });
    await entrada("A", disp.A2, inst.A2, "Visita Sur", {
      tipoRegistro: "vehiculo",
      patente: "AB-CD 12",
    });
    await entrada("B", disp.B, inst.B, "Visita Ajena");
    await ok(ctx("A"), "acceso.listas.agregar", {
      instalacionId: inst.A,
      tipo: "bloqueada",
      documento: { tipo: "run", numero: "10.000.000-8" },
      motivo: "Texto privado del bloqueo",
    });
    await ok(ctx("A"), "core.hechos_terreno.recibir", {
      dispositivoId: disp.A,
      horaEnvio: new Date().toISOString(),
      hechos: [
        {
          clave: randomUUID(),
          tipo: "acceso.entrada",
          payload: {
            tipoRegistro: "visita",
            documento: { tipo: "run", numero: "10.000.000-8" },
            nombre: "Bloqueado",
          },
          horaHecho: new Date(Date.now() - 5_000).toISOString(),
        },
      ],
    });
  }, 120_000);
  afterAll(async () => {
    vi.unstubAllEnvs();
    await e?.cerrar?.();
  });

  it("sin instalación lista todas las de la empresa, con su nombre, y nunca las de otra", async () => {
    const r = await ok<Pagina<Reg>>(ctx("A"), "acceso.registros.listar", {});
    expect(r.items.map((x) => x.nombre).sort()).toEqual(["Visita Norte", "Visita Sur"]);
    expect(r.items.find((x) => x.nombre === "Visita Sur")?.instalacion).toBe("Bodega Sur");
    expect(JSON.stringify(r)).not.toContain("12345678");
  });

  it("pagina por cursor sin repetir ni perder filas", async () => {
    const p1 = await ok<Pagina<Reg>>(ctx("A"), "acceso.registros.listar", { limite: 1 });
    expect(p1.items).toHaveLength(1);
    expect(p1.siguiente).not.toBeNull();
    const p2 = await ok<Pagina<Reg>>(ctx("A"), "acceso.registros.listar", {
      limite: 1,
      cursor: p1.siguiente,
    });
    expect(p2.items).toHaveLength(1);
    expect(p2.items[0]?.id).not.toBe(p1.items[0]?.id);
    expect(p2.siguiente).toBeNull();
  });

  it("busca por empresa, y por patente solo si el actor puede verla", async () => {
    const porEmpresa = await ok<Pagina<Reg>>(ctx("A"), "acceso.registros.listar", { q: "andes" });
    expect(porEmpresa.items.map((x) => x.nombre)).toEqual(["Visita Norte"]);
    const porPatente = await ok<Pagina<Reg>>(ctx("A"), "acceso.registros.listar", { q: "ABCD" });
    expect(porPatente.items.map((x) => x.nombre)).toEqual(["Visita Sur"]);
    const sup = ctx("A", { rol: "supervisor" });
    expect(
      (await ok<Pagina<Reg>>(sup, "acceso.registros.listar", { q: "ABCD" })).items,
    ).toHaveLength(0);
  });

  it("el supervisor solo ve las instalaciones a su cargo, en lista, ficha e intentos", async () => {
    const sup = ctx("A", { rol: "supervisor", alcance: { instalaciones: [inst.A2] } });
    const r = await ok<Pagina<Reg>>(sup, "acceso.registros.listar", {});
    expect(r.items.map((x) => x.nombre)).toEqual(["Visita Sur"]);
    expect((await run(sup, "acceso.registros.listar", { instalacionId: inst.A })).ok).toBe(false);
    const ajeno = (
      await ok<Pagina<Reg>>(ctx("A"), "acceso.registros.listar", { instalacionId: inst.A })
    ).items[0];
    const ficha = await run(sup, "acceso.registros.get", { id: ajeno?.id });
    expect(ficha.ok).toBe(false);
    expect((await ok<Pagina<unknown>>(sup, "acceso.intentos.listar", {})).items).toHaveLength(0);
  });

  it("la ficha trae instalación, equipo y origen; otra empresa no la encuentra", async () => {
    const reg = (await ok<Pagina<Reg>>(ctx("A"), "acceso.registros.listar", { q: "Norte" }))
      .items[0];
    const f = await ok<{
      instalacion: string;
      dispositivo: string;
      origen: string;
      documento: string;
    }>(ctx("A"), "acceso.registros.get", { id: reg?.id });
    expect(f).toMatchObject({
      instalacion: "Planta Norte",
      dispositivo: "DSP-1",
      documento: "12.3••.•••-5",
    });
    expect((await run(ctx("B"), "acceso.registros.get", { id: reg?.id })).ok).toBe(false);
  });

  it("los intentos denegados muestran la categoría, nunca el texto del bloqueo", async () => {
    const r = await ok<Pagina<{ motivo: string; instalacion: string }>>(
      ctx("A"),
      "acceso.intentos.listar",
      {},
    );
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ motivo: "bloqueado", instalacion: "Planta Norte" });
    expect(JSON.stringify(r)).not.toContain("Texto privado");
    expect((await ok<Pagina<unknown>>(ctx("B"), "acceso.intentos.listar", {})).items).toHaveLength(
      0,
    );
  });
});
