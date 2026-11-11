// Ayuda de las pruebas del historial de correos (CAR-233): empresas ficticias con cuenta, contacto y negocio.
import { randomUUID } from "node:crypto";

import { sembrarComercial } from "@opai/db";
import type { Rol } from "@opai/domain";

import type { Entorno } from "../../db/test/entorno";
import * as mod from "../src";
import { dato } from "./maestros-ayuda";

export type ItemCorreo = { id: string; sentido: string; origen: string; cuentaId: string | null; contactoId: string | null; negocioId: string | null; asociacion: string | null; texto: string };
export type PaginaCorreos = { items: ItemCorreo[]; siguiente: string | null };

export const medidorPrueba = { registrar: async () => undefined };
export const ctxPrueba = (tenantId: string, rol: Rol = "owner", modulos = ["comercial"]) =>
  mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol, modulosActivos: modulos, medidor: medidorPrueba });

/** Empresa ficticia con una cuenta (sitio web dado), un contacto ana@<dominio> y un negocio. */
export async function empresaCorreos(e: Entorno, nombre: string, sitio: string) {
  const t = await e.admin.tenant.create({ data: { slug: `cor-${randomUUID().slice(0, 8)}`, nombre, vertical: "seguridad" } });
  await sembrarComercial(e.admin.$extends({}), t.id);
  const c = ctxPrueba(t.id);
  const cuenta = await dato<{ id: string }>(c, "core.cuentas.create", { nombre: `Cliente ${nombre}` });
  await e.admin.cuenta.update({ where: { id: cuenta.id }, data: { sitioWeb: sitio } });
  const email = `ana@${sitio.replace(/^https?:\/\/(www\.)?/, "")}`;
  const contacto = await dato<{ id: string }>(c, "core.contactos.create", { cuentaId: cuenta.id, nombres: "Ana", apellidos: "Prueba", email });
  const negocio = await dato<{ id: string }>(c, "comercial.negocios.create", { cuentaId: cuenta.id, titulo: `Negocio ${nombre}` });
  return { tenantId: t.id, c, cuentaId: cuenta.id, contactoId: contacto.id, negocioId: negocio.id };
}
