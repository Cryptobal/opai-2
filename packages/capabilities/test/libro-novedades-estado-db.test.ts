// CAR-77 parte 2: registrar una novedad en línea y su ciclo de estados como hechos nuevos, contra Postgres real con
// dos empresas: vista previa sin escribir, número NOV, evento, punto y tipo de Rondas validados, alcance del
// supervisor, permiso, transiciones válidas e inválidas, cerrada final, historia y dos cambios a la vez.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Rol = "owner" | "supervisor" | "viewer";
type Novedad = { id: string; codigo: string; estado: string; gravedad: string };

describe.skipIf(!urlPropietario)("libro de novedades: registrar y estados (CAR-77 parte 2)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const inst = { A1: "", A2: "", B: "" };
  let puntoB = "";
  let puntoA2 = "";
  let tipoAlta = "";
  let tipoB = "";

  const correr = async (
    k: "A" | "B",
    id: string,
    input: object,
    o: { rol?: Rol; alcance?: string[]; modulos?: string[]; dryRun?: boolean } = {},
  ) => {
    const ctx = mod.crearContexto({
      tenantId: t[k],
      actor: { tipo: "system" },
      rol: o.rol ?? "owner",
      alcance: o.alcance ? { instalaciones: o.alcance } : null,
      medidor: { registrar: async () => undefined },
      modulosActivos: o.modulos ?? ["rondas"],
    });
    return mod.executeCapability(ctx, id, input, o.dryRun ? { dryRun: true } : {});
  };
  const ok = <T>(r: Awaited<ReturnType<typeof correr>>) => {
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data as T;
  };
  const codigo = (r: Awaited<ReturnType<typeof correr>>) => (r.ok ? "OK" : r.error.code);
  const registrar = (input: object, o = {}) =>
    correr(
      "A",
      "core.libro_novedades.registrar",
      { instalacionId: inst.A1, resumen: "Portón abierto", ...input },
      o,
    );
  const cambiar = (novedadId: string, accion: string, o = {}) =>
    correr("A", "core.libro_novedades.cambiar_estado", { novedadId, accion }, o);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const s = randomUUID().slice(0, 8);
    for (const k of ["A", "B"] as const)
      t[k] = (
        await e.admin.tenant.create({
          data: { slug: `qa-lne-${k.toLowerCase()}-${s}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
    const instalacion = async (tenantId: string, nombre: string) => {
      const cuentaId = (
        await e.admin.cuenta.create({ data: { tenantId, nombre: `Cliente ${nombre}` } })
      ).id;
      return (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre } })).id;
    };
    inst.A1 = await instalacion(t.A, "Planta 1");
    inst.A2 = await instalacion(t.A, "Planta 2");
    inst.B = await instalacion(t.B, "Planta B");
    puntoB = (
      await e.admin.puntoControl.create({
        data: { tenantId: t.B, instalacionId: inst.B, nombre: "P", modo: "gps" },
      })
    ).id;
    puntoA2 = (
      await e.admin.puntoControl.create({
        data: { tenantId: t.A, instalacionId: inst.A2, nombre: "P2", modo: "gps" },
      })
    ).id;
    tipoB = (await e.admin.tipoIncidente.create({ data: { tenantId: t.B, nombre: "Daño" } })).id;
    tipoAlta = (
      await e.admin.tipoIncidente.create({
        data: { tenantId: t.A, nombre: "Intrusión", gravedadDefecto: "alta" },
      })
    ).id;
  }, 120_000);
  afterAll(async () => {
    await e?.cerrar?.();
  });

  it("la vista previa no escribe; la real numera, toma la gravedad del tipo y emite el evento", async () => {
    expect(ok<{ aplicado: boolean }>(await registrar({}, { dryRun: true })).aplicado).toBe(false);
    expect(await e.admin.libroNovedad.count({ where: { tenantId: t.A } })).toBe(0);
    const { novedad } = ok<{ novedad: Novedad }>(await registrar({ tipoIncidenteId: tipoAlta }));
    expect(novedad).toMatchObject({ codigo: "NOV-0001", estado: "abierta", gravedad: "alta" });
    const ev = await e.admin.evento.count({
      where: { tenantId: t.A, tipo: "core.libro_novedades.registrada", entidadId: novedad.id },
    });
    expect(ev).toBe(1);
  });

  it("rechaza punto de otra empresa, tipo sin Rondas activo, instalación fuera de alcance y quien no tiene permiso", async () => {
    expect(codigo(await registrar({ puntoId: puntoB }))).toBe("NOT_FOUND");
    expect(codigo(await registrar({ puntoId: puntoA2 }))).toBe("NOT_FOUND");
    expect(codigo(await registrar({ tipoIncidenteId: tipoB }))).toBe("NOT_FOUND");
    expect(codigo(await registrar({ tipoIncidenteId: tipoAlta }, { modulos: [] }))).toBe(
      "UNPROCESSABLE",
    );
    expect(codigo(await registrar({}, { rol: "supervisor", alcance: [inst.A2] }))).toBe(
      "NOT_FOUND",
    );
    expect(codigo(await registrar({}, { rol: "viewer" }))).toBe("FORBIDDEN");
    expect(
      codigo(
        await correr("B", "core.libro_novedades.registrar", {
          instalacionId: inst.A1,
          resumen: "Ajena",
        }),
      ),
    ).toBe("NOT_FOUND");
    expect(codigo(await registrar({}, { rol: "supervisor", alcance: [inst.A1] }))).toBe("OK");
  });

  it("recorre el ciclo, cerrada es final y la historia queda con cada hecho", async () => {
    const { novedad } = ok<{ novedad: Novedad }>(await registrar({}));
    for (const [accion, estado] of [
      ["tomar", "en_atencion"],
      ["resolver", "resuelta"],
      ["cerrar", "cerrada"],
    ] as const)
      expect(ok<{ novedad: Novedad }>(await cambiar(novedad.id, accion)).novedad.estado).toBe(
        estado,
      );
    expect(codigo(await cambiar(novedad.id, "reabrir"))).toBe("UNPROCESSABLE");
    const det = ok<{ acciones: string[]; historia: { accion: string; estadoNuevo: string }[] }>(
      await correr("A", "core.libro_novedades.obtener", { novedadId: novedad.id }),
    );
    expect(det.acciones).toEqual([]);
    expect(det.historia.map((h) => h.accion)).toEqual(["tomar", "resolver", "cerrar"]);
  });

  it("la vista previa no cambia el estado; otra empresa ni el supervisor ajeno la ven", async () => {
    const { novedad } = ok<{ novedad: Novedad }>(await registrar({}));
    expect(
      ok<{ novedad: Novedad }>(await cambiar(novedad.id, "tomar", { dryRun: true })).novedad.estado,
    ).toBe("en_atencion");
    expect(
      (await e.admin.libroNovedad.findUniqueOrThrow({ where: { id: novedad.id } })).estado,
    ).toBe("abierta");
    expect(
      codigo(
        await correr("B", "core.libro_novedades.cambiar_estado", {
          novedadId: novedad.id,
          accion: "tomar",
        }),
      ),
    ).toBe("NOT_FOUND");
    expect(
      codigo(await cambiar(novedad.id, "tomar", { rol: "supervisor", alcance: [inst.A2] })),
    ).toBe("NOT_FOUND");
    expect(
      codigo(await correr("B", "core.libro_novedades.obtener", { novedadId: novedad.id })),
    ).toBe("NOT_FOUND");
  });

  it("dos personas toman la misma novedad a la vez: una gana y queda un solo hecho", async () => {
    const { novedad } = ok<{ novedad: Novedad }>(await registrar({}));
    const r = await Promise.all([cambiar(novedad.id, "tomar"), cambiar(novedad.id, "tomar")]);
    expect(r.filter((x) => x.ok)).toHaveLength(1);
    expect(["CONFLICT", "UNPROCESSABLE"]).toContain(codigo(r.find((x) => !x.ok) ?? r[0]!));
    expect(await e.admin.libroNovedadHecho.count({ where: { novedadId: novedad.id } })).toBe(1);
  });

  it("la auditoría de las escrituras no copia el resumen, el detalle ni la nota", async () => {
    const { novedad } = ok<{ novedad: Novedad }>(await registrar({ detalle: "Detalle privado" }));
    await correr("A", "core.libro_novedades.cambiar_estado", {
      novedadId: novedad.id,
      accion: "tomar",
      nota: "Nota privada",
    });
    const ev = await e.admin.auditEvent.findMany({
      where: {
        tenantId: t.A,
        capability: {
          in: ["core.libro_novedades.registrar", "core.libro_novedades.cambiar_estado"],
        },
      },
    });
    expect(ev.length).toBeGreaterThan(0);
    expect(JSON.stringify(ev.map((x) => x.payload))).not.toMatch(
      /Portón abierto|Detalle privado|Nota privada/,
    );
  });
});
