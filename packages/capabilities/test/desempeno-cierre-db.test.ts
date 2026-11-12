import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { prepararEntorno, type Entorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { anonimizarPersona } from "../src/core/cumplimiento/retencion-anonimizar";
import { codigo, dato } from "./maestros-ayuda";

// Cierre de período de Desempeño (CAR-322) contra Postgres real, con RLS sin BYPASSRLS: al cerrar un
// mes su resultado queda guardado y ya no cambia aunque cambien los hechos o el cargo de la persona.
describe.skipIf(!urlPropietario)("desempeño: cierre de período contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  const sufijo = randomUUID().slice(0, 8);
  const usuario: Record<string, string> = {};
  const persona: Record<string, string> = {};
  const cargo: Record<string, string> = {};
  const CERRAR = "desempeno.periodos.cerrar";
  const PERSONA = "desempeno.resultados.ver_persona";
  const CARGO = "desempeno.resultados.ver_cargo";
  type Resumen = { periodo: string; personas: number; cargos: number };
  type Resultado = { puntaje: number | null; cerrado: boolean; cargoId: string | null };

  const ctx = (tenantId: string, quien = "gema", rol: "owner" | "viewer" = "owner", modulos = ["desempeno"]) =>
    mod.crearContexto({
      tenantId,
      rol,
      actor: { tipo: "user", id: usuario[quien] ?? "" },
      usuario: { id: usuario[quien] ?? "", nombre: quien, email: `${quien}-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: modulos,
    });

  const tarea = async (quien: string, vence: string, hecha: string) => {
    const t = await e.admin.actividad.create({
      data: {
        tenantId: a,
        tipo: "tarea",
        titulo: "Tarea de prueba",
        estado: "hecha",
        prioridad: "media",
        vencimiento: new Date(vence),
        completadaEn: new Date(hecha),
      },
    });
    await e.admin.actividadResponsable.create({
      data: { tenantId: a, actividadId: t.id, usuarioId: usuario[quien] ?? "" },
    });
  };

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesDesempeno]);
    const empresa = (slug: string) =>
      e.admin.tenant
        .create({ data: { slug, nombre: slug, vertical: "seguridad", timezone: "America/Santiago" } })
        .then((t) => t.id);
    a = await empresa(`cie-a-${sufijo}`);
    b = await empresa(`cie-b-${sufijo}`);
    for (const clave of ["gema", "vera", "victor"]) {
      const u = await e.admin.user.create({
        data: { name: clave, email: `${clave}-${sufijo}@prueba.cl`, emailVerified: true },
      });
      usuario[clave] = u.id;
      await e.admin.membership.create({ data: { tenantId: a, userId: u.id, rol: "owner", portales: ["erp"] } });
    }
    await e.admin.membership.create({ data: { tenantId: b, userId: usuario.gema ?? "", rol: "owner", portales: ["erp"] } });
    for (const clave of ["gerente", "vendedor"]) {
      cargo[clave] = (await e.admin.cargo.create({ data: { tenantId: a, nombre: clave } })).id;
    }
    let n = 0;
    for (const clave of ["vera", "victor"]) {
      n += 1;
      const p = await e.admin.persona.create({
        data: { tenantId: a, nombres: clave, apellidos: "Prueba", rut: `${21_000_000 + n}-k`, usuarioId: usuario[clave] ?? null },
      });
      persona[clave] = p.id;
      await e.admin.vinculoLaboral.create({
        data: { tenantId: a, personaId: p.id, cargoId: cargo.vendedor ?? "", tipo: "indefinido", inicio: new Date("2026-01-01") },
      });
    }
    await e.admin.desempenoScorecard.create({
      data: {
        tenantId: a,
        cargoId: cargo.vendedor ?? "",
        vigenteDesde: "2026-11",
        estado: "publicado",
        publicadoEn: new Date("2026-11-01T12:00:00Z"),
        indicadores: { create: [{ indicador: "core.tareas_a_tiempo", meta: 100, peso: 100 }] },
      },
    });
    // Noviembre: Vera 1 de 2 a tiempo (50 %); Víctor 1 de 1 (100 %).
    await tarea("vera", "2026-11-05T15:00:00Z", "2026-11-05T14:00:00Z");
    await tarea("vera", "2026-11-06T15:00:00Z", "2026-11-07T14:00:00Z");
    await tarea("victor", "2026-11-05T15:00:00Z", "2026-11-04T14:00:00Z");
  });
  afterAll(async () => {
    await e?.cerrar();
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-10T15:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("la vista previa no guarda nada y solo se cierra un mes que ya terminó", async () => {
    const previa = await dato<Resumen>(ctx(a), CERRAR, { periodo: "2026-11" }, { dryRun: true });
    expect(previa).toEqual({ periodo: "2026-11", personas: 2, cargos: 1 });
    expect(await e.admin.desempenoPeriodoCerrado.count({ where: { tenantId: a } })).toBe(0);
    expect(await codigo(ctx(a), CERRAR, { periodo: "2026-12" })).toBe("UNPROCESSABLE");
  });

  it("al cerrar guarda el resultado de cada persona y queda en la auditoría", async () => {
    const r = await dato<Resumen>(ctx(a), CERRAR, { periodo: "2026-11" });
    expect(r.personas).toBe(2);
    const filas = await e.admin.desempenoResultadoCerrado.findMany({ where: { tenantId: a, periodo: "2026-11" } });
    const porPersona = new Map(filas.map((f) => [f.personaId, Number(f.puntaje)]));
    expect(porPersona.get(persona.vera ?? "")).toBe(50);
    expect(porPersona.get(persona.victor ?? "")).toBe(100);
    expect(await e.admin.auditEvent.count({ where: { tenantId: a, capability: CERRAR } })).toBe(1);
    expect(await codigo(ctx(a), CERRAR, { periodo: "2026-11" })).toBe("CONFLICT");
  });

  it("un mes cerrado no cambia aunque se corrija un hecho o la persona cambie de cargo", async () => {
    await tarea("vera", "2026-11-08T15:00:00Z", "2026-11-08T14:00:00Z");
    await e.admin.vinculoLaboral.updateMany({
      where: { personaId: persona.victor ?? "" },
      data: { cargoId: cargo.gerente ?? "" },
    });
    const vera = await dato<Resultado>(ctx(a), PERSONA, { personaId: persona.vera, periodo: "2026-11" });
    expect(vera).toMatchObject({ puntaje: 50, cerrado: true, cargoId: cargo.vendedor });
    const equipo = await dato<{ cerrado: boolean; personas: { personaId: string; puntaje: number }[] }>(
      ctx(a),
      CARGO,
      { cargoId: cargo.vendedor, periodo: "2026-11" },
    );
    expect(equipo.cerrado).toBe(true);
    expect(new Map(equipo.personas.map((p) => [p.personaId, p.puntaje])).get(persona.victor ?? "")).toBe(100);
  });

  it("en un mes cerrado se respeta quién ve a quién, también entre empresas", async () => {
    // Otra empresa no lee a una persona de A ni siquiera conociendo su id.
    expect(await codigo(ctx(b), PERSONA, { personaId: persona.vera, periodo: "2026-11" })).toBe("NOT_FOUND");
    // La persona ve el suyo solo si el scorecard de ese mes lo permite.
    const vera = ctx(a, "vera", "viewer");
    expect((await dato<Resultado>(vera, PERSONA, { periodo: "2026-11" })).puntaje).toBe(50);
    await e.admin.desempenoScorecard.updateMany({ where: { tenantId: a }, data: { personaVeResultado: false } });
    expect(await codigo(vera, PERSONA, { periodo: "2026-11" })).toBe("FORBIDDEN");
    expect(await codigo(vera, PERSONA, { personaId: persona.victor, periodo: "2026-11" })).toBe("NOT_FOUND");
    await e.admin.desempenoScorecard.updateMany({ where: { tenantId: a }, data: { personaVeResultado: true } });
  });

  it("al anonimizar a una persona se borra su resultado guardado", async () => {
    const victor = persona.victor ?? "";
    // Elegible: su relación laboral terminó antes del corte.
    await e.admin.vinculoLaboral.updateMany({
      where: { personaId: victor },
      data: { estado: "terminado", termino: new Date("2026-11-30") },
    });
    const hecho = await ctx(a).transaccion((tx) => anonimizarPersona(tx, victor, new Date(), new Date("2026-12-01")));
    expect(hecho).toBe(true);
    expect(await e.admin.desempenoResultadoCerrado.count({ where: { personaId: victor } })).toBe(0);
    expect(await e.admin.desempenoResultadoCerrado.count({ where: { personaId: persona.vera ?? "" } })).toBe(1);
  });

  it("el cierre automático lee los módulos de la empresa, espera al día de cierre y queda auditado", async () => {
    const trabajo = mod.trabajosDesempeno[0];
    expect(trabajo).toBeDefined();
    // El contexto del cron no trae módulos: el trabajo los lee de la base.
    const sistema = ctx(b, "gema", "owner", []);
    expect(await trabajo?.ejecutar(sistema, { dia: "2026-12-05" })).toEqual({ cerrado: null });
    await e.admin.tenantModule.create({ data: { tenantId: b, moduloId: "desempeno" } });
    expect(await trabajo?.ejecutar(sistema, { dia: "2026-12-04" })).toEqual({ cerrado: null });
    expect(await trabajo?.ejecutar(sistema, { dia: "2026-12-05" })).toEqual({ cerrado: "2026-11", personas: 0 });
    expect(await trabajo?.ejecutar(sistema, { dia: "2026-12-06" })).toEqual({ cerrado: null });
    expect(await e.admin.auditEvent.count({ where: { tenantId: b, capability: CERRAR } })).toBe(1);
    // La otra empresa no ve los meses cerrados de A.
    const lista = await dato<{ periodo: string; origen: string }[]>(ctx(b), "desempeno.periodos.list", {});
    expect(lista).toEqual([expect.objectContaining({ periodo: "2026-11", origen: "automatico" })]);
  });
});
