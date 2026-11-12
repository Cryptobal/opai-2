// CAR-192 PR 3 · cotizaciones en el Portal Cliente contra Postgres real con un rol sin BYPASSRLS: el contacto
// ve solo las enviadas de SU cuenta (nunca borradores, otra cuenta ni otra empresa) y el enlace de descarga se
// firma solo tras verificar cuenta y estado.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { capacidades as capacidadesCpq } from "../../../modules/cpq/capabilities";
import { sembrarComercial } from "@opai/db";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { almacenamientoEnMemoria } from "../src/testing/almacenamiento-memoria";
import { registrarModuloComercial } from "./comercial-modulo";

type Res<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

describe.skipIf(!urlPropietario)("cpq · cotizaciones en el Portal Cliente en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const medidor = { registrar: async () => undefined };
  const sufijo = randomUUID().slice(0, 8);
  const contacto = randomUUID();
  const ajeno = randomUUID();
  const prospecto = randomUUID();
  let t = { a: "", b: "" };
  let pz: { acceso: string; vigente: string; sinPropuesta: string; reemplazada: string; docProp: string } = { acceso: "", vigente: "", sinPropuesta: "", reemplazada: "", docProp: "" };
  let ids = { enviadaX: "", borradorX: "", enviadaY: "", enviadaB: "", docCot: "", docProp: "" };

  const comoContacto = <T>(tenantId: string, userId: string, id: string, input: unknown) =>
    mod.executeCapability(
      mod.crearContexto({
        tenantId,
        actor: { tipo: "user", id: userId },
        usuario: { id: userId, nombre: "contacto", email: `c-${userId.slice(0, 6)}-${sufijo}@prueba.cl`, platformRole: null },
        rol: "viewer",
        permisosRol: ["portal_cliente:read"],
        portal: "cliente",
        portalesMembresia: ["cliente"],
        modulosActivos: ["cpq", "portal_cliente"],
        medidor,
        servicios: { almacenamiento: almacenamientoEnMemoria().almacenamiento },
      }),
      id,
      input,
    ) as Promise<Res<T>>;

  async function cotizacion(tenantId: string, cuentaId: string, codigo: string, estado: string, conEnvio = false) {
    const negocio = await sis<{ id: string }>(tenantId, "comercial.negocios.create", { cuentaId, titulo: `Neg ${codigo}` });
    const cot = await e.admin.cpqCotizacion.create({ data: { tenantId, negocioId: negocio.id, codigo, titulo: `Servicio ${codigo}`, vigente: true, creadoPorId: contacto } });
    const enviada = estado !== "borrador";
    const v = await e.admin.cpqVersion.create({
      data: { tenantId, cotizacionId: cot.id, numero: 1, estado, ventaMensualClp: 1_000_000, enviadaEn: enviada ? new Date() : null, creadoPorId: contacto },
    });
    const sec = await e.admin.cpqSeccion.create({ data: { tenantId, versionId: v.id, nombre: "Planta" } });
    await e.admin.cpqLinea.create({ data: { tenantId, seccionId: sec.id, tipo: "puesto", nombre: "Guardia 4x4", posiciones: 2, patron: "4x4" }  });
    let docCot = "";
    let docProp = "";
    if (conEnvio) {
      const doc = (nombre: string) =>
        e.admin.documento.create({
          data: { tenantId, nombre, titulo: nombre, mime: "application/pdf", tamano: 10, storageKey: `t/${nombre}`, sha256: "0".repeat(64), estado: "disponible", origen: "generado", moduloOrigen: "cpq", creadoPorTipo: "system", confirmadoEn: new Date() },
        });
      docCot = (await doc(`Cotizacion-${codigo}.pdf`)).id;
      docProp = (await doc(`Propuesta-${codigo}.pdf`)).id;
      await e.admin.cpqPropuestaEnvio.create({
        data: { tenantId, cotizacionId: cot.id, versionId: v.id, estado: "enviado", destinatariosJson: "[]", snapshotJson: "{}", solicitadoPorId: contacto, enviadoEn: new Date(), documentoCotizacionId: docCot, documentoPropuestaId: docProp },
      });
    }
    return { id: cot.id, docCot, docProp };
  }
  const sis = async <T>(tenantId: string, id: string, input: unknown) => {
    const r = (await mod.executeCapability(
      mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["comercial", "cpq"], medidor }),
      id,
      input,
    )) as Res<T>;
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data;
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial, ...mod.capacidadesPortalCliente, ...capacidadesCpq]);
    registrarModuloComercial();
    const crear = (n: string) => e.admin.tenant.create({ data: { slug: `pc-${n}-${sufijo}`, nombre: n, vertical: "seguridad" } });
    t = { a: (await crear("a")).id, b: (await crear("b")).id };
    for (const u of [contacto, ajeno, prospecto]) await e.admin.user.create({ data: { id: u, email: `${u.slice(0, 8)}-${sufijo}@prueba.cl`, name: "u", emailVerified: true } });
    const cuenta = (tenantId: string, nombre: string) => e.admin.cuenta.create({ data: { tenantId, nombre } });
    for (const id of [t.a, t.b]) await sembrarComercial(e.admin.$extends({}), id);
    const cx = await cuenta(t.a, "Cuenta X");
    const cy = await cuenta(t.a, "Cuenta Y");
    const cb = await cuenta(t.b, "Cuenta B");
    const m = await e.admin.membership.create({ data: { tenantId: t.a, userId: contacto, rol: "viewer", portales: ["cliente"] } });
    await e.admin.accesoCliente.create({ data: { tenantId: t.a, membershipId: m.id, cuentaId: cx.id, estado: "activo", todasInstalaciones: true } });
    const x = await cotizacion(t.a, cx.id, `CPQ-X-${sufijo}`, "enviada", true);
    const bx = await cotizacion(t.a, cx.id, `CPQ-XB-${sufijo}`, "borrador");
    const y = await cotizacion(t.a, cy.id, `CPQ-Y-${sufijo}`, "enviada", true);
    const b = await cotizacion(t.b, cb.id, `CPQ-B-${sufijo}`, "enviada", true);
    const cz = await cuenta(t.a, "Prospecto Z");
    const mz = await e.admin.membership.create({ data: { tenantId: t.a, userId: prospecto, rol: "viewer", portales: ["cliente"] } });
    const az = await e.admin.accesoCliente.create({ data: { tenantId: t.a, membershipId: mz.id, cuentaId: cz.id, estado: "activo", alcance: "limitado", todasInstalaciones: false } });
    const z1 = await cotizacion(t.a, cz.id, `CPQ-Z1-${sufijo}`, "enviada", true);
    const z2 = await cotizacion(t.a, cz.id, `CPQ-Z2-${sufijo}`, "enviada", true);
    const z3 = await cotizacion(t.a, cz.id, `CPQ-Z3-${sufijo}`, "enviada", true);
    await e.admin.accesoPropuesta.create({ data: { tenantId: t.a, accesoId: az.id, cotizacionId: z1.id, enviadaEn: new Date(), estado: "vigente" } });
    await e.admin.accesoPropuesta.create({ data: { tenantId: t.a, accesoId: az.id, cotizacionId: z3.id, enviadaEn: new Date(), estado: "reemplazada" } });
    pz = { acceso: az.id, vigente: z1.id, sinPropuesta: z2.id, reemplazada: z3.id, docProp: z1.docProp };
    ids = { enviadaX: x.id, borradorX: bx.id, enviadaY: y.id, enviadaB: b.id, docCot: x.docCot, docProp: x.docProp };
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("el contacto lista solo las enviadas de su cuenta, con IVA y total", async () => {
    const r = await comoContacto<{ items: { cotizacionId: string; netoMensualClp: number; ivaClp: number; totalMensualClp: number; tienePropuesta: boolean }[] }>(t.a, contacto, "cpq.portal_cotizaciones.list", {});
    expect(r.ok && r.data.items.map((i) => i.cotizacionId)).toEqual([ids.enviadaX]);
    expect(r.ok && r.data.items[0]).toMatchObject({ netoMensualClp: 1_000_000, ivaClp: 190_000, totalMensualClp: 1_190_000, tienePropuesta: true });
  });

  it("no ve el borrador, ni otra cuenta de su empresa, ni otra empresa (get y descarga)", async () => {
    for (const id of [ids.borradorX, ids.enviadaY, ids.enviadaB]) {
      expect((await comoContacto(t.a, contacto, "cpq.portal_cotizaciones.get", { cotizacionId: id })).ok).toBe(false);
      expect((await comoContacto(t.a, contacto, "cpq.portal_cotizaciones.descargar", { cotizacionId: id, tipo: "cotizacion" })).ok).toBe(false);
    }
  });

  it("muestra el detalle sin costos y entrega URL firmada de ambos PDF de su cotización", async () => {
    const g = await comoContacto<{ secciones: { puestos: { nombre: string }[] }[]; documentos: { tipo: string }[] }>(t.a, contacto, "cpq.portal_cotizaciones.get", { cotizacionId: ids.enviadaX });
    expect(g.ok && g.data.secciones[0]?.puestos[0]?.nombre).toBe("Guardia 4x4");
    expect(g.ok && g.data.documentos.map((d) => d.tipo)).toEqual(["cotizacion", "propuesta"]);
    expect(JSON.stringify(g)).not.toMatch(/costo|margen|sueldo/i);
    for (const [tipo, doc] of [["cotizacion", ids.docCot], ["propuesta", ids.docProp]] as const) {
      const d = await comoContacto<{ documentoId: string; url: string }>(t.a, contacto, "cpq.portal_cotizaciones.descargar", { cotizacionId: ids.enviadaX, tipo });
      expect(d.ok && d.data.documentoId).toBe(doc);
    }
  });

  it("una sesión sin acceso de cliente activo no ve nada", async () => {
    expect((await comoContacto(t.a, ajeno, "cpq.portal_cotizaciones.list", {})).ok).toBe(false);
  });

  it("un prospecto (acceso limitado) ve solo su propuesta vigente y puede descargarla (CAR-300)", async () => {
    const l = await comoContacto<{ items: { cotizacionId: string }[] }>(t.a, prospecto, "cpq.portal_cotizaciones.list", {});
    expect(l.ok && l.data.items.map((i) => i.cotizacionId)).toEqual([pz.vigente]);
    for (const id of [pz.sinPropuesta, pz.reemplazada, ids.enviadaX, ids.enviadaB]) {
      expect((await comoContacto(t.a, prospecto, "cpq.portal_cotizaciones.get", { cotizacionId: id })).ok).toBe(false);
      expect((await comoContacto(t.a, prospecto, "cpq.portal_cotizaciones.descargar", { cotizacionId: id, tipo: "propuesta" })).ok).toBe(false);
    }
    const d = await comoContacto<{ documentoId: string }>(t.a, prospecto, "cpq.portal_cotizaciones.descargar", { cotizacionId: pz.vigente, tipo: "propuesta" });
    expect(d.ok && d.data.documentoId).toBe(pz.docProp);
  });

  it("una propuesta con vigencia vencida deja de verse aunque su estado siga «vigente» (CAR-300)", async () => {
    const donde = { accesoId: pz.acceso, cotizacionId: pz.vigente };
    await e.admin.accesoPropuesta.updateMany({ where: donde, data: { vigenteHasta: new Date(Date.now() - 60_000) } });
    const l = await comoContacto<{ items: unknown[] }>(t.a, prospecto, "cpq.portal_cotizaciones.list", {});
    expect(l.ok && l.data.items).toEqual([]);
    expect((await comoContacto(t.a, prospecto, "cpq.portal_cotizaciones.get", { cotizacionId: pz.vigente })).ok).toBe(false);
    await e.admin.accesoPropuesta.updateMany({ where: donde, data: { vigenteHasta: new Date(Date.now() + 86_400_000) } });
    const v = await comoContacto<{ items: unknown[] }>(t.a, prospecto, "cpq.portal_cotizaciones.list", {});
    expect(v.ok && v.data.items).toHaveLength(1);
    await e.admin.accesoPropuesta.updateMany({ where: donde, data: { vigenteHasta: null } });
  });

  it("al archivar la propuesta vigente, el prospecto deja de verla y el acceso limitado sigue sin abrir el portal completo", async () => {
    await e.admin.accesoPropuesta.updateMany({ where: { accesoId: pz.acceso, cotizacionId: pz.vigente }, data: { estado: "archivada" } });
    const l = await comoContacto<{ items: unknown[] }>(t.a, prospecto, "cpq.portal_cotizaciones.list", {});
    expect(l.ok && l.data.items).toEqual([]);
    expect((await comoContacto(t.a, prospecto, "portal_cliente.resumen.leer", {})).ok).toBe(false);
  });

  it("archivar la cotización o el negocio oculta la propuesta al prospecto y restaurar la devuelve", async () => {
    await e.admin.accesoPropuesta.updateMany({ where: { accesoId: pz.acceso, cotizacionId: pz.vigente }, data: { estado: "vigente" } });
    const lista = async () => {
      const l = await comoContacto<{ items: { cotizacionId: string }[] }>(t.a, prospecto, "cpq.portal_cotizaciones.list", {});
      return l.ok ? l.data.items.map((i) => i.cotizacionId) : null;
    };
    expect(await lista()).toEqual([pz.vigente]);
    await e.admin.cpqCotizacion.update({ where: { id: pz.vigente }, data: { archivadaEn: new Date() } });
    expect(await lista()).toEqual([]);
    expect((await comoContacto(t.a, prospecto, "cpq.portal_cotizaciones.descargar", { cotizacionId: pz.vigente, tipo: "propuesta" })).ok).toBe(false);
    await e.admin.cpqCotizacion.update({ where: { id: pz.vigente }, data: { archivadaEn: null } });
    expect(await lista()).toEqual([pz.vigente]);
  });

  it("al ganar la cuenta (cliente activo) el acceso limitado abre el portal completo; si estaba suspendido, sigue cerrado (CAR-300)", async () => {
    const cuentaZ = (await e.admin.accesoCliente.findUniqueOrThrow({ where: { id: pz.acceso } })).cuentaId;
    expect((await comoContacto(t.a, prospecto, "portal_cliente.resumen.leer", {})).ok).toBe(false);
    await e.admin.cuenta.update({ where: { id: cuentaZ }, data: { estado: "cliente_activo" } });
    expect((await comoContacto(t.a, prospecto, "portal_cliente.resumen.leer", {})).ok).toBe(true);
    await e.admin.accesoCliente.update({ where: { id: pz.acceso }, data: { estado: "suspendido" } });
    expect((await comoContacto(t.a, prospecto, "portal_cliente.resumen.leer", {})).ok).toBe(false);
    await e.admin.accesoCliente.update({ where: { id: pz.acceso }, data: { estado: "activo" } });
    await e.admin.cuenta.update({ where: { id: cuentaZ }, data: { estado: "prospecto" } });
  });

  it("mi_acceso deja entrar al prospecto y le informa su alcance «limitado» (CAR-300)", async () => {
    const r = await comoContacto<{ limitado: boolean; alcance: string }>(t.a, prospecto, "portal_cliente.mi_acceso", {});
    expect(r.ok && r.data.alcance).toBe("limitado");
    const c = await comoContacto<{ alcance: string }>(t.a, contacto, "portal_cliente.mi_acceso", {});
    expect(c.ok && c.data.alcance).toBe("completo");
  });
});
