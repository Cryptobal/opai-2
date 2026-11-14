// CAR-462 · «Mis turnos» del portal del trabajador contra Postgres real (si hay DATABASE_URL_TEST): dos empresas y RLS
// con el rol sin BYPASSRLS. Prueba que el trabajador ve solo sus turnos vigentes (no los de un compañero ni los de otra
// empresa), que la ventana de días y la paginación por cursor funcionan y que sin ficha propia responde NOT_FOUND.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { manifest } from "../../../modules/portal_trabajador/manifest";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type Turno = { id: string; fecha: string; inicio: string; instalacion: { nombre: string }; puesto: string | null };
type Pagina = { personaId: string; desde: string; hasta: string; items: Turno[]; siguiente: string | null };

describe.skipIf(!urlPropietario)("portal trabajador · mis turnos (Postgres real)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const t = { a: "", b: "" };
  const u = { a1: "", a2: "", b1: "", sinPersona: "" };
  const p = { a1: "", a2: "", b1: "" };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...manifest.capacidades]);
    const sufijo = randomUUID().slice(0, 8);
    for (const k of ["a", "b"] as const)
      t[k] = (await e.admin.tenant.create({ data: { slug: `mt-${k}-${sufijo}`, nombre: k, vertical: "seguridad" } })).id;
    for (const k of ["a1", "a2", "b1", "sinPersona"] as const) {
      u[k] = randomUUID();
      await e.admin.user.create({ data: { id: u[k], name: k, email: `${k}-${sufijo}@prueba.cl` } });
    }
    for (const [tenantId, userId] of [[t.a, u.a1], [t.a, u.a2], [t.b, u.b1], [t.a, u.sinPersona]] as const)
      await e.admin.membership.create({ data: { tenantId, userId, rol: "viewer", portales: ["trabajador"], estado: "activa" } });
    const persona = (tenantId: string, usuarioId: string, rut: string) =>
      e.admin.persona.create({ data: { tenantId, usuarioId, rut, nombres: rut, apellidos: "Prueba" } }).then((x) => x.id);
    p.a1 = await persona(t.a, u.a1, "11111111-1");
    p.a2 = await persona(t.a, u.a2, "22222222-2");
    p.b1 = await persona(t.b, u.b1, "33333333-3");
    const instalacion = async (tenantId: string, nombre: string) => {
      const cuentaId = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cuenta" } })).id;
      return (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre } })).id;
    };
    const iA = await instalacion(t.a, "Planta Norte");
    const iB = await instalacion(t.b, "Bodega Sur");
    const turno = (tenantId: string, personaId: string, instalacionId: string, dia: string, vigente = true) =>
      e.admin.turnoEsperado.create({
        data: {
          tenantId, personaId, instalacionId, origen: "manual", vigente,
          fecha: new Date(`${dia}T00:00:00Z`),
          inicio: new Date(`${dia}T23:00:00Z`),
          fin: new Date(Date.parse(`${dia}T23:00:00Z`) + 12 * 3_600_000),
        },
      });
    for (const d of ["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-20"]) await turno(t.a, p.a1, iA, d);
    await turno(t.a, p.a1, iA, "2026-12-04", false); // anulado: no se ve
    await turno(t.a, p.a2, iA, "2026-12-01"); // de un compañero
    await turno(t.b, p.b1, iB, "2026-12-01"); // de otra empresa
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const correr = (tenantId: string, usuarioId: string, input: unknown) =>
    mod.executeCapability(
      mod.crearContexto({
        tenantId, actor: { tipo: "user", id: usuarioId }, portal: "trabajador", portalesMembresia: ["trabajador"],
        modulosActivos: ["portal_trabajador"], rol: "viewer", medidor: { registrar: async () => undefined },
      }),
      "portal_trabajador.mis_turnos.listar",
      input,
    );
  async function pagina(tenantId: string, usuarioId: string, input: unknown): Promise<Pagina> {
    const r = await correr(tenantId, usuarioId, input);
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return r.data as Pagina;
  }

  it("ve solo sus turnos vigentes de la ventana, con la instalación", async () => {
    const r = await pagina(t.a, u.a1, { desde: "2026-12-01", dias: 7 });
    expect(r.personaId).toBe(p.a1);
    expect(r.hasta).toBe("2026-12-07");
    expect(r.items.map((x) => x.fecha)).toEqual(["2026-12-01", "2026-12-02", "2026-12-03"]);
    expect(r.items.every((x) => x.instalacion.nombre === "Planta Norte" && x.puesto === null)).toBe(true);
    expect(r.siguiente).toBeNull();
  });

  it("el compañero y el trabajador de otra empresa ven solo lo suyo", async () => {
    const a2 = await pagina(t.a, u.a2, { desde: "2026-12-01", dias: 31 });
    expect(a2.items).toHaveLength(1);
    expect(a2.personaId).toBe(p.a2);
    const b1 = await pagina(t.b, u.b1, { desde: "2026-12-01", dias: 31 });
    expect(b1.items.map((x) => x.instalacion.nombre)).toEqual(["Bodega Sur"]);
  });

  it("pagina por cursor sin repetir ni perder turnos", async () => {
    const uno = await pagina(t.a, u.a1, { desde: "2026-12-01", dias: 31, limite: 3 });
    expect(uno.items).toHaveLength(3);
    expect(uno.siguiente).not.toBeNull();
    const dos = await pagina(t.a, u.a1, { desde: "2026-12-01", dias: 31, limite: 3, cursor: uno.siguiente });
    expect(dos.items.map((x) => x.fecha)).toEqual(["2026-12-20"]);
    expect(dos.siguiente).toBeNull();
  });

  it("sin ficha propia responde NOT_FOUND y no acepta un id de persona", async () => {
    const r = await correr(t.a, u.sinPersona, {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("NOT_FOUND");
    const conPersona = await pagina(t.a, u.a2, { personaId: p.a1, desde: "2026-12-01", dias: 31 });
    expect(conPersona.personaId).toBe(p.a2);
  });
});
