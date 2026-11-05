// CAR-78 · B2: dispositivos de terreno contra Postgres real. Código de 6 caracteres que vence y se usa una
// vez, emparejamiento atómico, revocación inmediata y aislamiento entre empresas (criterio 5 del frente).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { dispositivoPorToken, emparejarDispositivo } from "@opai/db";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;

describe.skipIf(!urlPropietario)("dispositivos de terreno en base real (CAR-78 B2)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const medidor = { registrar: async () => undefined };
  const servicios = { urlBase: "https://test.opai.cl" };
  const t = { A: "", B: "" };
  const inst = { A: "", A2: "", B: "" };

  const ctx = (tenantId: string, alcance: { instalaciones: string[] } | null = null) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: alcance ? "supervisor" : "owner",
      alcance,
      medidor,
      servicios,
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) =>
    mod.executeCapability(c, id, input, o);
  const dato = async <T>(c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) => {
    const r = await run(c, id, input, o);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
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
          data: { slug: `disp-${k.toLowerCase()}-${sufijo}`, nombre: k, vertical: "seguridad" },
        })
      ).id;
    }
    for (const [k, tenant, nombre] of [
      ["A", t.A, "Planta A"],
      ["A2", t.A, "Bodega A"],
      ["B", t.B, "Planta B"],
    ] as const) {
      const cuenta = await dato<{ id: string }>(ctx(tenant), "core.cuentas.create", {
        nombre: `Cliente ${nombre}`,
      });
      inst[k] = (
        await dato<{ id: string }>(ctx(tenant), "core.instalaciones.create", {
          cuentaId: cuenta.id,
          nombre,
        })
      ).id;
    }
  }, 120_000);

  afterAll(async () => {
    await e?.cerrar?.();
  });

  async function codigoNuevo(tenant = t.A, instalacionId = inst.A) {
    const r = await dato<{ codigo: string; venceEn: string; url: string }>(
      ctx(tenant),
      "core.dispositivos.generar_codigo",
      { instalacionId },
    );
    return r;
  }

  it("la vista previa no crea el código; el real lo guarda solo como HMAC y vence en 10 minutos", async () => {
    const previa = await run(
      ctx(t.A),
      "core.dispositivos.generar_codigo",
      { instalacionId: inst.A },
      { dryRun: true },
    );
    expect(previa.ok && (previa.data as { codigo: string | null }).codigo).toBeNull();
    expect(await e.admin.codigoEmparejamiento.count({ where: { tenantId: t.A } })).toBe(0);
    const r = await codigoNuevo();
    expect(r.codigo).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    expect(r.url).toBe(`https://test.opai.cl/terreno/emparejar?c=${r.codigo}`);
    const fila = await e.admin.codigoEmparejamiento.findFirstOrThrow({ where: { tenantId: t.A } });
    expect(fila.codigoHash).not.toContain(r.codigo);
    const min = (fila.venceEn.getTime() - fila.createdAt.getTime()) / 60_000;
    expect(min).toBeGreaterThan(9.9);
    expect(min).toBeLessThan(10.1);
    // Generar otro invalida el anterior sin usar.
    const otro = await codigoNuevo();
    expect(await emparejarDispositivo(r.codigo, "1.0")).toBeNull();
    expect(await emparejarDispositivo(otro.codigo, "1.0")).not.toBeNull();
  });

  it("empareja una sola vez, con identificador correlativo, y reconoce al dispositivo por su token", async () => {
    const { codigo } = await codigoNuevo();
    const d = await emparejarDispositivo(
      codigo.toLowerCase().replace(/^(...)/, "$1 "),
      "terreno-1.2",
    );
    expect(d).toMatchObject({ tenantId: t.A, instalacionId: inst.A });
    expect(d?.identificador).toMatch(/^DSP-\d{4}$/);
    // Un solo uso.
    expect(await emparejarDispositivo(codigo, "1.0")).toBeNull();
    const r = await dispositivoPorToken(d?.token ?? "", "terreno-1.3");
    expect(r).toMatchObject({
      estado: "activo",
      dispositivoId: d?.dispositivoId,
      instalacionId: inst.A,
    });
    const fila = await e.admin.dispositivo.findUniqueOrThrow({
      where: { id: d?.dispositivoId ?? "" },
    });
    expect(fila.tokenHash).not.toContain(d?.token ?? "x");
    expect(fila.versionApp).toBe("terreno-1.3");
    expect(fila.ultimoContacto).not.toBeNull();
    // Un segundo dispositivo recibe el siguiente identificador.
    const d2 = await emparejarDispositivo((await codigoNuevo()).codigo, null);
    expect(Number(d2?.identificador.slice(4))).toBe(Number(d?.identificador.slice(4)) + 1);
  });

  it("un código vencido, inexistente o mal escrito no empareja", async () => {
    const { codigo } = await codigoNuevo();
    await e.admin.codigoEmparejamiento.updateMany({
      where: { tenantId: t.A, usadoEn: null },
      data: { venceEn: new Date(Date.now() - 1000) },
    });
    expect(await emparejarDispositivo(codigo, null)).toBeNull();
    for (const malo of ["", "ABC", "ZZZZZZ", "AB!DEF", "0O1IL2"]) {
      expect(await emparejarDispositivo(malo, null)).toBeNull();
    }
    expect(
      await dispositivoPorToken("token-que-no-existe-token-que-no-existe-0000", null),
    ).toBeNull();
  });

  it("revocar corta el acceso en la siguiente petición y queda en la lista", async () => {
    const d = await emparejarDispositivo((await codigoNuevo(t.A, inst.A2)).codigo, null);
    const id = d?.dispositivoId ?? "";
    const previa = await run(
      ctx(t.A),
      "core.dispositivos.revocar",
      { dispositivoId: id },
      { dryRun: true },
    );
    expect(previa.ok).toBe(true);
    expect((await dispositivoPorToken(d?.token ?? "", null))?.estado).toBe("activo");
    const rev = await run(ctx(t.A), "core.dispositivos.revocar", { dispositivoId: id });
    expect(rev.ok).toBe(true);
    const tras = await dispositivoPorToken(d?.token ?? "", null);
    expect(tras?.estado).toBe("revocado");
    expect(tras?.revocadoEn).not.toBeNull();
    const lista = await dato<{ items: { id: string; estado: string }[] }>(
      ctx(t.A),
      "core.dispositivos.listar",
      { instalacionId: inst.A2 },
    );
    expect(lista.items.find((x) => x.id === id)?.estado).toBe("revocado");
    expect(JSON.stringify(lista)).not.toContain(d?.token ?? "x");
    // Revocar dos veces es un error de negocio.
    expect((await run(ctx(t.A), "core.dispositivos.revocar", { dispositivoId: id })).ok).toBe(
      false,
    );
  });

  it("una empresa no ve, lista ni revoca los dispositivos de otra (criterio 5)", async () => {
    const d = await emparejarDispositivo((await codigoNuevo()).codigo, null);
    const id = d?.dispositivoId ?? "";
    for (const [cap, input] of [
      ["core.dispositivos.listar", { instalacionId: inst.A }],
      ["core.dispositivos.estado", { dispositivoId: id }],
      ["core.dispositivos.revocar", { dispositivoId: id }],
      ["core.dispositivos.generar_codigo", { instalacionId: inst.A }],
    ] as const) {
      const r = await run(ctx(t.B), cap, input);
      expect(r.ok).toBe(false);
      expect(!r.ok && r.error.code).toBe("NOT_FOUND");
    }
    // El dispositivo de A queda ligado a A: su token resuelve a A y nunca a B.
    expect((await dispositivoPorToken(d?.token ?? "", null))?.tenantId).toBe(t.A);
    // Y el listado de B no contiene dispositivos de A.
    const deB = await dato<{ items: unknown[] }>(ctx(t.B), "core.dispositivos.listar", {
      instalacionId: inst.B,
    });
    expect(deB.items).toHaveLength(0);
  });

  it("el alcance del supervisor se aplica en la consulta", async () => {
    const sup = ctx(t.A, { instalaciones: [inst.A2] });
    expect((await run(sup, "core.dispositivos.listar", { instalacionId: inst.A })).ok).toBe(false);
    expect((await run(sup, "core.dispositivos.listar", { instalacionId: inst.A2 })).ok).toBe(true);
  });
});
