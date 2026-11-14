// CAR-491 · Cobertura del mes en el Portal Cliente contra Postgres real (si hay DATABASE_URL_TEST): dos empresas y
// RLS con el rol sin BYPASSRLS. Prueba que el contacto ve la cobertura solo de las instalaciones de su acceso (ni de
// otra instalación de su cuenta que no tiene habilitada, ni de otra cuenta, ni de otra empresa), que la cuenta sale
// igual que la Pauta (una ausencia sin cubrir es un turno por cubrir), que sin el módulo Pauta o con el ajuste de la
// empresa apagado la sección queda pendiente y sin cifras, y que no trae nombres de personas.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { modulos } from "../../../modules/registry/src";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type Cob = { programados: number; cubiertos: number; porCubrir: number; porcentaje: number | null };
type Resumen = { instalaciones: { id: string; cobertura: Cob | null; secciones: { seccion: string; disponibilidad: string }[] }[] };

const MES = "2026-10"; // 22 días hábiles

describe.skipIf(!urlPropietario)("Portal Cliente · cobertura del mes (Postgres real)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const sufijo = randomUUID().slice(0, 8);
  const t = { a: "", b: "" };
  const inst = { x1: "", x2: "", y1: "", b1: "" };
  const u = { x: randomUUID(), y: randomUUID(), b: randomUUID() };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarModulos(modulos);
    for (const k of ["a", "b"] as const)
      t[k] = (await e.admin.tenant.create({ data: { slug: `pcc-${k}-${sufijo}`, nombre: k, vertical: "seguridad" } })).id;
    const cuenta = async (tenantId: string) => (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cuenta" } })).id;
    const [cx, cy, cb] = [await cuenta(t.a), await cuenta(t.a), await cuenta(t.b)];
    const instalacion = async (tenantId: string, cuentaId: string, nombre: string) =>
      (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre, estado: "activa" } })).id;
    inst.x1 = await instalacion(t.a, cx, "Planta");
    inst.x2 = await instalacion(t.a, cx, "Bodega");
    inst.y1 = await instalacion(t.a, cy, "Torre");
    inst.b1 = await instalacion(t.b, cb, "Otra");
    const puestoCon = async (tenantId: string, instalacionId: string, rut: string) => {
      const cargo = await e.admin.cargo.create({ data: { tenantId, nombre: `Guardia ${rut}` } });
      const patron = await e.admin.patronTurno.create({ data: { tenantId, nombre: `5x2 ${rut}`, clase: "semanal", diasTrabajo: 5, diasDescanso: 2, diasSemana: [1, 2, 3, 4, 5] } });
      const puesto = await e.admin.puesto.create({ data: { tenantId, instalacionId, cargoId: cargo.id, nombre: "Portería", diasTrabajo: 5, diasDescanso: 2, horaInicio: "08:00", horaFin: "17:00", patronId: patron.id } });
      const titular = await e.admin.persona.create({ data: { tenantId, nombres: "Titular", apellidos: "Secreto", rut, estado: "activa" } });
      await e.admin.seriePauta.create({ data: { tenantId, puestoId: puesto.id, patronId: patron.id, inicioCiclo: new Date("2026-10-01"), titularPersonaId: titular.id, vigenteDesde: new Date("2026-10-01") } });
      return { puesto: puesto.id, titular: titular.id };
    };
    const x1 = await puestoCon(t.a, inst.x1, "11.111.111-1");
    await puestoCon(t.a, inst.x2, "12.121.212-1");
    await puestoCon(t.a, inst.y1, "13.131.313-1");
    await puestoCon(t.b, inst.b1, "22.222.222-2");
    await e.admin.excepcionPauta.create({ data: { tenantId: t.a, puestoId: x1.puesto, fecha: new Date("2026-10-09"), tipo: "ausencia", motivo: "No llegó", personaId: x1.titular } });
    const acceso = async (tenantId: string, userId: string, cuentaId: string, instalacionId: string) => {
      await e.admin.user.create({ data: { id: userId, name: "c", email: `${userId}@prueba.cl` } });
      const m = await e.admin.membership.create({ data: { tenantId, userId, rol: "viewer", portales: ["cliente"] } });
      const a = await e.admin.accesoCliente.create({ data: { tenantId, membershipId: m.id, cuentaId } });
      await e.admin.accesoInstalacion.create({ data: { tenantId, accesoId: a.id, instalacionId } });
    };
    await acceso(t.a, u.x, cx, inst.x1);
    await acceso(t.a, u.y, cy, inst.y1);
    await acceso(t.b, u.b, cb, inst.b1);
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const ctx = (tenantId: string, userId: string, modulosActivos = ["portal_cliente", "pauta"]) =>
    mod.crearContexto({
      tenantId, actor: { tipo: "user", id: userId }, usuario: { id: userId, nombre: "c", email: `${userId}@prueba.cl`, platformRole: null }, rol: "viewer", permisosRol: ["portal_cliente:read"],
      portal: "cliente", portalesMembresia: ["cliente"], modulosActivos, medidor: { registrar: async () => undefined },
    });
  async function resumen(c: ReturnType<typeof ctx>): Promise<Resumen> {
    const r = await mod.executeCapability(c, "portal_cliente.resumen.leer", { mes: MES });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data as Resumen;
  }

  it("ve la cobertura solo de su instalación, con la ausencia como turno por cubrir y sin nombres", async () => {
    const r = await resumen(ctx(t.a, u.x));
    expect(r.instalaciones.map((i) => i.id)).toEqual([inst.x1]);
    expect(r.instalaciones[0]?.cobertura).toEqual({ programados: 22, cubiertos: 21, porCubrir: 1, porcentaje: 95.5 });
    expect(r.instalaciones[0]?.secciones.find((s) => s.seccion === "cobertura")?.disponibilidad).toBe("disponible");
    expect(JSON.stringify(r)).not.toMatch(/Titular|Secreto|11\.111/);
  });

  it("otra cuenta y otra empresa ven solo la suya", async () => {
    expect((await resumen(ctx(t.a, u.y))).instalaciones.map((i) => [i.id, i.cobertura?.programados])).toEqual([[inst.y1, 22]]);
    expect((await resumen(ctx(t.b, u.b))).instalaciones.map((i) => i.id)).toEqual([inst.b1]);
  });

  it("sin Pauta activa o con el ajuste de la empresa apagado, la sección queda pendiente y sin cifras", async () => {
    const sinPauta = await resumen(ctx(t.a, u.x, ["portal_cliente"]));
    expect(sinPauta.instalaciones[0]?.cobertura).toBeNull();
    expect(sinPauta.instalaciones[0]?.secciones.find((s) => s.seccion === "cobertura")?.disponibilidad).toBe("pendiente");
    const owner = mod.crearContexto({
      tenantId: t.a, actor: { tipo: "system" }, rol: "owner", portal: "erp", portalesMembresia: ["erp"],
      modulosActivos: ["portal_cliente", "pauta"], medidor: { registrar: async () => undefined },
    });
    const set = await mod.executeCapability(owner, "core.config.set", { modulo: "portal_cliente", clave: "seccion_cobertura", valor: false }, {});
    expect(set.ok, JSON.stringify(set)).toBe(true);
    expect((await resumen(ctx(t.a, u.x))).instalaciones[0]?.cobertura).toBeNull();
  });
});
