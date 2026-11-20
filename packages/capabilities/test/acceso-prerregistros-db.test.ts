// CAR-478: prerregistro de visitas con invitación QR contra Postgres real (rol sin BYPASSRLS, dos empresas).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { diaEnZona } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const CLAVE_PRUEBA = "clave-solo-para-pruebas-no-es-un-secreto-real-0123456789";
type K = "A" | "B";
type Prerregistro = {
  id: string;
  cancelado: boolean;
  visitantes: { id: string; nombre: string; documento: string }[];
  dias: { dia: string; estado: string }[];
};
const masDias = (dia: string, n: number) =>
  new Date(Date.parse(`${dia}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!urlPropietario)("prerregistros de visitas en base real (CAR-478)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const inst = { A: "", B: "" };
  const hoy = diaEnZona(new Date(), "America/Santiago");
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
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) =>
    mod.executeCapability(c, id, input, o);
  const ok = async <T>(c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) => {
    const r = await run(c, id, input, o);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  };
  const crear = (extra: Record<string, unknown> = {}) =>
    ok<Prerregistro>(ctx("A"), "acceso.prerregistros.crear", {
      instalacionId: inst.A,
      visitantes: [
        { nombre: "Camila Herrera", documento: { tipo: "run", numero: "12.345.678-5" } },
      ],
      desde: hoy,
      hasta: masDias(hoy, 2),
      desdeMin: 540,
      hastaMin: 780,
      anfitrion: "Marcela Rojas",
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
          data: {
            slug: `pr-${k.toLowerCase()}-${s}`,
            nombre: `Empresa ${k}`,
            vertical: "seguridad",
          },
        })
      ).id;
      const cuentaId = (await e.admin.cuenta.create({ data: { tenantId: t[k], nombre: `C ${k}` } }))
        .id;
      inst[k] = (
        await e.admin.instalacion.create({
          data: { tenantId: t[k], cuentaId, nombre: `Planta ${k}` },
        })
      ).id;
    }
  }, 120_000);
  afterAll(async () => {
    vi.unstubAllEnvs();
    await e?.cerrar?.();
  });

  it("crea un prerregistro de tres días con el documento enmascarado, visible solo en su empresa", async () => {
    const p = await crear();
    expect(p.dias.map((d) => d.estado)).toEqual(["pendiente", "pendiente", "pendiente"]);
    expect(p.visitantes[0]?.documento).not.toContain("12345678");
    const fila = await e.admin.prerregistroVisitante.findFirstOrThrow({
      where: { prerregistroId: p.id },
    });
    expect(JSON.stringify(fila)).not.toContain("12345678");
    const delDia = await ok<{ items: Prerregistro[] }>(ctx("A"), "acceso.prerregistros.listar", {
      dia: masDias(hoy, 1),
    });
    expect(delDia.items.map((x) => x.id)).toContain(p.id);
    const deB = await ok<{ items: Prerregistro[] }>(ctx("B"), "acceso.prerregistros.listar", {});
    expect(deB.items.map((x) => x.id)).not.toContain(p.id);
    const visitanteId = p.visitantes[0]?.id ?? "";
    expect(
      (await run(ctx("B"), "acceso.prerregistros.invitacion", { visitanteId, dia: hoy })).ok,
    ).toBe(false);
  });

  it("la invitación trae un código por día, estable, y no existe fuera del rango", async () => {
    const p = await crear();
    const visitanteId = p.visitantes[0]?.id ?? "";
    const a = await ok<{ codigo: string; empresa: string }>(
      ctx("A"),
      "acceso.prerregistros.invitacion",
      { visitanteId, dia: hoy },
    );
    const b = await ok<{ codigo: string }>(ctx("A"), "acceso.prerregistros.invitacion", {
      visitanteId,
      dia: hoy,
    });
    const c = await ok<{ codigo: string }>(ctx("A"), "acceso.prerregistros.invitacion", {
      visitanteId,
      dia: masDias(hoy, 1),
    });
    expect(a.codigo).toMatch(/^A1\.v1\./);
    expect(a.codigo).toBe(b.codigo);
    expect(c.codigo).not.toBe(a.codigo);
    expect(a.empresa).toBe("Empresa A");
    const fuera = await run(ctx("A"), "acceso.prerregistros.invitacion", {
      visitanteId,
      dia: masDias(hoy, 3),
    });
    expect(fuera.ok).toBe(false);
  });

  it("rechaza rangos de más de 30 días, fechas pasadas, horario incompleto y visitantes repetidos", async () => {
    const base = { instalacionId: inst.A, anfitrion: "Ana", desde: hoy };
    const v = { nombre: "Uno", documento: { tipo: "run", numero: "12.345.678-5" } };
    const casos = [
      { ...base, visitantes: [v], hasta: masDias(hoy, 30) },
      { ...base, visitantes: [v], desde: masDias(hoy, -1) },
      { ...base, visitantes: [v], desdeMin: 540 },
      { ...base, visitantes: [v, { ...v, nombre: "Dos" }] },
      { ...base, visitantes: [v], desde: "2026-02-31" },
    ];
    for (const c of casos)
      expect((await run(ctx("A"), "acceso.prerregistros.crear", c)).ok).toBe(false);
  });

  it("vista previa sin guardar; cancelar deja los días cancelados y sin invitación", async () => {
    const antes = await e.admin.prerregistro.count({ where: { tenantId: t.A } });
    await ok(
      ctx("A"),
      "acceso.prerregistros.crear",
      {
        instalacionId: inst.A,
        visitantes: [
          { nombre: "Previa", documento: { tipo: "pasaporte", numero: "X1234567", pais: "AR" } },
        ],
        desde: hoy,
        anfitrion: "Ana",
      },
      { dryRun: true },
    );
    expect(await e.admin.prerregistro.count({ where: { tenantId: t.A } })).toBe(antes);
    const p = await crear();
    await ok(ctx("A"), "acceso.prerregistros.cancelar", { id: p.id });
    expect((await run(ctx("A"), "acceso.prerregistros.cancelar", { id: p.id })).ok).toBe(false);
    const l = await ok<{ items: Prerregistro[] }>(ctx("A"), "acceso.prerregistros.listar", {});
    expect(l.items.find((x) => x.id === p.id)?.dias.every((d) => d.estado === "cancelado")).toBe(
      true,
    );
    const visitanteId = p.visitantes[0]?.id ?? "";
    expect(
      (await run(ctx("A"), "acceso.prerregistros.invitacion", { visitanteId, dia: hoy })).ok,
    ).toBe(false);
  });

  it("solo quien lo creó o quien gestiona registros puede cancelar", async () => {
    const p = await crear();
    const otro = ctx("A", {
      actor: { tipo: "user", id: randomUUID() },
      rol: null,
      permisosRol: ["acceso:read", "acceso:prerregistros.create"],
    });
    expect((await run(otro, "acceso.prerregistros.cancelar", { id: p.id })).ok).toBe(false);
    expect((await run(ctx("B"), "acceso.prerregistros.cancelar", { id: p.id })).ok).toBe(false);
  });
});
