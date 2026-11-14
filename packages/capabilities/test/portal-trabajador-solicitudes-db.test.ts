// CAR-464 · Solicitudes de permiso y vacaciones desde el portal del trabajador contra Postgres real (si hay
// DATABASE_URL_TEST): dos empresas y RLS con el rol sin BYPASSRLS. Prueba que el trabajador pide para su propia persona
// (queda «solicitada», sin tocar la pauta), que no puede pedir días pasados ni encima de otra ausencia, que la vista
// previa no escribe, que lista solo lo suyo (no lo de un compañero ni de otra empresa) y que solo retira lo que él pidió
// y sigue pendiente.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import { manifest } from "../../../modules/portal_trabajador/manifest";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;
type Sol = { id: string; tipo: string; estado: string; propia: boolean; desde: string };

const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
const dentro = (dias: number) => new Date(Date.parse(`${hoy}T00:00:00Z`) + dias * 86_400_000).toISOString().slice(0, 10);

describe.skipIf(!urlPropietario)("portal trabajador · solicitudes (Postgres real)", () => {
  let e: Entorno;
  let mod: Capacidades;
  const t = { a: "", b: "" };
  const u = { a1: "", a2: "", b1: "" };
  const p: Record<string, string> = {};
  let deRrhh = "";

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...manifest.capacidades]);
    const sufijo = randomUUID().slice(0, 8);
    for (const k of ["a", "b"] as const)
      t[k] = (await e.admin.tenant.create({ data: { slug: `ps-${k}-${sufijo}`, nombre: k, vertical: "seguridad" } })).id;
    for (const [k, tenantId, rut] of [["a1", t.a, "11111111-1"], ["a2", t.a, "22222222-2"], ["b1", t.b, "33333333-3"]] as const) {
      u[k] = randomUUID();
      await e.admin.user.create({ data: { id: u[k], name: k, email: `${k}-${sufijo}@prueba.cl` } });
      await e.admin.membership.create({ data: { tenantId, userId: u[k], rol: "viewer", portales: ["trabajador"], estado: "activa" } });
      p[k] = (await e.admin.persona.create({ data: { tenantId, usuarioId: u[k], rut, nombres: k, apellidos: "Prueba" } })).id;
    }
    // Una licencia que registró RR. HH. (no la pidió el trabajador): se ve, pero no se puede retirar.
    deRrhh = (
      await e.admin.ausencia.create({
        data: { tenantId: t.a, personaId: p["a1"] ?? "", tipo: "licencia", desde: new Date(`${dentro(30)}T00:00:00Z`), hasta: new Date(`${dentro(32)}T00:00:00Z`), motivo: "Licencia", estado: "aprobada" },
      })
    ).id;
    await e.admin.ausencia.create({
      data: { tenantId: t.b, personaId: p["b1"] ?? "", tipo: "permiso", desde: new Date(`${dentro(5)}T00:00:00Z`), hasta: new Date(`${dentro(5)}T00:00:00Z`), motivo: "Trámite", estado: "solicitada", registradaPor: u.b1 },
    });
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  const correr = (tenantId: string, usuarioId: string, id: string, input: unknown, dryRun = false) =>
    mod.executeCapability(
      mod.crearContexto({
        tenantId, actor: { tipo: "user", id: usuarioId }, portal: "trabajador", portalesMembresia: ["trabajador"],
        modulosActivos: ["portal_trabajador"], rol: "viewer", medidor: { registrar: async () => undefined },
      }),
      id,
      input,
      { dryRun },
    );
  async function dato<T>(tenantId: string, usuarioId: string, id: string, input: unknown, dryRun = false): Promise<T> {
    const r = await correr(tenantId, usuarioId, id, input, dryRun);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  const pedir = { tipo: "vacaciones", desde: dentro(10), hasta: dentro(14), motivo: "Viaje familiar" };

  it("la vista previa no escribe y pedir deja una solicitud propia pendiente", async () => {
    await dato(t.a, u.a1, "portal_trabajador.solicitudes.crear", pedir, true);
    expect(await e.admin.ausencia.count({ where: { personaId: p["a1"], tipo: "vacaciones" } })).toBe(0);
    const s = await dato<Sol>(t.a, u.a1, "portal_trabajador.solicitudes.crear", pedir);
    expect([s.estado, s.propia, s.tipo]).toEqual(["solicitada", true, "vacaciones"]);
    expect((await e.admin.ausencia.findUniqueOrThrow({ where: { id: s.id } })).personaId).toBe(p["a1"]);
  });

  it("rechaza días pasados, choques con otra ausencia y tipos que no se piden desde el portal", async () => {
    const pasado = await correr(t.a, u.a1, "portal_trabajador.solicitudes.crear", { ...pedir, desde: dentro(-2), hasta: dentro(-1) });
    expect(pasado.ok ? "ok" : pasado.error.code).toBe("UNPROCESSABLE");
    const choca = await correr(t.a, u.a1, "portal_trabajador.solicitudes.crear", { ...pedir, desde: dentro(31), hasta: dentro(31) });
    expect(choca.ok ? "ok" : choca.error.code).toBe("CONFLICT");
    const licencia = await correr(t.a, u.a1, "portal_trabajador.solicitudes.crear", { ...pedir, tipo: "licencia" });
    expect(licencia.ok ? "ok" : licencia.error.code).toBe("INVALID_INPUT");
  });

  it("cada trabajador ve solo lo suyo, en su empresa", async () => {
    const a1 = await dato<{ items: Sol[] }>(t.a, u.a1, "portal_trabajador.solicitudes.listar", {});
    expect(a1.items.map((x) => x.tipo).sort()).toEqual(["licencia", "vacaciones"]);
    expect((await dato<{ items: Sol[] }>(t.a, u.a2, "portal_trabajador.solicitudes.listar", {})).items).toEqual([]);
    expect((await dato<{ items: Sol[] }>(t.b, u.b1, "portal_trabajador.solicitudes.listar", {})).items).toHaveLength(1);
  });

  it("retira solo lo que él pidió y sigue pendiente", async () => {
    const [mia] = (await dato<{ items: Sol[] }>(t.a, u.a1, "portal_trabajador.solicitudes.listar", {})).items.filter((x) => x.propia);
    const ajena = await correr(t.a, u.a2, "portal_trabajador.solicitudes.cancelar", { id: mia?.id });
    expect(ajena.ok ? "ok" : ajena.error.code).toBe("NOT_FOUND");
    const rrhh = await correr(t.a, u.a1, "portal_trabajador.solicitudes.cancelar", { id: deRrhh });
    expect(rrhh.ok ? "ok" : rrhh.error.code).toBe("NOT_FOUND");
    const ok = await dato<Sol>(t.a, u.a1, "portal_trabajador.solicitudes.cancelar", { id: mia?.id });
    expect(ok.estado).toBe("anulada");
    const otraVez = await correr(t.a, u.a1, "portal_trabajador.solicitudes.cancelar", { id: mia?.id });
    expect(otraVez.ok ? "ok" : otraVez.error.code).toBe("UNPROCESSABLE");
  });
});
