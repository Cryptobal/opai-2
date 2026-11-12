// CAR-300 corte 3a · el envío de una propuesta a un contacto de una cuenta PROSPECTO le da un acceso «limitado»
// y registra la propuesta vigente (la anterior queda «reemplazada»). Un acceso suspendido o revocado a mano no
// se toca; una cuenta cliente activa conserva su acceso completo. Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { registrarModuloComercial } from "./comercial-modulo";

describe.skipIf(!urlPropietario)("Portal Cliente · propuesta enviada al prospecto (CAR-300 corte 3a)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tA = "";
  const sufijo = randomUUID().slice(0, 8);
  const medidor = { registrar: async () => undefined };
  const creador = randomUUID();
  const correo = (n: string) => `${n}-${sufijo}@prueba.cl`;
  const ctx = (modulos: string[] = ["comercial", "portal_cliente"]) =>
    mod.crearContexto({ tenantId: tA, actor: { tipo: "system" }, rol: "owner", portal: "erp", portalesMembresia: ["erp"], modulosActivos: modulos, medidor });

  async function cuentaConContacto(nombre: string, estado: string, acceso?: { estado: string }) {
    const cuenta = await e.admin.cuenta.create({ data: { tenantId: tA, nombre, estado } });
    const contacto = await e.admin.contacto.create({ data: { tenantId: tA, cuentaId: cuenta.id, nombres: nombre, apellidos: "P", email: correo(nombre) } });
    const userId = randomUUID();
    await e.admin.user.create({ data: { id: userId, name: nombre, email: correo(nombre) } });
    const m = await e.admin.membership.create({ data: { tenantId: tA, userId, rol: "viewer", portales: ["cliente"] } });
    if (acceso) await e.admin.accesoCliente.create({ data: { tenantId: tA, membershipId: m.id, cuentaId: cuenta.id, contactoId: contacto.id, estado: acceso.estado, alcance: estado === "prospecto" ? "limitado" : "completo" } });
    return { cuentaId: cuenta.id, contactoId: contacto.id, membershipId: m.id };
  }
  async function cotizacion(cuentaId: string, codigo: string) {
    const r = await mod.executeCapability(ctx(), "comercial.negocios.create", { cuentaId, titulo: `Neg ${codigo}` });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    const negocioId = (r.data as { id: string }).id;
    return (await e.admin.cpqCotizacion.create({ data: { tenantId: tA, negocioId, codigo: `${codigo}-${sufijo}`, titulo: codigo, creadoPorId: creador } })).id;
  }
  const registrar = (cuentaId: string, contactoId: string, cotizacionId: string) =>
    mod.registrarPropuestaEnviada(ctx(), { cuentaId, contactoId, cotizacionId, vigenteHasta: null });
  const filas = (accesoId: string) => e.admin.accesoPropuesta.findMany({ where: { accesoId }, orderBy: { createdAt: "asc" } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial, ...mod.capacidadesPortalCliente]);
    registrarModuloComercial();
    tA = (await e.admin.tenant.create({ data: { slug: `pe-${sufijo}`, nombre: "pe", vertical: "seguridad" } })).id;
    await sembrarComercial(e.admin.$extends({}), tA);
    await e.admin.user.create({ data: { id: creador, name: "c", email: correo("creador"), emailVerified: true } });
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("a un prospecto sin acceso se le da un acceso limitado y la propuesta queda vigente; la anterior se reemplaza", async () => {
    const p = await cuentaConContacto("prospecto1", "prospecto");
    const r = await mod.asegurarAccesoContacto(ctx(), { cuentaId: p.cuentaId, contactoId: p.contactoId }, false);
    expect(r.estado).toBe("vinculado");
    const acceso = await e.admin.accesoCliente.findFirstOrThrow({ where: { membershipId: p.membershipId } });
    expect(acceso.alcance).toBe("limitado");
    const c1 = await cotizacion(p.cuentaId, "P1");
    const c2 = await cotizacion(p.cuentaId, "P2");
    expect(await registrar(p.cuentaId, p.contactoId, c1)).toBe("registrada");
    expect(await registrar(p.cuentaId, p.contactoId, c2)).toBe("registrada");
    expect((await filas(acceso.id)).map((f) => [f.cotizacionId, f.estado])).toEqual([[c1, "reemplazada"], [c2, "vigente"]]);
    // Reenviar la misma no duplica la vigente.
    expect(await registrar(p.cuentaId, p.contactoId, c2)).toBe("registrada");
    expect((await filas(acceso.id)).filter((f) => f.estado === "vigente")).toHaveLength(1);
  });

  it("un acceso suspendido o revocado a mano no se toca ni recibe propuesta", async () => {
    for (const estado of ["suspendido", "revocado"]) {
      const p = await cuentaConContacto(`manual-${estado}`, "prospecto", { estado });
      const c = await cotizacion(p.cuentaId, `M-${estado}`);
      expect(await registrar(p.cuentaId, p.contactoId, c)).toBe("no_aplica");
      const acceso = await e.admin.accesoCliente.findFirstOrThrow({ where: { membershipId: p.membershipId } });
      expect(acceso.estado).toBe(estado);
      expect(await filas(acceso.id)).toHaveLength(0);
    }
  });

  it("una cuenta cliente activa conserva su acceso completo y no necesita propuesta registrada", async () => {
    const p = await cuentaConContacto("cliente1", "cliente_activo");
    expect((await mod.asegurarAccesoContacto(ctx(), { cuentaId: p.cuentaId, contactoId: p.contactoId }, false)).estado).toBe("vinculado");
    const acceso = await e.admin.accesoCliente.findFirstOrThrow({ where: { membershipId: p.membershipId } });
    expect(acceso.alcance).toBe("completo");
    const c = await cotizacion(p.cuentaId, "C1");
    expect(await registrar(p.cuentaId, p.contactoId, c)).toBe("no_aplica");
    expect(await filas(acceso.id)).toHaveLength(0);
  });

  it("un contacto que no es de la cuenta no recibe propuesta", async () => {
    const a = await cuentaConContacto("cruce-a", "prospecto", { estado: "activo" });
    const b = await cuentaConContacto("cruce-b", "prospecto", { estado: "activo" });
    const c = await cotizacion(a.cuentaId, "X1");
    expect(await registrar(a.cuentaId, b.contactoId, c)).toBe("no_aplica");
  });
});
