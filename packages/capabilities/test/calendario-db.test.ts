// Calendario contra Postgres real (si hay DATABASE_URL_TEST): dos empresas, RLS con el rol sin
// BYPASSRLS, y los feriados de plataforma (tenant_id nulo) sembrados por la migración. Prueba que un
// feriado del tenant A sobrescribe al nacional solo en A (CA2), que B no ve nada de A, que las filas
// de plataforma se leen desde el tenant pero opai_app no puede escribirlas, y que una escritura con
// un id de otro tenant cae en «no encontrado» (alcance por tenant, no por id).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type DiaVista = { id: string; fecha: string; fuente: string; nombre: string; editable: boolean };

describe.skipIf(!urlPropietario)("calendario en base real: dos empresas y filas de plataforma", () => {
  let e: Entorno;
  let mod: Capacidades;
  const t = { a: "", b: "" };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const nuevo = async (p: string) =>
      (await e.admin.tenant.create({ data: { slug: `${p}-${randomUUID().slice(0, 8)}`, nombre: p, vertical: "seguridad" } })).id;
    t.a = await nuevo("cal-a");
    t.b = await nuevo("cal-b");
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "system" },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });

  async function dato<T>(tenantId: string, id: string, input: unknown, opciones = {}): Promise<T> {
    const r = await mod.executeCapability(ctx(tenantId), id, input, opciones);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  async function codigo(tenantId: string, id: string, input: unknown): Promise<string> {
    const r = await mod.executeCapability(ctx(tenantId), id, input, {});
    return r.ok ? "OK" : r.error.code;
  }

  it("el tenant lee los feriados nacionales de plataforma (seed de la migración)", async () => {
    const dias = await dato<DiaVista[]>(t.a, "core.calendario.listar", { anio: 2026 });
    expect(dias.length).toBe(10); // 10 feriados nacionales fijos de 2026
    const dieciocho = dias.find((d) => d.fecha === "2026-09-18");
    expect(dieciocho).toMatchObject({ fuente: "nacional", editable: false });
  });

  it("un feriado del tenant A sobrescribe al nacional solo en A (CA2)", async () => {
    await dato<DiaVista>(t.a, "core.calendario.crear_feriado", {
      fecha: "2026-09-18",
      nombre: "Aniversario Gard",
    });
    const enA = await dato<DiaVista[]>(t.a, "core.calendario.listar", { anio: 2026 });
    const a18 = enA.find((d) => d.fecha === "2026-09-18");
    expect(a18).toMatchObject({ fuente: "tenant", nombre: "Aniversario Gard", editable: true });
    expect(enA.length).toBe(10); // sigue habiendo 10: el del tenant reemplaza al nacional en esa fecha

    const enB = await dato<DiaVista[]>(t.b, "core.calendario.listar", { anio: 2026 });
    const b18 = enB.find((d) => d.fecha === "2026-09-18");
    expect(b18).toMatchObject({ fuente: "nacional", editable: false }); // B no ve el día de A
    expect(enB.some((d) => d.nombre === "Aniversario Gard")).toBe(false);
  });

  it("una escritura con el id de un feriado de otro tenant cae en NOT_FOUND (alcance por tenant)", async () => {
    const creadoA = await dato<DiaVista>(t.a, "core.calendario.crear_feriado", {
      fecha: "2026-11-20",
      nombre: "Día propio de A",
    });
    expect(await codigo(t.b, "core.calendario.actualizar", { id: creadoA.id, nombre: "Robo" })).toBe("NOT_FOUND");
    expect(await codigo(t.b, "core.calendario.archivar", { id: creadoA.id })).toBe("NOT_FOUND");
    // Y A sigue viéndolo intacto.
    const enA = await dato<DiaVista[]>(t.a, "core.calendario.listar", { anio: 2026 });
    expect(enA.find((d) => d.fecha === "2026-11-20")?.nombre).toBe("Día propio de A");
  });

  it("opai_app no puede escribir una fila de plataforma (tenant_id nulo): RLS WITH CHECK", async () => {
    await expect(
      e.forTenant(t.a).diaCalendario.create({
        data: {
          tenantId: null,
          fecha: new Date("2026-12-31T00:00:00.000Z"),
          tipo: "feriado",
          nombre: "Intento de plataforma",
          irrenunciable: false,
          region: null,
          instalacionId: null,
          fuente: "nacional",
        },
      }),
    ).rejects.toThrow();
  });
});
