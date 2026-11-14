// CAR-300 · El contacto de un prospecto que fue INVITADO al enviarle la propuesta (sin usuario todavía) la ve
// en el portal apenas acepta la invitación: se vincula con acceso «limitado» y la última cotización enviada
// de su cuenta queda vigente. Cuentas cliente activo, archivadas o accesos suspendidos no se tocan. Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { registrarModuloComercial } from "./comercial-modulo";

describe.skipIf(!urlPropietario)("Portal Cliente · propuesta al aceptar la invitación (CAR-300)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tA = "";
  let tB = "";
  const sufijo = randomUUID().slice(0, 8);
  const medidor = { registrar: async () => undefined };
  const creador = randomUUID();
  const correo = (n: string) => `${n}-${sufijo}@prueba.cl`;
  const ctx = (tenantId = tA) =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", portal: "erp", portalesMembresia: ["erp"], modulosActivos: ["comercial", "portal_cliente", "cpq"], medidor });

  /** Contacto con usuario recién aceptado (membresía de cliente, sin acceso al portal). */
  async function aceptado(nombre: string, estadoCuenta: string, tenantId = tA) {
    const cuenta = await e.admin.cuenta.create({ data: { tenantId, nombre, estado: estadoCuenta } });
    const contacto = await e.admin.contacto.create({ data: { tenantId, cuentaId: cuenta.id, nombres: nombre, apellidos: "P", email: correo(nombre).toUpperCase() } });
    const userId = randomUUID();
    await e.admin.user.create({ data: { id: userId, name: nombre, email: correo(nombre) } });
    const m = await e.admin.membership.create({ data: { tenantId, userId, rol: "viewer", portales: ["cliente"] } });
    return { cuentaId: cuenta.id, contactoId: contacto.id, membershipId: m.id };
  }
  async function enviada(cuentaId: string, codigo: string, enviadaEn: Date, archivada = false) {
    const r = await mod.executeCapability(ctx(), "comercial.negocios.create", { cuentaId, titulo: `Neg ${codigo}` });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    const c = await e.admin.cpqCotizacion.create({
      data: { tenantId: tA, negocioId: (r.data as { id: string }).id, codigo: `${codigo}-${sufijo}`, titulo: codigo, creadoPorId: creador, archivadaEn: archivada ? new Date() : null },
    });
    await e.admin.cpqVersion.create({ data: { tenantId: tA, cotizacionId: c.id, numero: 1, estado: "enviada", moneda: "UF", enviadaEn, creadoPorId: creador } });
    return c.id;
  }
  const vigentes = (membershipId: string) =>
    e.admin.accesoPropuesta.findMany({ where: { acceso: { membershipId }, estado: "vigente" }, select: { cotizacionId: true } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial, ...mod.capacidadesPortalCliente]);
    registrarModuloComercial();
    tA = (await e.admin.tenant.create({ data: { slug: `pa-${sufijo}`, nombre: "pa", vertical: "seguridad" } })).id;
    tB = (await e.admin.tenant.create({ data: { slug: `pb-${sufijo}`, nombre: "pb", vertical: "seguridad" } })).id;
    await sembrarComercial(e.admin.$extends({}), tA);
    await e.admin.user.create({ data: { id: creador, name: "c", email: correo("creador"), emailVerified: true } });
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("vincula con acceso limitado y deja vigente la última cotización enviada no archivada", async () => {
    const p = await aceptado("prospecto", "prospecto");
    await enviada(p.cuentaId, "VIEJA", new Date("2026-10-01T12:00:00Z"));
    const nueva = await enviada(p.cuentaId, "NUEVA", new Date("2026-11-01T12:00:00Z"));
    await enviada(p.cuentaId, "ARCH", new Date("2026-11-05T12:00:00Z"), true);
    const r = await mod.propuestaAlAceptar(ctx(), p.membershipId);
    expect(r).toEqual([{ cuentaId: p.cuentaId, cotizacionId: nueva }]);
    const acceso = await e.admin.accesoCliente.findFirstOrThrow({ where: { membershipId: p.membershipId } });
    expect([acceso.alcance, acceso.estado]).toEqual(["limitado", "activo"]);
    expect(await vigentes(p.membershipId)).toEqual([{ cotizacionId: nueva }]);
    // Repetir (reintento del consumidor) no duplica.
    await mod.propuestaAlAceptar(ctx(), p.membershipId);
    expect(await vigentes(p.membershipId)).toHaveLength(1);
  });

  it("con el contexto real del despacho (sin módulos cargados) decide por los módulos de la empresa", async () => {
    // El outbox entrega los eventos con un contexto de sistema sin `modulosActivos`: el consumidor no puede
    // darlo por apagado por eso (14-nov, qa-e2e: el prospecto aceptó y quedó sin acceso).
    const despacho = (tenantId = tA) => mod.crearContexto({ tenantId, actor: { tipo: "system" }, portal: null, modulosActivos: [], medidor });
    const sin = await aceptado("sinmodulo", "prospecto");
    await enviada(sin.cuentaId, "SINM", new Date());
    expect(await mod.propuestaAlAceptar(despacho(), sin.membershipId)).toEqual([]);
    await e.admin.tenantModule.create({ data: { tenantId: tA, moduloId: "portal_cliente", estado: "activo" } });
    const p = await aceptado("despacho", "prospecto");
    const cot = await enviada(p.cuentaId, "DESP", new Date());
    expect(await mod.propuestaAlAceptar(despacho(), p.membershipId)).toEqual([{ cuentaId: p.cuentaId, cotizacionId: cot }]);
    expect(await vigentes(p.membershipId)).toEqual([{ cotizacionId: cot }]);
  });

  it("una cuenta cliente activo no recibe nada por esta vía", async () => {
    const p = await aceptado("cliente", "cliente_activo");
    await enviada(p.cuentaId, "CLI", new Date());
    expect(await mod.propuestaAlAceptar(ctx(), p.membershipId)).toEqual([]);
    expect(await e.admin.accesoCliente.count({ where: { membershipId: p.membershipId } })).toBe(0);
  });

  it("una membresía de otra empresa no se procesa", async () => {
    const otra = await aceptado("ajena", "prospecto", tB);
    expect(await mod.propuestaAlAceptar(ctx(tA), otra.membershipId)).toEqual([]);
    expect(await e.admin.accesoCliente.count({ where: { membershipId: otra.membershipId } })).toBe(0);
  });
});
