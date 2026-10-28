// CAR-39 (Brief 07d §21): orden y cursor de los lotes de retención, exclusión por correo en
// contactos, carreras al escribir sobre un titular anonimizado y vista previa de la anonimización
// con otras solicitudes abiertas. Contra Postgres real (opai_app sin BYPASSRLS).
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const HACE = (dias: number) => new Date(Date.now() - dias * 86_400_000);

describe.skipIf(!urlPropietario)("cumplimiento §21 (CAR-39) en base real", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let t = "";
  let u = "";
  let cuenta = "";
  const s = randomUUID().slice(0, 8);

  const ctx = () =>
    mod.crearContexto({
      tenantId: t,
      actor: { tipo: "user", id: u },
      portal: "erp",
      portalesMembresia: ["erp"],
      usuario: { id: u, nombre: "ana", email: "ana@prueba.cl", platformRole: null },
      rol: "owner",
      medidor: { registrar: async () => undefined },
    });
  const contacto = (email: string | null, extra: Record<string, unknown> = {}) =>
    e.admin.contacto.create({
      data: { tenantId: t, cuentaId: cuenta, nombres: "C", apellidos: email ?? "sin", email, ...extra },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    t = (await e.admin.tenant.create({ data: { slug: `car39-${s}`, nombre: "car39", vertical: "seguridad" } })).id;
    u = (await e.admin.user.create({ data: { name: "ana", email: `ana-${s}@prueba.cl`, emailVerified: true } })).id;
    await e.admin.membership.create({ data: { tenantId: t, userId: u, rol: "owner", portales: ["erp"] } });
    cuenta = (await e.admin.cuenta.create({ data: { tenantId: t, nombre: "Cliente" } })).id;
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("excluye del lote y de la simulación al contacto con solicitud abierta solo por correo", async () => {
    const { EJECUTORES, exclusionesAbiertas } = await import("../src/core/cumplimiento/retencion-reglas");
    const ej = EJECUTORES.find((x) => x.regla.tabla === "contactos");
    if (!ej) throw new Error("falta el ejecutor de contactos");
    const pedido = await contacto(`pide-${s}@x.cl`, { archivadoEn: HACE(900) });
    const libre = await contacto(`libre-${s}@x.cl`, { archivadoEn: HACE(900) });
    const sinCorreo = await contacto(null, { archivadoEn: HACE(900) });
    await e.admin.solicitudArco.create({ data: { tenantId: t, tipo: "acceso", titularEmail: `pide-${s}@x.cl` } });
    const ex = await exclusionesAbiertas(ctx());
    expect(ex.emails).toContain(`pide-${s}@x.cl`);
    const corte = HACE(730);
    const l = await ej.lote(ctx(), corte, ex, 100, null, new Date(), 730);
    expect(l.ids).toEqual(expect.arrayContaining([libre.id, sinCorreo.id]));
    expect(l.ids).not.toContain(pedido.id);
    expect(await ej.contar(ctx(), corte, ex, 2000)).toBe(l.ids.length);
    expect(await ej.contar(ctx(), corte, ex, 1)).toBe(1); // la simulación respeta el tope
  });

  it("los lotes van ordenados por id y el cursor avanza aunque el lote no cambie nada", async () => {
    const { EJECUTORES } = await import("../src/core/cumplimiento/retencion-reglas");
    const ej = EJECUTORES.find((x) => x.regla.tabla === "envios");
    if (!ej) throw new Error("falta el ejecutor de envíos");
    for (let i = 0; i < 3; i++)
      await e.admin.envio.create({ data: { tenantId: t, canal: "email", destinatario: `c${i}@x.cl`, estado: "enviado", createdAt: HACE(800) } });
    const ex = { persona: [], contacto: [], emails: [] };
    const uno = await ej.lote(ctx(), HACE(365), ex, 2, null, new Date(), 365);
    expect(uno.ids).toEqual([...uno.ids].sort());
    const dos = await ej.lote(ctx(), HACE(365), ex, 2, uno.ultimo, new Date(), 365);
    expect(dos.ids.length).toBe(1);
    expect(dos.ids[0] && uno.ultimo && dos.ids[0] > uno.ultimo).toBe(true);
    const tres = await ej.lote(ctx(), HACE(365), ex, 2, dos.ultimo, new Date(), 365);
    expect(tres).toEqual({ ids: [], ultimo: null });
  });

  it("con un lote que no cambia nada, la regla sigue con el siguiente (no se detiene)", async () => {
    const { correrRegla } = await import("../src/core/cumplimiento/retencion-trabajo");
    const { EJECUTORES } = await import("../src/core/cumplimiento/retencion-reglas");
    const base = EJECUTORES.find((x) => x.regla.tabla === "envios");
    if (!base) throw new Error("falta el ejecutor de envíos");
    const env = await e.admin.envio.create({ data: { tenantId: t, canal: "email", destinatario: `sigue-${s}@x.cl`, estado: "enviado", createdAt: HACE(800) } });
    let llamadas = 0;
    const r = await correrRegla(
      ctx(),
      {
        ...base,
        lote: async () => {
          llamadas += 1;
          if (llamadas === 1) return { ids: [randomUUID()], ultimo: "00000000-0000-0000-0000-000000000000" };
          if (llamadas === 2) return { ids: [env.id], ultimo: env.id };
          return { ids: [], ultimo: null };
        },
      },
      365,
      new Date(),
      true,
    );
    expect(r?.filas).toBe(1);
    expect((await e.admin.envio.findUniqueOrThrow({ where: { id: env.id } })).destinatario).toBe("[anonimizado]");
  });

  it("una escritura que llega tras la anonimización falla dentro de su transacción", async () => {
    const c = await contacto(`carrera-${s}@x.cl`);
    const { bloquearNoAnonimizado } = await import("../src/core/maestros/anonimizado");
    const { anonimizarContacto } = await import("../src/core/cumplimiento/retencion-anonimizar");
    // Simula la carrera: la escritura ya validó (sin anonimizar) y la anonimización confirma antes.
    expect(await ctx().transaccion((tx) => anonimizarContacto(tx, c.id, new Date(), null))).toBe(true);
    await expect(ctx().transaccion((tx) => bloquearNoAnonimizado(tx, "contacto", c.id))).rejects.toThrow(/anonimizado/);
    const r = await mod.executeCapability(ctx(), "core.contactos.update", { id: c.id, cargo: "Gerente" });
    expect(!r.ok && r.error.code).toBe("UNPROCESSABLE");
  });

  it("la vista previa de anonimizar avisa que hay otras solicitudes abiertas", async () => {
    const c = await contacto(`previa-${s}@x.cl`);
    await e.admin.solicitudArco.create({ data: { tenantId: t, tipo: "acceso", titularTipo: "contacto", titularId: c.id } });
    const r = await mod.executeCapability(
      ctx(),
      "core.cumplimiento.titular_anonimizar",
      { titular: { tipo: "contacto", id: c.id }, motivo: "Pedido del titular" },
      { dryRun: true },
    );
    expect(r.ok && r.data).toMatchObject({ elegible: false, anonimizado: false });
    expect(r.ok ? (r.data as { motivo: string | null }).motivo : null).toMatch(/otras solicitudes abiertas/);
  });
});
