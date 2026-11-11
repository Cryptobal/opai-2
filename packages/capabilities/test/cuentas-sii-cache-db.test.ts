// CAR-156 · Caché de la consulta al SII por (empresa, RUT) contra Postgres real (si hay
// DATABASE_URL_TEST) con un rol sin BYPASSRLS: una empresa no ve ni reutiliza la caché de otra, el alta
// encola en la cola real y la lista trae «Lista para facturar». Proveedor simulado; datos ficticios.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { contribuyenteSimulado } from "@opai/integrations";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const RUT = "76418552-8";
const sii = contribuyenteSimulado({
  [RUT]: {
    estado: "ok",
    datos: {
      rut: RUT,
      razonSocial: "FICTICIA DE PRUEBA SPA",
      actividades: [{ codigo: "801000", descripcion: "Seguridad privada", afectaIva: true }],
      direccion: "Calle Inventada 1",
      comuna: "Ñuñoa",
      ciudad: "Santiago",
      correoIntercambio: "dte@ficticia.cl",
      inicioActividades: "2015-01-02",
    },
  },
});

describe.skipIf(!urlPropietario)("Consulta SII con caché · base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const s = randomUUID().slice(0, 8);
  const ids = { tA: "", tB: "", user: "", cuentaA: "", cuentaB: "" };

  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: ids.user },
      usuario: { id: ids.user, nombre: "Rosa", email: "rosa@prueba.cl", platformRole: null },
      rol: "owner" as never,
      portal: "erp",
      portalesMembresia: ["erp"],
      medidor: { registrar: async () => undefined },
    });
  const run = async <T>(tenantId: string, id: string, input: unknown, dryRun = false) => {
    const r = await mod.executeCapability(ctx(tenantId), id, input, dryRun ? { dryRun } : {});
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.fijarFuenteContribuyente(sii);
    const tenant = async (slug: string) =>
      (await e.admin.tenant.create({ data: { slug: `${slug}-${s}`, nombre: slug, vertical: "seguridad" } })).id;
    ids.tA = await tenant("sii-a");
    ids.tB = await tenant("sii-b");
    ids.user = (
      await e.admin.user.create({ data: { name: "Rosa", email: `rosa-sii-${s}@prueba.cl`, emailVerified: true } })
    ).id;
    const cuenta = async (tenantId: string) =>
      (await e.admin.cuenta.create({ data: { tenantId, nombre: "Ficticia", rut: RUT, estado: "cliente_activo" } })).id;
    ids.cuentaA = await cuenta(ids.tA);
    ids.cuentaB = await cuenta(ids.tB);
  });

  afterAll(async () => {
    mod?.fijarFuenteContribuyente(null);
    await e?.cerrar();
  });

  it("la caché es por empresa: la segunda consulta de A no sale al SII; B pregunta por su cuenta", async () => {
    type C = { origen: string | null };
    expect((await run<C>(ids.tA, "core.cuentas.consultar_sii", { id: ids.cuentaA })).origen).toBe("sii");
    expect((await run<C>(ids.tA, "core.cuentas.consultar_sii", { id: ids.cuentaA })).origen).toBe("cache");
    expect(sii.llamadas).toEqual([RUT]);
    // B no ve la fila de A (RLS) y no la reutiliza.
    expect((await run<C>(ids.tB, "core.cuentas.consultar_sii", { id: ids.cuentaB })).origen).toBe("sii");
    expect(sii.llamadas).toEqual([RUT, RUT]);
    const filas = await e.admin.siiContribuyente.findMany({ where: { rut: RUT, tenantId: { in: [ids.tA, ids.tB] } } });
    expect(filas.map((f) => f.tenantId).sort()).toEqual([ids.tA, ids.tB].sort());
  });

  it("aplicar usa la caché y escribe solo lo elegido; la lista dice qué falta para facturar", async () => {
    await run(ids.tA, "core.cuentas.aplicar_sii", { id: ids.cuentaA, campos: ["razonSocial", "giro", "calle", "comuna", "emailDte"] });
    expect(sii.llamadas).toHaveLength(2);
    type L = { items: { id: string; facturar: { lista: boolean; faltan: string[] } }[] };
    const a = await run<L>(ids.tA, "core.cuentas.list", {});
    expect(a.items.find((x) => x.id === ids.cuentaA)?.facturar).toEqual({ lista: true, faltan: [] });
    const b = await run<L>(ids.tB, "core.cuentas.list", {});
    expect(b.items.map((x) => x.id)).toEqual([ids.cuentaB]);
    expect(b.items[0]?.facturar.lista).toBe(false);
  });

  it("el alta con un RUT nuevo encola una sola consulta por día en la cola real", async () => {
    const otro = "77777777-7";
    const r = await run<{ sii: string }>(ids.tA, "core.cuentas.create", { nombre: "Nueva Ficticia", rut: otro });
    expect(r.sii).toBe("en_cola");
    const trabajos = await e.admin.trabajo.findMany({
      where: { tenantId: ids.tA, tipo: "core.sii.consultar_contribuyente" },
    });
    expect(trabajos).toHaveLength(1);
    expect(trabajos[0]?.payload).toEqual({ rut: otro });
    expect(sii.llamadas).toHaveLength(2);
  });
});
