// Calendario contra Postgres real (si hay DATABASE_URL_TEST): dos empresas, RLS con el rol sin
// BYPASSRLS. Desde la corrección de datos de CAR-79 los feriados legales se CALCULAN por regla (no se
// siembran) y la tabla core.dias_calendario queda para feriados por ley puntual (plataforma) y los
// días propios del tenant. Prueba que el tenant ve los 16 legales calculados de cualquier año, que un
// feriado del tenant sobrescribe al legal solo en A (CA2), que B no ve nada de A, que las 20 filas de
// plataforma de fecha fija 2026–2027 ya no existen (migración 20261030130000), que opai_app no puede
// escribir/editar/borrar filas de plataforma, y que una escritura con un id —o una instalación— de
// otro tenant cae en «no encontrado» (alcance por tenant, nunca por id).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type DiaVista = {
  id: string;
  fecha: string;
  fuente: string;
  nombre: string;
  editable: boolean;
  automatico: boolean;
};

describe.skipIf(!urlPropietario)("calendario en base real: feriados calculados y filas de plataforma", () => {
  let e: Entorno;
  let mod: Capacidades;
  const t = { a: "", b: "" };
  let instB = "";
  // Fila de plataforma del test de RLS: fecha lejana (fuera de los años que lista el test) y se borra
  // en afterAll para no dejar residuo en la base compartida (unique por fecha/región de plataforma).
  let filaPlataforma: string | undefined;

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const nuevo = async (p: string) =>
      (await e.admin.tenant.create({ data: { slug: `${p}-${randomUUID().slice(0, 8)}`, nombre: p, vertical: "seguridad" } })).id;
    t.a = await nuevo("cal-a");
    t.b = await nuevo("cal-b");
    const cuentaB = await e.admin.cuenta.create({ data: { tenantId: t.b, nombre: "B" } });
    instB = (await e.admin.instalacion.create({ data: { tenantId: t.b, cuentaId: cuentaB.id, nombre: "Inst B" } })).id;
  });

  afterAll(async () => {
    if (filaPlataforma) await e.admin.diaCalendario.delete({ where: { id: filaPlataforma } }).catch(() => undefined);
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

  it("el tenant ve los 16 feriados legales calculados de 2026 (ninguno editable, todos automáticos)", async () => {
    const dias = await dato<DiaVista[]>(t.a, "core.calendario.listar", { anio: 2026 });
    expect(dias.length).toBe(16);
    const dieciocho = dias.find((d) => d.fecha === "2026-09-18");
    expect(dieciocho).toMatchObject({ fuente: "nacional", editable: false, automatico: true });
    // Semana Santa 2026, que el seed de fecha fija no tenía, ahora sale del cálculo.
    expect(dias.some((d) => d.fecha === "2026-04-03" && d.nombre === "Viernes Santo")).toBe(true);
  });

  it("cualquier año muestra sus feriados legales, aunque no haya filas en la tabla (2031)", async () => {
    const dias = await dato<DiaVista[]>(t.a, "core.calendario.listar", { anio: 2031 });
    expect(dias.length).toBe(16);
    expect(dias.every((d) => d.automatico && !d.editable)).toBe(true);
  });

  it("ya no quedan las 20 filas de plataforma de fecha fija 2026–2027 (migración 20261030130000)", async () => {
    const r = await e.admin.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM "core"."dias_calendario"
      WHERE tenant_id IS NULL AND region IS NULL AND fuente = 'nacional'
        AND fecha >= DATE '2026-01-01' AND fecha < DATE '2028-01-01'`;
    expect(Number(r[0]?.n)).toBe(0);
  });

  it("un feriado del tenant A sobrescribe al legal solo en A (CA2), sin duplicar la fecha", async () => {
    await dato<DiaVista>(t.a, "core.calendario.crear_feriado", {
      fecha: "2026-09-18",
      nombre: "Aniversario Gard",
    });
    const enA = await dato<DiaVista[]>(t.a, "core.calendario.listar", { anio: 2026 });
    const a18 = enA.find((d) => d.fecha === "2026-09-18");
    expect(a18).toMatchObject({ fuente: "tenant", nombre: "Aniversario Gard", editable: true, automatico: false });
    expect(enA.length).toBe(16); // sigue habiendo 16: el del tenant reemplaza al legal en esa fecha

    const enB = await dato<DiaVista[]>(t.b, "core.calendario.listar", { anio: 2026 });
    const b18 = enB.find((d) => d.fecha === "2026-09-18");
    expect(b18).toMatchObject({ fuente: "nacional", editable: false, automatico: true });
    expect(enB.some((d) => d.nombre === "Aniversario Gard")).toBe(false);
  });

  it("una escritura con el id de un feriado de otro tenant cae en NOT_FOUND (alcance por tenant)", async () => {
    const creadoA = await dato<DiaVista>(t.a, "core.calendario.crear_feriado", {
      fecha: "2026-11-20",
      nombre: "Día propio de A",
    });
    expect(await codigo(t.b, "core.calendario.actualizar", { id: creadoA.id, nombre: "Robo" })).toBe("NOT_FOUND");
    expect(await codigo(t.b, "core.calendario.archivar", { id: creadoA.id })).toBe("NOT_FOUND");
    const enA = await dato<DiaVista[]>(t.a, "core.calendario.listar", { anio: 2026 });
    expect(enA.find((d) => d.fecha === "2026-11-20")?.nombre).toBe("Día propio de A");
  });

  it("crear un feriado con la instalación de otro tenant cae en NOT_FOUND (sin enumeración)", async () => {
    expect(
      await codigo(t.a, "core.calendario.crear_feriado", {
        fecha: "2026-11-21",
        nombre: "Con instalación ajena",
        instalacionId: instB,
      }),
    ).toBe("NOT_FOUND");
  });

  it("opai_app no puede INSERT/UPDATE/DELETE una fila de plataforma (tenant_id nulo): RLS", async () => {
    // La fila la crea el propietario (dueño de la tabla), como haría la plataforma por migración.
    const fila = await e.admin.diaCalendario.create({
      data: {
        tenantId: null,
        fecha: new Date("2099-07-15T00:00:00.000Z"),
        tipo: "feriado",
        nombre: "Elecciones (ley puntual)",
        irrenunciable: false,
        region: null,
        instalacionId: null,
        fuente: "nacional",
      },
    });
    filaPlataforma = fila.id;
    await expect(
      e.forTenant(t.a).diaCalendario.create({
        data: {
          tenantId: null,
          fecha: new Date("2099-07-14T00:00:00.000Z"),
          tipo: "feriado",
          nombre: "Intento de plataforma",
          irrenunciable: false,
          region: null,
          instalacionId: null,
          fuente: "nacional",
        },
      }),
    ).rejects.toThrow();
    // UPDATE y DELETE de opai_app sobre la fila de plataforma afectan 0 filas (RLS la oculta a escritura).
    const upd = await e.forTenant(t.a).diaCalendario.updateMany({
      where: { id: fila.id },
      data: { nombre: "Editada por el tenant" },
    });
    expect(upd.count).toBe(0);
    const del = await e.forTenant(t.a).diaCalendario.deleteMany({ where: { id: fila.id } });
    expect(del.count).toBe(0);
    // El propietario confirma que sigue intacta.
    const sigue = await e.admin.diaCalendario.findUnique({ where: { id: fila.id } });
    expect(sigue?.nombre).toBe("Elecciones (ley puntual)");
  });
});
