// CAR-356 · Publicar la pauta de una instalación y mes: la vista previa no escribe, publicar registra quién y cuándo,
// emite `pauta.publicada` con los turnos de cada titular y el consumidor avisa en la campana solo a quien tiene
// usuario (una vez por evento). Tenant y alcance en la consulta, contra Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type Capacidades = typeof ModuloCapacidades;

describe.skipIf(!urlPropietario)("Pauta · publicar y avisar (Postgres real)", () => {
  let e: Entorno;
  let mod: Capacidades;
  let tenantA = "";
  let tenantB = "";
  let inst = "";
  let usuarioJuan = "";
  const medidor = { registrar: async () => undefined };
  const dia = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  // Un mes que empieza en el futuro: la serie rige completa en él.
  const primero = (() => {
    const d = new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 2, 1))
      .toISOString()
      .slice(0, 10);
  })();
  const mes = primero.slice(0, 7);

  const ctx = (tenantId: string, alcance: { instalaciones: readonly string[] } | null = null) =>
    mod.crearContexto({
      tenantId,
      actor: { tipo: "user", id: randomUUID() },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: alcance ? "supervisor" : "owner",
      ...(alcance ? { alcance } : {}),
      modulosActivos: ["pauta"],
      medidor,
    });
  const run = (c: ReturnType<typeof ctx>, id: string, input: unknown, o = {}) =>
    mod.executeCapability(c, id, input, o);

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesPauta]);
    const tenant = async (slug: string) =>
      (
        await e.admin.tenant.create({
          data: {
            slug: `${slug}-${randomUUID().slice(0, 8)}`,
            nombre: slug,
            vertical: "seguridad",
          },
        })
      ).id;
    tenantA = await tenant("pub-a");
    tenantB = await tenant("pub-b");
    const cuenta = (await e.admin.cuenta.create({ data: { tenantId: tenantA, nombre: "Cuenta" } }))
      .id;
    inst = (
      await e.admin.instalacion.create({
        data: { tenantId: tenantA, cuentaId: cuenta, nombre: "Planta" },
      })
    ).id;
    const cargo = (await e.admin.cargo.create({ data: { tenantId: tenantA, nombre: "Guardia" } }))
      .id;
    const patron = (
      await e.admin.patronTurno.create({
        data: { tenantId: tenantA, nombre: "4x4", diasTrabajo: 4, diasDescanso: 4 },
      })
    ).id;
    const puesto = async (nombre: string) =>
      (
        await e.admin.puesto.create({
          data: {
            tenantId: tenantA,
            instalacionId: inst,
            cargoId: cargo,
            nombre,
            diasTrabajo: 4,
            diasDescanso: 4,
            horaInicio: "08:00",
            horaFin: "20:00",
          },
        })
      ).id;
    const s = randomUUID().slice(0, 8);
    usuarioJuan = (
      await e.admin.user.create({
        data: { name: "Juan", email: `juan-${s}@prueba.cl`, emailVerified: true },
      })
    ).id;
    // El usuario de una persona tiene que ser miembro de la empresa (trigger usuario_miembro).
    await e.admin.membership.create({
      data: { tenantId: tenantA, userId: usuarioJuan, rol: "viewer", portales: ["trabajador"] },
    });
    const persona = async (nombres: string, rut: string, usuarioId: string | null) => {
      const id = (
        await e.admin.persona.create({
          data: {
            tenantId: tenantA,
            nombres,
            apellidos: "Prueba",
            rut,
            estado: "activa",
            usuarioId,
          },
        })
      ).id;
      await e.admin.vinculoLaboral.create({
        data: {
          tenantId: tenantA,
          personaId: id,
          cargoId: cargo,
          instalacionId: inst,
          tipo: "indefinido",
          inicio: new Date("2026-01-01"),
          estado: "vigente",
        },
      });
      return id;
    };
    const juan = await persona("Juan", "11.111.111-1", usuarioJuan);
    const ana = await persona("Ana", "12.121.212-1", null);
    for (const [p, titular] of [
      [await puesto("Portería"), juan],
      [await puesto("Patio"), ana],
    ] as const) {
      const r = await run(ctx(tenantA), "pauta.series.fijar", {
        puestoId: p,
        patronId: patron,
        inicioCiclo: primero,
        titularPersonaId: titular,
        desde: dia(1),
      });
      expect(r, JSON.stringify(r)).toMatchObject({ ok: true });
    }
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("la vista previa cuenta titulares, usuarios y turnos sin escribir; un refuerzo no quita el día", async () => {
    const previo = await run(
      ctx(tenantA),
      "pauta.publicaciones.publicar",
      { instalacionId: inst, mes },
      { dryRun: true },
    );
    const puestoPorteria = (
      await e.admin.puesto.findFirstOrThrow({ where: { tenantId: tenantA, nombre: "Portería" } })
    ).id;
    await e.admin.excepcionPauta.create({
      data: {
        tenantId: tenantA,
        puestoId: puestoPorteria,
        fecha: new Date(`${primero}T00:00:00Z`),
        tipo: "refuerzo",
        motivo: "Evento",
      },
    });
    const r = await run(
      ctx(tenantA),
      "pauta.publicaciones.publicar",
      { instalacionId: inst, mes },
      { dryRun: true },
    );
    expect(r).toMatchObject({
      ok: true,
      data: { personas: 2, conUsuario: 1, publicadaEn: null, publicadaAntes: null },
    });
    expect(await e.admin.publicacionPauta.count({ where: { tenantId: tenantA } })).toBe(0);
    expect(r.ok && previo.ok && r.data.turnos).toBe(previo.ok ? previo.data.turnos : -1);
  });

  it("publicar registra, emite el evento y el consumidor avisa una sola vez a quien tiene usuario", async () => {
    const r = await run(ctx(tenantA), "pauta.publicaciones.publicar", { instalacionId: inst, mes });
    expect(r).toMatchObject({ ok: true, data: { personas: 2, conUsuario: 1 } });
    const fila = await e.admin.publicacionPauta.findFirstOrThrow({
      where: { tenantId: tenantA, instalacionId: inst, mes },
    });
    expect(fila.avisados).toBe(1);
    const ev = await e.admin.evento.findFirstOrThrow({
      where: { tenantId: tenantA, tipo: "pauta.publicada" },
    });
    const c = ctx(tenantA);
    await mod.consumidorPautaPublicada.handler(c, {
      ...ev,
      actorTipo: ev.actorTipo,
      payload: ev.payload,
    });
    await mod.consumidorPautaPublicada.handler(c, {
      ...ev,
      actorTipo: ev.actorTipo,
      payload: ev.payload,
    });
    const avisos = await e.admin.notificacion.findMany({
      where: { tenantId: tenantA, eventoId: ev.id },
    });
    expect(avisos).toHaveLength(1);
    expect(avisos[0]?.usuarioId).toBe(usuarioJuan);
    expect(avisos[0]?.titulo).toContain("está publicada");
    const lista = await run(ctx(tenantA), "pauta.publicaciones.listar", { mes });
    expect(lista).toMatchObject({
      ok: true,
      data: { publicaciones: [{ instalacionId: inst, avisados: 1 }] },
    });
  });

  it("otro tenant y un supervisor sin la instalación no la ven", async () => {
    const otro = await run(
      ctx(tenantB),
      "pauta.publicaciones.publicar",
      { instalacionId: inst, mes },
      { dryRun: true },
    );
    expect(otro).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    const sup = ctx(tenantA, { instalaciones: [randomUUID()] });
    expect(
      await run(
        sup,
        "pauta.publicaciones.publicar",
        { instalacionId: inst, mes },
        { dryRun: true },
      ),
    ).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND" },
    });
    expect(await run(sup, "pauta.publicaciones.listar", { mes })).toMatchObject({
      ok: true,
      data: { publicaciones: [] },
    });
  });
});
