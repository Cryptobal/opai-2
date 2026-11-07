// CAR-78 · E4c: gestión de listas y lectura de registros de portería, contra Postgres real con dos empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const CLAVE_PRUEBA = "clave-solo-para-pruebas-no-es-un-secreto-real-0123456789";
const RUN = "12.345.678-5";

describe.skipIf(!urlPropietario)("listas y registros de acceso en base real (CAR-78 E4c)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const inst = { A: "", B: "" };
  const disp = { A: "", B: "" };

  const ctx = (k: "A" | "B") =>
    mod.crearContexto({
      tenantId: t[k],
      actor: { tipo: "system" },
      rol: "owner",
      alcance: null,
      medidor: { registrar: async () => undefined },
      modulosActivos: ["acceso"],
    });
  const run = (k: "A" | "B", id: string, input: unknown, o = {}) =>
    mod.executeCapability(ctx(k), id, input, o);
  const ok = async <T>(k: "A" | "B", id: string, input: unknown): Promise<T> => {
    const r = await run(k, id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  };
  const agregar = (k: "A" | "B", extra: Record<string, unknown> = {}) =>
    run(k, "acceso.listas.agregar", {
      instalacionId: inst[k],
      tipo: "bloqueada",
      documento: { tipo: "run", numero: RUN },
      motivo: "Prueba",
      ...extra,
    });

  beforeAll(async () => {
    vi.stubEnv("ACCESO_HUELLA_SECRET", CLAVE_PRUEBA);
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarCapacidades(mod.capacidadesAcceso);
    const s = randomUUID().slice(0, 8);
    for (const k of ["A", "B"] as const) {
      t[k] = (
        await e.admin.tenant.create({
          data: { slug: `al-${k.toLowerCase()}-${s}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
      const cuentaId = (
        await e.admin.cuenta.create({ data: { tenantId: t[k], nombre: `Cliente ${k}` } })
      ).id;
      inst[k] = (
        await e.admin.instalacion.create({
          data: { tenantId: t[k], cuentaId, nombre: `Portería ${k}` },
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
  }, 120_000);
  afterAll(async () => {
    vi.unstubAllEnvs();
    await e?.cerrar?.();
  });

  it("agrega un bloqueo: la lista muestra la máscara y nunca el número; la auditoría tampoco lo guarda", async () => {
    const r = await agregar("A");
    expect(r.ok).toBe(true);
    const lista = await ok<{ mascara: string; motivo: string }[]>("A", "acceso.listas.listar", {
      instalacionId: inst.A,
    });
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ mascara: "12.3••.•••-5", motivo: "Prueba" });
    expect(JSON.stringify(lista)).not.toContain("12345678");
    const auditoria = await e.admin.auditEvent.findMany({
      where: { tenantId: t.A, capability: "acceso.listas.agregar" },
    });
    expect(auditoria.length).toBeGreaterThan(0);
    expect(JSON.stringify(auditoria)).not.toContain("12345678");
    expect(JSON.stringify(auditoria)).not.toContain("12.345.678");
  });

  it("rechaza duplicado, bloqueo sin motivo, documento inválido y horario incompleto", async () => {
    expect((await agregar("A")).ok).toBe(false);
    expect(
      (
        await agregar("A", {
          documento: { tipo: "run", numero: "11.111.111-1" },
          motivo: undefined,
        })
      ).ok,
    ).toBe(false);
    expect((await agregar("A", { documento: { tipo: "run", numero: "12.345.678-9" } })).ok).toBe(
      false,
    );
    expect(
      (
        await agregar("A", {
          tipo: "autorizada",
          documento: { tipo: "run", numero: "11.111.111-1" },
          desdeMin: 60,
        })
      ).ok,
    ).toBe(false);
  });

  it("la vista previa no escribe; la otra empresa no ve ni quita la entrada", async () => {
    const prev = await run(
      "B",
      "acceso.listas.agregar",
      {
        instalacionId: inst.B,
        tipo: "bloqueada",
        documento: { tipo: "run", numero: RUN },
        motivo: "Prueba",
      },
      { dryRun: true },
    );
    expect(prev.ok).toBe(true);
    expect(await e.admin.entradaLista.count({ where: { tenantId: t.B } })).toBe(0);
    const deA = await e.admin.entradaLista.findFirstOrThrow({ where: { tenantId: t.A } });
    expect((await run("B", "acceso.listas.quitar", { id: deA.id })).ok).toBe(false);
    expect((await run("B", "acceso.listas.listar", { instalacionId: inst.A })).ok).toBe(false);
    expect((await agregar("B")).ok).toBe(true);
    expect(await e.admin.entradaLista.count({ where: { tenantId: t.B } })).toBe(1);
  });

  it("lo que se agrega por capacidad lo respeta la ingesta de la cola", async () => {
    const h = {
      clave: randomUUID(),
      tipo: "acceso.entrada",
      payload: {
        tipoRegistro: "visita",
        documento: { tipo: "run", numero: RUN },
        nombre: "Visita",
      },
      horaHecho: new Date(Date.now() - 20_000).toISOString(),
    };
    const r = await run("A", "core.hechos_terreno.recibir", {
      dispositivoId: disp.A,
      horaEnvio: new Date().toISOString(),
      hechos: [h],
    });
    expect(r.ok).toBe(true);
    expect(
      (await e.admin.intentoDenegado.findFirstOrThrow({ where: { clave: h.clave } })).motivo,
    ).toBe("bloqueado");
  });

  it("quitar elimina la entrada sin uso y vence la ya usada", async () => {
    const libre = await e.admin.entradaLista.findFirstOrThrow({ where: { tenantId: t.A } });
    expect(
      (await ok<{ accion: string }>("A", "acceso.listas.quitar", { id: libre.id })).accion,
    ).toBe("eliminada");
    const aut = await ok<{ id: string }>("A", "acceso.listas.agregar", {
      instalacionId: inst.A,
      tipo: "autorizada",
      documento: { tipo: "run", numero: RUN },
      usoUnico: true,
    });
    const h = {
      clave: randomUUID(),
      tipo: "acceso.entrada",
      payload: {
        tipoRegistro: "visita",
        documento: { tipo: "run", numero: RUN },
        nombre: "Visita Uno",
      },
      horaHecho: new Date(Date.now() - 20_000).toISOString(),
    };
    await run("A", "core.hechos_terreno.recibir", {
      dispositivoId: disp.A,
      horaEnvio: new Date().toISOString(),
      hechos: [h],
    });
    expect((await ok<{ accion: string }>("A", "acceso.listas.quitar", { id: aut.id })).accion).toBe(
      "vencida",
    );
    expect(
      (await e.admin.entradaLista.findFirstOrThrow({ where: { id: aut.id } })).vigenteHasta,
    ).not.toBeNull();
  });

  it("los registros se listan con el documento enmascarado, en sitio o todos, solo de la propia empresa", async () => {
    const dentro = await ok<{ nombre: string; documento: string; salidaEn: string | null }[]>(
      "A",
      "acceso.registros.listar",
      { instalacionId: inst.A, soloEnSitio: true },
    );
    expect(dentro.map((x) => x.nombre)).toContain("Visita Uno");
    expect(JSON.stringify(dentro)).not.toContain("12345678");
    expect(dentro[0]?.documento).toBe("12.3••.•••-5");
    expect((await run("B", "acceso.registros.listar", { instalacionId: inst.A })).ok).toBe(false);
    const deB = await ok<unknown[]>("B", "acceso.registros.listar", { instalacionId: inst.B });
    expect(deB).toHaveLength(0);
  });
});
