// CAR-393 parte 2c: la ausencia sigue a la persona cuando cambia la pauta. Un titular asignado después de registrar
// su ausencia queda marcado en esos días, y al cambiar de titular se liberan los días del anterior. Postgres real.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

type R = { ok: boolean; data?: Record<string, unknown>; error?: { code: string } };

describe.skipIf(!urlPropietario)("Pauta · ausencias y cambios de titular (Postgres real)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  let tenant = "";
  let puesto = "";
  let juan = "";
  let ana = "";
  const dia = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
  const ctx = () =>
    mod.crearContexto({
      tenantId: tenant,
      actor: { tipo: "user", id: randomUUID() },
      portal: "erp",
      portalesMembresia: ["erp"],
      rol: "owner",
      modulosActivos: ["pauta"],
      medidor: { registrar: async () => undefined },
    });
  const run = async (id: string, input: unknown) =>
    (await mod.executeCapability(ctx(), id, input, {})) as R;
  const activas = (personaId: string) =>
    e.admin.excepcionPauta.findMany({
      where: { puestoId: puesto, personaId, estado: "activa" },
      select: { fecha: true, ausenciaId: true },
      orderBy: { fecha: "asc" },
    });
  const fechas = (xs: { fecha: Date }[]) => xs.map((x) => x.fecha.toISOString().slice(0, 10));

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesPauta]);
    tenant = (
      await e.admin.tenant.create({
        data: { slug: `qa-arrastre-${randomUUID().slice(0, 8)}`, nombre: "QA", vertical: "seguridad" },
      })
    ).id;
    const cuenta = (await e.admin.cuenta.create({ data: { tenantId: tenant, nombre: "Cuenta" } })).id;
    const inst = (
      await e.admin.instalacion.create({ data: { tenantId: tenant, cuentaId: cuenta, nombre: "Planta" } })
    ).id;
    const cargo = (await e.admin.cargo.create({ data: { tenantId: tenant, nombre: "Guardia" } })).id;
    const patron = (
      await e.admin.patronTurno.create({
        data: { tenantId: tenant, nombre: "4x4", diasTrabajo: 4, diasDescanso: 4 },
      })
    ).id;
    puesto = (
      await e.admin.puesto.create({
        data: {
          tenantId: tenant,
          instalacionId: inst,
          cargoId: cargo,
          patronId: patron,
          nombre: "Portería · Día",
          diasTrabajo: 4,
          diasDescanso: 4,
          horaInicio: "08:00",
          horaFin: "20:00",
        },
      })
    ).id;
    const persona = async (nombres: string, rut: string) => {
      const id = (
        await e.admin.persona.create({
          data: { tenantId: tenant, nombres, apellidos: "Ficticia", rut, estado: "activa" },
        })
      ).id;
      await e.admin.vinculoLaboral.create({
        data: {
          tenantId: tenant,
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
    juan = await persona("Juan", "11.111.111-1");
    ana = await persona("Ana", "12.121.212-1");
  });

  afterAll(async () => {
    await e?.cerrar();
  });

  it("al asignar después al titular, sus turnos dentro de la ausencia quedan marcados", async () => {
    const r = await run("core.ausencias.registrar", {
      personaId: juan,
      tipo: "vacaciones",
      motivo: "Vacaciones",
      desde: dia(10),
      hasta: dia(15),
    });
    expect(r, JSON.stringify(r)).toMatchObject({ ok: true, data: { dias: 0 } });
    const asignar = await run("pauta.titular.asignar", {
      puestoId: puesto,
      titularPersonaId: juan,
      desde: dia(1),
      inicioCiclo: dia(1),
    });
    expect(asignar.ok, JSON.stringify(asignar)).toBe(true);
    // 4×4 desde el día 1: trabaja 1-4, 9-12, 17-20; dentro de la ausencia, 10, 11 y 12.
    const marcadas = await activas(juan);
    expect(fechas(marcadas)).toEqual([dia(10), dia(11), dia(12)]);
    expect(new Set(marcadas.map((m) => m.ausenciaId))).toEqual(new Set([r.data?.["ausenciaId"]]));
  });

  it("al cambiar de titular se liberan los días del anterior y anular libera solo lo que queda", async () => {
    const asignar = await run("pauta.titular.asignar", {
      puestoId: puesto,
      titularPersonaId: ana,
      desde: dia(11),
      inicioCiclo: dia(11),
    });
    expect(asignar.ok, JSON.stringify(asignar)).toBe(true);
    expect(fechas(await activas(juan))).toEqual([dia(10)]);
    expect(await activas(ana)).toEqual([]);
    const [registro] = await e.admin.ausencia.findMany({ where: { personaId: juan } });
    const anular = await run("core.ausencias.anular", { personaId: juan, ausenciaId: registro?.id });
    expect(anular).toMatchObject({ ok: true, data: { turnosLiberados: 1 } });
    expect(await activas(juan)).toEqual([]);
  });
});
