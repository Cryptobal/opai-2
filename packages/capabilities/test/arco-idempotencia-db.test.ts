import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PERMISOS_CORE } from "@opai/domain";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";
import type * as Capacidades from "../src";

describe.skipIf(!urlPropietario)("ARCO: idempotencia no conserva autorizaciones revocadas", () => {
  let e: Entorno;
  let mod: typeof Capacidades;
  let tenantId = "",
    cuentaA = "",
    cuentaB = "",
    instalacionId = "",
    contactoId = "";
  const actorId = randomUUID();
  const contexto = (instalaciones: string[] | null) =>
    mod.crearContexto({
      tenantId,
      rol: instalaciones ? "supervisor" : "owner",
      actor: { tipo: "user", id: actorId },
      portal: "erp",
      portalesMembresia: ["erp"],
      alcance: instalaciones ? { instalaciones } : null,
      permisosRol: [PERMISOS_CORE.cumplimientoRead, PERMISOS_CORE.cumplimientoManage],
      medidor: { registrar: async () => undefined },
    });
  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    tenantId = (
      await e.admin.tenant.create({
        data: { slug: `arco-repeticion-${randomUUID()}`, nombre: "Prueba", vertical: "seguridad" },
      })
    ).id;
    cuentaA = (await e.admin.cuenta.create({ data: { tenantId, nombre: "A" } })).id;
    cuentaB = (await e.admin.cuenta.create({ data: { tenantId, nombre: "B" } })).id;
    instalacionId = (
      await e.admin.instalacion.create({
        data: { tenantId, cuentaId: cuentaA, nombre: "A" },
      })
    ).id;
    contactoId = (
      await e.admin.contacto.create({
        data: { tenantId, cuentaId: cuentaA, nombres: "Ficticio", apellidos: "Prueba" },
      })
    ).id;
  });
  afterAll(async () => {
    await e?.cerrar();
  });

  it("no revela una creación externa previa a un actor ahora acotado ni repite su efecto", async () => {
    const id = "core.cumplimiento.solicitud_crear";
    const input = { tipo: "acceso", titularEmail: "ficticio@example.test" };
    const opciones = { idempotencyKey: "externa" };
    expect(await mod.executeCapability(contexto(null), id, input, opciones)).toMatchObject({
      ok: true,
    });
    expect(await mod.executeCapability(contexto([]), id, input, opciones)).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(
      await mod.executeCapability(contexto([]), id, input, { idempotencyKey: "nueva" }),
    ).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(await mod.executeCapability(contexto(null), id, input, opciones)).toMatchObject({
      ok: true,
      repetida: true,
    });
    expect(
      await e.admin.solicitudArco.count({ where: { tenantId, titularEmail: input.titularEmail } }),
    ).toBe(1);
  });

  it("revalida crear, avanzar, resolver y exportar tras perder instalaciones o reasignar el contacto", async () => {
    const crear = "core.cumplimiento.solicitud_crear";
    const inputCrear = { tipo: "acceso", titular: { tipo: "contacto", id: contactoId } };
    const ctx = contexto([instalacionId]);
    const creada = await mod.executeCapability(ctx, crear, inputCrear, { idempotencyKey: "crear" });
    expect(creada.ok).toBe(true);
    if (!creada.ok) throw new Error("No se creó la solicitud de prueba");
    const solicitudId = (creada.data as { id: string }).id;
    const llamadas = [
      { id: crear, input: inputCrear, clave: "crear" },
      { id: "core.cumplimiento.solicitud_avanzar", input: { id: solicitudId }, clave: "avanzar" },
      {
        id: "core.cumplimiento.solicitud_resolver",
        input: { id: solicitudId, estado: "resuelta", resultado: "Resuelta" },
        clave: "resolver",
      },
      { id: "core.cumplimiento.solicitud_exportar", input: { solicitudId }, clave: "exportar" },
    ];
    for (const llamada of llamadas.slice(1, 3))
      expect(
        await mod.executeCapability(ctx, llamada.id, llamada.input, {
          idempotencyKey: llamada.clave,
        }),
      ).toMatchObject({ ok: true });
    // Respuesta persistida de una exportación ya hecha: repetir nunca debe llamar almacenamiento.
    const exportar = llamadas[3]!;
    const reserva = await ctx.idempotencia.reservar(exportar.id, exportar.clave, exportar.input);
    if (reserva.estado !== "nueva") throw new Error("La reserva de prueba ya existe");
    await ctx.idempotencia.completar(reserva.id, {
      documentoId: randomUUID(),
      sha256: "a".repeat(64),
      bytes: 10,
      titular: { tipo: "contacto", id: contactoId },
    });
    const eventosAntes = await e.admin.auditEvent.count({ where: { tenantId } });
    for (const c of [contexto([]), contexto([instalacionId])]) {
      if (c.alcance?.instalaciones.length)
        await e.admin.contacto.update({ where: { id: contactoId }, data: { cuentaId: cuentaB } });
      for (const llamada of llamadas)
        expect(
          await mod.executeCapability(c, llamada.id, llamada.input, {
            idempotencyKey: llamada.clave,
          }),
        ).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    }
    await e.admin.contacto.update({ where: { id: contactoId }, data: { cuentaId: cuentaA } });
    for (const llamada of llamadas)
      expect(
        await mod.executeCapability(ctx, llamada.id, llamada.input, {
          idempotencyKey: llamada.clave,
        }),
      ).toMatchObject({ ok: true, repetida: true });
    expect(await e.admin.auditEvent.count({ where: { tenantId } })).toBe(eventosAntes);
    expect(await e.admin.solicitudArco.count({ where: { tenantId, titularId: contactoId } })).toBe(
      1,
    );
  });
});
