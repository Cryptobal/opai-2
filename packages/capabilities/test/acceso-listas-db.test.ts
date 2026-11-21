// CAR-78 · E4c: gestión de listas y lectura de registros de portería, contra Postgres real con dos empresas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { digitoVerificador, formatearRut, normalizarDocumento } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const CLAVE_PRUEBA = "clave-solo-para-pruebas-no-es-un-secreto-real-0123456789";

function runDesdeCuerpo(cuerpo: number): string {
  const s = String(cuerpo);
  return formatearRut(`${s}-${digitoVerificador(s)}`);
}

/** RUN distinto por worker de Vitest (merge_group y estabilidad comparten el mismo Postgres efímero). */
function runUnico(sufijo: string, base: number): string {
  const extra = parseInt(sufijo.replace(/\D/g, "").slice(0, 6) || "0", 16) % 500_000;
  return runDesdeCuerpo(base + extra);
}

const RUN_EMPRESA = runDesdeCuerpo(16_666_666);
const RUN_VEHICULO = runDesdeCuerpo(10_000_000);

describe.skipIf(!urlPropietario)("listas y registros de acceso en base real (CAR-78 E4c)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let RUN = "";
  let RUN_AUX = "";
  let mascaraRun = "";
  let cuerpoRun = "";
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
    RUN = runUnico(s, 12_000_000);
    RUN_AUX = runUnico(`${s}-aux`, 11_000_000);
    const doc = normalizarDocumento({ tipo: "run", numero: RUN });
    if (!doc) throw new Error("RUN de prueba inválido");
    mascaraRun = doc.mascara;
    cuerpoRun = doc.clave.split("-")[0] ?? "";
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
    expect(lista[0]).toMatchObject({ mascara: mascaraRun, motivo: "Prueba" });
    expect(JSON.stringify(lista)).not.toContain(cuerpoRun);
    const auditoria = await e.admin.auditEvent.findMany({
      where: { tenantId: t.A, capability: "acceso.listas.agregar" },
    });
    expect(auditoria.length).toBeGreaterThan(0);
    expect(JSON.stringify(auditoria)).not.toContain(cuerpoRun);
    expect(JSON.stringify(auditoria)).not.toContain(RUN);
  });

  it("rechaza duplicado, bloqueo sin motivo, documento inválido y horario incompleto", async () => {
    expect((await agregar("A")).ok).toBe(false);
    expect(
      (
        await agregar("A", {
          documento: { tipo: "run", numero: RUN_AUX },
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
          documento: { tipo: "run", numero: RUN_AUX },
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
    const dentro = (
      await ok<{ items: { nombre: string; documento: string; salidaEn: string | null }[] }>(
        "A",
        "acceso.registros.listar",
        { instalacionId: inst.A, soloEnSitio: true },
      )
    ).items;
    expect(dentro.map((x) => x.nombre)).toContain("Visita Uno");
    expect(JSON.stringify(dentro)).not.toContain(cuerpoRun);
    expect(dentro[0]?.documento).toBe(mascaraRun);
    expect((await run("B", "acceso.registros.listar", { instalacionId: inst.A })).ok).toBe(false);
    const deB = await ok<{ items: unknown[] }>("B", "acceso.registros.listar", {
      instalacionId: inst.B,
    });
    expect(deB.items).toHaveLength(0);
  });

  it("un bloqueo a nivel empresa gana sobre autorizado en la instalación (R7)", async () => {
    await ok("A", "acceso.listas.agregar", {
      instalacionId: inst.A,
      tipo: "autorizada",
      documento: { tipo: "run", numero: RUN_EMPRESA },
    });
    await ok("A", "acceso.listas.agregar", {
      instalacionId: inst.A,
      alcance: "empresa",
      tipo: "bloqueada",
      documento: { tipo: "run", numero: RUN_EMPRESA },
      motivo: "Bloqueo global",
    });
    const h = {
      clave: randomUUID(),
      tipo: "acceso.entrada",
      payload: {
        tipoRegistro: "visita",
        documento: { tipo: "run", numero: RUN_EMPRESA },
        nombre: "Empresa bloqueada",
      },
      horaHecho: new Date(Date.now() - 20_000).toISOString(),
    };
  await run("A", "core.hechos_terreno.recibir", {
      dispositivoId: disp.A,
      horaEnvio: new Date().toISOString(),
      hechos: [h],
    });
    expect(
      (await e.admin.intentoDenegado.findFirstOrThrow({ where: { clave: h.clave } })).motivo,
    ).toBe("bloqueado");
  });

  it("la patente completa solo la ve quien tiene el permiso restringido", async () => {
    await ok("A", "acceso.listas.agregar", {
      instalacionId: inst.A,
      tipo: "autorizada",
      documento: { tipo: "run", numero: RUN_VEHICULO },
    });
    const h = {
      clave: randomUUID(),
      tipo: "acceso.entrada",
      payload: {
        tipoRegistro: "vehiculo",
        documento: { tipo: "run", numero: RUN_VEHICULO },
        nombre: "Conductor",
        patente: "bb-cc 12",
      },
      horaHecho: new Date(Date.now() - 20_000).toISOString(),
    };
    await run("A", "core.hechos_terreno.recibir", {
      dispositivoId: disp.A,
      horaEnvio: new Date().toISOString(),
      hechos: [h],
    });
    const patentes = (items: { nombre: string; patente: string | null }[]) =>
      items.find((x) => x.nombre === "Conductor")?.patente;
    type Item = { nombre: string; patente: string | null };
    const todos = await ok<{ items: Item[] }>("A", "acceso.registros.listar", {
      instalacionId: inst.A,
    });
    expect(patentes(todos.items)).toBe("BBCC12");
    const supervisor = mod.crearContexto({
      tenantId: t.A,
      actor: { tipo: "system" },
      rol: "supervisor",
      alcance: null,
      medidor: { registrar: async () => undefined },
      modulosActivos: ["acceso"],
    });
    const r = await mod.executeCapability(supervisor, "acceso.registros.listar", {
      instalacionId: inst.A,
    });
    expect(r.ok).toBe(true);
    expect(patentes((r as { data: { items: Item[] } }).data.items)).toBeNull();
  });
});
