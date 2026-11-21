// Entorno de dos empresas (A y B) con una instalación y un equipo de portería cada una, para las pruebas de
// configuración y puntos de acceso (CAR-479) contra Postgres real (rol sin BYPASSRLS).
import { randomUUID } from "node:crypto";
import { vi } from "vitest";

import { type Entorno, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const CLAVE_PRUEBA = "clave-solo-para-pruebas-no-es-un-secreto-real-0123456789";
export type K = "A" | "B";

export async function prepararAccesoAB() {
  vi.stubEnv("ACCESO_HUELLA_SECRET", CLAVE_PRUEBA);
  const e: Entorno = await prepararEntorno();
  const mod: typeof ModuloCapacidades = await import("../src");
  mod.limpiarRegistro();
  mod.registrarCapacidades(mod.capacidadesDelNucleo);
  mod.registrarCapacidades(mod.capacidadesAcceso);
  const t = { A: "", B: "" };
  const inst = { A: "", B: "" };
  const disp = { A: "", B: "" };
  const sufijo = randomUUID().slice(0, 8);
  for (const k of ["A", "B"] as const) {
    t[k] = (
      await e.admin.tenant.create({
        data: { slug: `cf-${k.toLowerCase()}-${sufijo}`, nombre: k, vertical: "seguridad" },
      })
    ).id;
    const cuentaId = (await e.admin.cuenta.create({ data: { tenantId: t[k], nombre: `C ${k}` } }))
      .id;
    inst[k] = (
      await e.admin.instalacion.create({
        data: { tenantId: t[k], cuentaId, nombre: `Portería ${k}` },
      })
    ).id;
    disp[k] = (
      await e.admin.dispositivo.create({
        data: {
          tenantId: t[k],
          instalacionId: inst[k],
          identificador: "DSP-1",
          estado: "activo",
          tokenHash: `h-${sufijo}-${k}`,
        },
      })
    ).id;
  }
  const ctx = (k: K) =>
    mod.crearContexto({
      tenantId: t[k],
      actor: { tipo: "system" },
      rol: "owner",
      alcance: null,
      medidor: { registrar: async () => undefined },
      modulosActivos: ["acceso"],
    });
  const run = (k: K, id: string, input: unknown) => mod.executeCapability(ctx(k), id, input);
  const ok = async <T>(k: K, id: string, input: unknown): Promise<T> => {
    const r = await run(k, id, input);
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  };
  /** Una entrada por la portería de A; devuelve su clave. */
  async function entrada(payload: Record<string, unknown>): Promise<string> {
    const clave = randomUUID();
    await ok("A", "core.hechos_terreno.recibir", {
      dispositivoId: disp.A,
      horaEnvio: new Date().toISOString(),
      hechos: [
        {
          clave,
          tipo: "acceso.entrada",
          payload: { tipoRegistro: "visita", ...payload },
          horaHecho: new Date(Date.now() - 5_000).toISOString(),
        },
      ],
    });
    return clave;
  }
  const registro = (clave: string) =>
    e.forTenant(t.A).registroAcceso.findFirst({ where: { clave } });
  return { e, mod, t, inst, disp, sufijo, ctx, run, ok, entrada, registro };
}
