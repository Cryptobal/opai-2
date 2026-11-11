// Empresa ficticia para las pruebas de CAR-160 contra Postgres real: tenant de seguridad con el
// catálogo comercial sembrado, una vendedora owner y negocios en «Propuesta enviada» listos para avanzar.
import { randomUUID } from "node:crypto";

import { sembrarComercial } from "@opai/db";

import type { Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { dato } from "./maestros-ayuda";

export async function empresaCar160(e: Entorno, nombre: string) {
  const medidor = { registrar: async () => undefined };
  const t = await e.admin.tenant.create({ data: { slug: `c160-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" } });
  await sembrarComercial(e.admin.$extends({}), t.id);
  const u = await e.admin.user.create({ data: { name: `Vendedora ${nombre}`, email: `v-${randomUUID().slice(0, 8)}@prueba.cl`, emailVerified: true } });
  await e.admin.membership.create({ data: { tenantId: t.id, userId: u.id, rol: "owner", portales: ["erp"] } });
  const c = mod.crearContexto({
    tenantId: t.id, actor: { tipo: "user", id: u.id }, usuario: { id: u.id, nombre: "Vendedora", email: "v@prueba.cl", platformRole: null },
    rol: "owner", portal: "erp", portalesMembresia: ["erp"], modulosActivos: ["comercial"], medidor,
  });
  const cuenta = await dato<{ id: string }>(c, "core.cuentas.create", { nombre });
  const etapas = await e.admin.etapa.findMany({ where: { tenantId: t.id }, orderBy: { orden: "asc" } });
  const etapa = (n: string) => etapas.find((x) => x.nombre === n)!;
  const negocio = async () => {
    const n = await dato<{ id: string }>(c, "comercial.negocios.create", { cuentaId: cuenta.id, titulo: `Negocio ${randomUUID().slice(0, 4)}` });
    await e.admin.negocio.update({ where: { id: n.id }, data: { etapaId: etapa("Propuesta enviada").id, montoEstimadoMensual: 1_000_000, cierreEstimado: new Date("2026-12-31T00:00:00Z"), responsableId: u.id } });
    return n.id;
  };
  return { tenantId: t.id, userId: u.id, c, etapa, negocio };
}
