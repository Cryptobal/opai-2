// CAR-27 · Transferir negocios a otro responsable (uno o varios, o la cartera de una persona) contra
// Postgres real: solo negocios abiertos y sin archivar; sus tareas pendientes pasan al nuevo responsable;
// la vista previa no escribe; el nuevo responsable recibe un aviso; otra empresa no se toca.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { sembrarComercial } from "@opai/db";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";
import { registrarModuloComercial } from "./comercial-modulo";

type Resumen = { negocios: number; valorMensual: number; tareas: number; omitidos: { id: string; motivo: string }[] };

describe.skipIf(!urlPropietario)("comercial · transferir negocios (CAR-27)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tA = "";
  let tB = "";
  const sufijo = randomUUID().slice(0, 8);
  const medidor = { registrar: async () => undefined };
  const ctx = (tenantId = tA) =>
    mod.crearContexto({ tenantId, actor: { tipo: "system" }, rol: "owner", modulosActivos: ["comercial"], medidor });
  async function dato<T>(id: string, input: unknown, dryRun = false, tenantId = tA) {
    const r = await mod.executeCapability(ctx(tenantId), id, input, { dryRun });
    if (!r.ok) throw new Error(`${id}: ${JSON.stringify(r.error)}`);
    return r.data as T;
  }
  async function usuario(nombre: string, tenantId = tA) {
    const u = await e.admin.user.create({ data: { email: `${nombre}-${sufijo}@prueba.cl`, name: nombre, emailVerified: true } });
    await e.admin.membership.create({ data: { tenantId, userId: u.id, rol: "admin" } });
    return u.id;
  }
  async function negocio(responsableId: string, titulo: string, monto: number, tenantId = tA) {
    const cuentaId = (await dato<{ id: string }>("core.cuentas.create", { nombre: `C ${titulo}` }, false, tenantId)).id;
    return (await dato<{ id: string }>("comercial.negocios.create", { cuentaId, titulo, responsableId, montoEstimadoMensual: monto }, false, tenantId)).id;
  }
  async function tarea(negocioId: string, responsableId: string, estado = "pendiente") {
    return (
      await e.admin.actividad.create({
        data: {
          tenantId: tA, tipo: "tarea", titulo: "Llamar", estado, prioridad: "media",
          vinculos: { create: { tenantId: tA, negocioId } },
          responsables: { create: { tenantId: tA, usuarioId: responsableId } },
        },
      })
    ).id;
  }
  const responsablesDe = async (actividadId: string) =>
    (await e.admin.actividadResponsable.findMany({ where: { actividadId } })).map((r) => r.usuarioId);

  let matias = "";
  let francisca = "";
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesComercial]);
    registrarModuloComercial();
    tA = (await e.admin.tenant.create({ data: { slug: `tr-${sufijo}`, nombre: "tr", vertical: "seguridad" } })).id;
    tB = (await e.admin.tenant.create({ data: { slug: `trb-${sufijo}`, nombre: "trb", vertical: "seguridad" } })).id;
    await sembrarComercial(e.admin.$extends({}), tA);
    await sembrarComercial(e.admin.$extends({}), tB);
    matias = await usuario("matias");
    francisca = await usuario("francisca");
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("transfiere los negocios elegidos y sus tareas pendientes; la vista previa no escribe", async () => {
    const n1 = await negocio(matias, "Clínica", 1_000_000);
    const n2 = await negocio(matias, "Bodega", 500_000);
    const t1 = await tarea(n1, matias);
    const hecha = await tarea(n1, matias, "hecha");
    const entrada = { negocioIds: [n1, n2], nuevoResponsableId: francisca, mensaje: "Te paso estos dos." };
    const previa = await dato<Resumen>("comercial.negocios.transferir", entrada, true);
    expect([previa.negocios, previa.valorMensual, previa.tareas]).toEqual([2, 1_500_000, 1]);
    expect((await e.admin.negocio.findUniqueOrThrow({ where: { id: n1 } })).responsableId).toBe(matias);

    const r = await dato<Resumen>("comercial.negocios.transferir", entrada);
    expect([r.negocios, r.tareas, r.omitidos]).toEqual([2, 1, []]);
    for (const id of [n1, n2]) expect((await e.admin.negocio.findUniqueOrThrow({ where: { id } })).responsableId).toBe(francisca);
    expect(await responsablesDe(t1)).toEqual([francisca]);
    expect(await responsablesDe(hecha)).toEqual([matias]);
    const aviso = await e.admin.notificacion.findFirstOrThrow({ where: { tenantId: tA, usuarioId: francisca } });
    expect(aviso.titulo).toContain("2 negocios");
    expect(aviso.cuerpo).toContain("Te paso estos dos.");
  });

  it("la cartera de una persona: solo sus negocios abiertos y sin tareas si se pide", async () => {
    const otro = await usuario("otro");
    const abierto = await negocio(otro, "Abierto", 100_000);
    // El estado sale de la etapa (trigger): un negocio archivado sirve de «no abierto» sin pasar por ganar o perder.
    const perdido = await negocio(otro, "Archivado", 100_000);
    await e.admin.negocio.update({ where: { id: perdido }, data: { archivadoEn: new Date() } });
    const t = await tarea(abierto, otro);
    const r = await dato<Resumen>("comercial.negocios.transferir", { deResponsableId: otro, nuevoResponsableId: francisca, incluirTareas: false });
    expect([r.negocios, r.tareas]).toEqual([1, 0]);
    expect((await e.admin.negocio.findUniqueOrThrow({ where: { id: perdido } })).responsableId).toBe(otro);
    expect(await responsablesDe(t)).toEqual([otro]);
  });

  it("omite cerrados, ajenos y los que ya son del nuevo responsable; rechaza un responsable de otra empresa", async () => {
    const cerrado = await negocio(matias, "Cerrado", 1);
    await e.admin.negocio.update({ where: { id: cerrado }, data: { archivadoEn: new Date() } });
    const propio = await negocio(francisca, "Propio", 1);
    const ajeno = await negocio(await usuario("b", tB), "Ajeno", 1, tB);
    const r = await dato<Resumen>("comercial.negocios.transferir", { negocioIds: [cerrado, propio, ajeno], nuevoResponsableId: francisca });
    expect(r.negocios).toBe(0);
    expect(r.omitidos.map((o) => o.motivo).sort()).toEqual(["no_abierto", "no_encontrado", "ya_es_responsable"]);
    const deOtra = await usuario("deotra", tB);
    const x = await mod.executeCapability(ctx(), "comercial.negocios.transferir", { negocioIds: [propio], nuevoResponsableId: deOtra });
    expect(x.ok).toBe(false);
  });

  it("lista los responsables posibles con sus negocios abiertos, sin contactos de clientes", async () => {
    const cliente = await e.admin.user.create({ data: { email: `cli-${sufijo}@prueba.cl`, name: "Cliente", emailVerified: true } });
    await e.admin.membership.create({ data: { tenantId: tA, userId: cliente.id, rol: "viewer", portales: ["cliente"] } });
    const lista = await dato<{ id: string; nombre: string; abiertos: number }[]>("comercial.negocios.responsables", {});
    expect(lista.some((r) => r.id === cliente.id)).toBe(false);
    expect(lista.find((r) => r.id === francisca)?.abiertos).toBeGreaterThan(0);
  });

  it("rechaza como nuevo responsable a un usuario del Portal Cliente", async () => {
    const propio = await negocio(francisca, "Para cliente", 1);
    const cliente = await e.admin.user.create({ data: { email: `cli2-${sufijo}@prueba.cl`, name: "Cliente 2", emailVerified: true } });
    await e.admin.membership.create({ data: { tenantId: tA, userId: cliente.id, rol: "viewer", portales: ["cliente"] } });
    const x = await mod.executeCapability(ctx(), "comercial.negocios.transferir", { negocioIds: [propio], nuevoResponsableId: cliente.id });
    expect(x.ok).toBe(false);
    expect((await e.admin.negocio.findUniqueOrThrow({ where: { id: propio } })).responsableId).toBe(francisca);
  });
});
