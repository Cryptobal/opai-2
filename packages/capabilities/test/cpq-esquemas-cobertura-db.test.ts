// CAR-212 · esquemas de cobertura contra Postgres real con un rol sin BYPASSRLS: una empresa no ve ni aplica
// los esquemas de otra, y aplicar uno crea todos los puestos de una vez con el ciclo y el horario del tramo.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades as capacidadesCpq } from "../../../modules/cpq/capabilities";
import { sembrarComercial } from "@opai/db";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { registrarModuloComercial } from "./comercial-modulo";

type Res<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

describe.skipIf(!urlPropietario)("cpq · esquemas de cobertura en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  const usuario = randomUUID();
  const run = <T>(tenantId: string, id: string, input: unknown, dryRun = false) =>
    mod.executeCapability(
      mod.crearContexto({
        tenantId,
        actor: { tipo: "user", id: usuario },
        usuario: { id: usuario, nombre: "Ana", email: "ana@cpq.test", platformRole: null },
        portal: "erp",
        portalesMembresia: ["erp"],
        rol: "owner",
        modulosActivos: ["comercial", "cpq"],
        medidor,
      }),
      id,
      input,
      { dryRun },
    ) as Promise<Res<T>>;

  async function escenario(nombre: string) {
    const t = await e.admin.tenant.create({ data: { slug: `esq-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" } });
    const patron = await e.admin.patronTurno.create({ data: { tenantId: t.id, nombre: "4x4", clase: "ciclico", diasTrabajo: 4, diasDescanso: 4 } });
    await sembrarComercial(e.admin.$extends({}), t.id);
    const sis = async <T>(id: string, input: unknown) => {
      const r = (await mod.executeCapability(
        mod.crearContexto({ tenantId: t.id, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["comercial", "cpq"], medidor }),
        id,
        input,
      )) as Res<T>;
      if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
      return r.data;
    };
    const cuentaId = (await sis<{ id: string }>("core.cuentas.create", { nombre })).id;
    const negocio = await sis<{ id: string }>("comercial.negocios.create", { cuentaId, titulo: `Neg ${nombre}` });
    const cot = await e.admin.cpqCotizacion.create({
      data: { tenantId: t.id, negocioId: negocio.id, codigo: `CPQ-${t.id.slice(0, 6)}-1`, titulo: "Cobertura", vigente: true, creadoPorId: usuario },
    });
    const version = await e.admin.cpqVersion.create({ data: { tenantId: t.id, cotizacionId: cot.id, numero: 1, estado: "borrador", creadoPorId: usuario } });
    const seccion = await e.admin.cpqSeccion.create({ data: { tenantId: t.id, versionId: version.id, nombre: "Planta" } });
    return { tenantId: t.id, patronId: patron.id, seccionId: seccion.id };
  }
  const tramos = (patronId: string) => [
    { nombre: "Día", patronId, horaInicio: "08:00", horaFin: "20:00", diasSemana: [1, 2, 3, 4, 5, 6, 7], posiciones: 2 },
    { nombre: "Noche", patronId, horaInicio: "20:00", horaFin: "08:00", diasSemana: [1, 2, 3, 4, 5, 6, 7], posiciones: 2 },
  ];

  let a: Awaited<ReturnType<typeof escenario>>;
  let b: Awaited<ReturnType<typeof escenario>>;
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial, ...capacidadesCpq]);
    registrarModuloComercial();
    await e.admin.user.create({ data: { id: usuario, email: `u-${usuario.slice(0, 8)}@cpq.test`, name: "Ana", emailVerified: true } });
    a = await escenario("Alfa");
    b = await escenario("Beta");
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("guarda el 24/7 en A; B no lo ve, no lo aplica y no puede usar el ciclo de A", async () => {
    const g = await run<{ id: string; totalPuestos: number }>(a.tenantId, "cpq.esquemas_cobertura.guardar", { nombre: "24/7", tramos: tramos(a.patronId) });
    expect(g).toMatchObject({ ok: true, data: { totalPuestos: 4 } });
    const esquemaId = g.ok ? g.data.id : "";
    const deA = await run<{ items: { nombre: string }[] }>(a.tenantId, "cpq.esquemas_cobertura.list", {});
    expect(deA.ok && deA.data.items.map((i) => i.nombre)).toEqual(["24/7"]);
    const deB = await run<{ items: unknown[] }>(b.tenantId, "cpq.esquemas_cobertura.list", {});
    expect(deB.ok && deB.data.items).toEqual([]);
    expect((await run(b.tenantId, "cpq.lineas.agregar_esquema", { seccionId: b.seccionId, esquemaId })).ok).toBe(false);
    expect((await run(b.tenantId, "cpq.esquemas_cobertura.guardar", { nombre: "Robado", tramos: tramos(a.patronId) })).ok).toBe(false);
  });

  it("aplicar el esquema crea los 2 tramos en la sección y el dryRun no escribe", async () => {
    const esquemaId = (await e.admin.cpqEsquemaCobertura.findFirstOrThrow({ where: { tenantId: a.tenantId } })).id;
    await run(a.tenantId, "cpq.lineas.agregar_esquema", { seccionId: a.seccionId, esquemaId, sueldoBaseClp: 650_000 }, true);
    expect(await e.admin.cpqLinea.count({ where: { tenantId: a.tenantId } })).toBe(0);
    const r = await run<{ ids: string[] }>(a.tenantId, "cpq.lineas.agregar_esquema", { seccionId: a.seccionId, esquemaId, sueldoBaseClp: 650_000 });
    expect(r.ok && r.data.ids).toHaveLength(2);
    const lineas = await e.admin.cpqLinea.findMany({ where: { tenantId: a.tenantId }, orderBy: { orden: "asc" } });
    expect(lineas.map((l) => [l.nombre, l.posiciones, l.patron, l.horaInicio])).toEqual([
      ["24/7 · Día", 2, "4x4", "08:00"],
      ["24/7 · Noche", 2, "4x4", "20:00"],
    ]);
  });

  it("los puestos del esquema reciben los costos predefinidos por puesto de la empresa (CAR-213)", async () => {
    const esquemaId = (await e.admin.cpqEsquemaCobertura.findFirstOrThrow({ where: { tenantId: a.tenantId } })).id;
    await e.admin.cpqCostoPredefinido.create({ data: { tenantId: a.tenantId, categoria: "uniformes", montoClp: 15_000, alcance: "por_puesto" } });
    await e.admin.cpqCostoPredefinido.create({ data: { tenantId: a.tenantId, categoria: "examenes", montoClp: 40_000, alcance: "global" } });
    const previo = await e.admin.cpqCostoCategoria.count({ where: { tenantId: a.tenantId } });
    // La vista previa no escribe ningún costo.
    await run(a.tenantId, "cpq.lineas.agregar_esquema", { seccionId: a.seccionId, esquemaId }, true);
    expect(await e.admin.cpqCostoCategoria.count({ where: { tenantId: a.tenantId } })).toBe(previo);
    const r = await run<{ ids: string[] }>(a.tenantId, "cpq.lineas.agregar_esquema", { seccionId: a.seccionId, esquemaId });
    const ids = r.ok ? r.data.ids : [];
    expect(ids).toHaveLength(2);
    const costos = await e.admin.cpqCostoCategoria.findMany({ where: { tenantId: a.tenantId } });
    // Un "uniformes" por cada puesto nuevo; el global ("examenes") no se carga al agregar puestos sueltos.
    expect(costos.filter((c) => c.categoria === "uniformes").map((c) => c.lineaId).sort()).toEqual([...ids].sort());
    expect(costos.some((c) => c.categoria === "examenes")).toBe(false);
    expect(costos.find((c) => c.categoria === "uniformes")?.montoClp).toBe(15_000);
  });
});
