import { randomUUID } from "node:crypto";

import { type Entorno, prepararEntorno } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import type { Contexto } from "../src/types";

type ModuloCap = typeof ModuloCapacidades;

export type VentasDbSuite = {
  e: Entorno;
  mod: ModuloCap;
  tenantId: string;
  tenantB: string;
  cuentaId: string;
  documentoB: string;
  ctx: (tid?: string) => Contexto;
  dato: <T>(id: string, input: Record<string, unknown>, opts?: { dryRun?: boolean }) => Promise<T>;
};

export async function prepararVentasDb(): Promise<VentasDbSuite> {
  process.env.SII_ADAPTADOR = "simulado";
  const e = await prepararEntorno();
  const mod = await import("../src");
  mod.limpiarRegistro();
  mod.limpiarTrabajos();
  mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesFinanzas]);
  mod.registrarTrabajos([...mod.trabajosDelNucleo, ...mod.trabajosFinanzas]);
  const medidor = { registrar: async () => undefined };
  const usuarioId = randomUUID();
  const tenantId = (
    await e.admin.tenant.create({
      data: { slug: `fin-v-${randomUUID().slice(0, 8)}`, nombre: "Servicios Andes SpA", vertical: "seguridad" },
    })
  ).id;
  const tenantB = (
    await e.admin.tenant.create({
      data: { slug: `fin-vb-${randomUUID().slice(0, 8)}`, nombre: "Otra Empresa SpA", vertical: "seguridad" },
    })
  ).id;
  const cuentaId = (
    await e.admin.cuenta.create({
      data: { tenantId, nombre: "Cliente Ficticio Ltda.", rut: "77234567-8" },
    })
  ).id;
  const ctx = (tid = tenantId) =>
    mod.crearContexto({
      tenantId: tid,
      actor: { tipo: "user", id: usuarioId },
      usuario: { id: usuarioId, nombre: "Admin de prueba", email: "admin@prueba.cl", platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["finanzas"],
      medidor,
    });
  const dato = async <T>(id: string, input: Record<string, unknown>, opts?: { dryRun?: boolean }): Promise<T> => {
    const r = await mod.executeCapability(ctx(), id, input, opts);
    if (!r.ok) throw new Error(`${id}: ${r.error.code} ${r.error.message}`);
    return r.data as T;
  };
  await dato("finanzas.dte_config.actualizar", {
    ambiente: "certificacion",
    rutEmisor: "76111222-8",
  });
  await dato("finanzas.folios.cargar_caf", {
    tipoDte: 33,
    folioDesde: 5000,
    folioHasta: 5020,
    cafVenceEn: "2027-12-31",
  });
  const cuentaB = (await e.admin.cuenta.create({ data: { tenantId: tenantB, nombre: "Cliente B", rut: "77999999-9" } }))
    .id;
  const documentoB = (
    await e.admin.documentoEmitido.create({
      data: {
        tenantId: tenantB,
        cuentaId: cuentaB,
        tipoDte: 33,
        folio: 1,
        fechaEmision: new Date("2026-11-01"),
        fechaVencimiento: new Date("2026-12-01"),
        montoNeto: 100_000,
        montoIva: 19_000,
        montoTotal: 119_000,
        estadoDte: "aceptado",
      },
    })
  ).id;
  return { e, mod, tenantId, tenantB, cuentaId, documentoB, ctx, dato };
}
