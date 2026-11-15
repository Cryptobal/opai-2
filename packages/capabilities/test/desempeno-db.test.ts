import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Rol } from "@opai/domain";

import { prepararEntorno, type Entorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { codigo, dato } from "./maestros-ayuda";

// Desempeño (CAR-306, ADR-094) contra Postgres real, con RLS sin BYPASSRLS: scorecard por cargo con
// versiones por mes y resultado por persona, visto por gerencia, por la jefatura y por la persona.
describe.skipIf(!urlPropietario)("desempeño: scorecard y resultados contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  const sufijo = randomUUID().slice(0, 8);
  const usuario: Record<string, string> = {};
  const persona: Record<string, string> = {};
  const cargo: Record<string, string> = {};
  const GUARDAR = "desempeno.scorecards.guardar";
  const GET = "desempeno.scorecards.get";
  const PERSONA = "desempeno.resultados.ver_persona";
  const CARGO = "desempeno.resultados.ver_cargo";
  const TAREAS = "core.tareas_a_tiempo";
  type Scorecard = { vigenteDesde: string; estado: string; indicadores: { meta: number }[] };
  type Resultado = { puntaje: number | null; cobertura: number; vigenteDesde: string | null };
  let n = 0;

  const ctx = (tenantId: string, quien: string, rol: Rol = "owner") =>
    mod.crearContexto({
      tenantId,
      rol,
      actor: { tipo: "user", id: usuario[quien] ?? "" },
      usuario: {
        id: usuario[quien] ?? "",
        nombre: quien,
        email: `${quien}-${sufijo}@prueba.cl`,
        platformRole: null,
      },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["desempeno"],
    });
  const item = (meta: number, peso = 100) => ({ indicador: TAREAS, meta, peso });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesDesempeno]);
    const empresa = (slug: string) =>
      e.admin.tenant
        .create({ data: { slug, nombre: slug, vertical: "seguridad", timezone: "America/Santiago" } })
        .then((t) => t.id);
    a = await empresa(`des-a-${sufijo}`);
    b = await empresa(`des-b-${sufijo}`);
    for (const clave of ["gema", "vera", "victor"]) {
      const u = await e.admin.user.create({
        data: { name: clave, email: `${clave}-${sufijo}@prueba.cl`, emailVerified: true },
      });
      usuario[clave] = u.id;
      await e.admin.membership.create({
        data: { tenantId: a, userId: u.id, rol: "owner", portales: ["erp"] },
      });
    }
    await e.admin.membership.create({
      data: { tenantId: b, userId: usuario.gema ?? "", rol: "owner", portales: ["erp"] },
    });
    for (const [tenantId, clave] of [[a, "gerente"], [a, "vendedor"], [b, "vendedor_b"]] as const) {
      cargo[clave] = (await e.admin.cargo.create({ data: { tenantId, nombre: clave } })).id;
    }
    await e.admin.cargo.update({
      where: { id: cargo.vendedor ?? "" },
      data: { jefaturaCargoId: cargo.gerente ?? "" },
    });
    const crearPersona = async (clave: string, cargoClave: string, jefe?: string) => {
      n += 1;
      const p = await e.admin.persona.create({
        data: {
          tenantId: a,
          nombres: clave,
          apellidos: "Prueba",
          rut: `${20_000_000 + n}-k`,
          usuarioId: usuario[clave] ?? null,
          jefePersonaId: jefe ? (persona[jefe] ?? null) : null,
        },
      });
      persona[clave] = p.id;
      await e.admin.vinculoLaboral.create({
        data: {
          tenantId: a,
          personaId: p.id,
          cargoId: cargo[cargoClave] ?? "",
          tipo: "indefinido",
          inicio: new Date("2026-01-01"),
        },
      });
    };
    await crearPersona("gema", "gerente");
    await crearPersona("vera", "vendedor", "gema");
    await crearPersona("victor", "vendedor");
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
    vi.setSystemTime(new Date("2026-11-20T15:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("guarda un borrador, exige pesos que sumen 100 para publicar y deja la publicación en la auditoría", async () => {
    const entrada = { cargoId: cargo.vendedor, indicadores: [item(100, 60)] };
    const borrador = await dato<Scorecard>(ctx(a, "gema"), GUARDAR, entrada);
    expect(borrador).toMatchObject({ estado: "borrador", vigenteDesde: "2026-11" });
    expect(await codigo(ctx(a, "gema"), GUARDAR, { ...entrada, publicar: true })).toBe("UNPROCESSABLE");
    const ajeno = { cargoId: cargo.vendedor, indicadores: [{ indicador: "no.existe", meta: 1, peso: 100 }] };
    expect(await codigo(ctx(a, "gema"), GUARDAR, ajeno)).toBe("UNPROCESSABLE");
    const publicado = await dato<Scorecard>(ctx(a, "gema"), GUARDAR, {
      cargoId: cargo.vendedor,
      indicadores: [item(100)],
      publicar: true,
    });
    expect(publicado).toMatchObject({ estado: "publicado", vigenteDesde: "2026-11" });
    const filas = await e.admin.desempenoScorecard.count({ where: { cargoId: cargo.vendedor ?? "" } });
    expect(filas).toBe(1);
    const auditados = await e.admin.auditEvent.count({ where: { tenantId: a, capability: GUARDAR } });
    expect(auditados).toBe(2);
  });

  it("calcula el resultado de cada persona con los hechos de su usuario vinculado", async () => {
    const vera = await dato<Resultado>(ctx(a, "gema"), PERSONA, { personaId: persona.vera });
    expect(vera).toMatchObject({ puntaje: 50, cobertura: 100, vigenteDesde: "2026-11" });
    const equipo = await dato<{ personas: { personaId: string; puntaje: number }[] }>(
      ctx(a, "gema"),
      CARGO,
      { cargoId: cargo.vendedor },
    );
    const porPersona = new Map(equipo.personas.map((p) => [p.personaId, p.puntaje]));
    expect(porPersona.get(persona.vera ?? "")).toBe(50);
    expect(porPersona.get(persona.victor ?? "")).toBe(100);
  });

  it("cambiar la meta rige desde el mes siguiente y no altera el mes en curso", async () => {
    const cambio = await dato<Scorecard>(ctx(a, "gema"), GUARDAR, {
      cargoId: cargo.vendedor,
      indicadores: [item(50)],
      publicar: true,
    });
    expect(cambio.vigenteDesde).toBe("2026-12");
    const hoy = await dato<{ vigente: Scorecard; pendiente: Scorecard }>(ctx(a, "gema"), GET, {
      cargoId: cargo.vendedor,
    });
    expect(hoy.vigente.indicadores[0]?.meta).toBe(100);
    expect(hoy.pendiente.vigenteDesde).toBe("2026-12");
    const vera = await dato<Resultado>(ctx(a, "gema"), PERSONA, { personaId: persona.vera });
    expect(vera.puntaje).toBe(50);
    // En diciembre rige la meta nueva: el mismo 50 % ya cumple la meta de 50.
    vi.setSystemTime(new Date("2026-12-20T15:00:00Z"));
    const enDiciembre = await dato<Resultado>(ctx(a, "gema"), PERSONA, {
      personaId: persona.vera,
      periodo: "2026-12",
    });
    expect(enDiciembre).toMatchObject({ vigenteDesde: "2026-12", puntaje: null, cobertura: 0 });
  });

  it("la jefatura ve solo a las personas a su cargo y cada persona, el suyo", async () => {
    // Gema como supervisora (sin «ver a todos»): es jefa de Vera, no de Víctor.
    const jefa = ctx(a, "gema", "supervisor");
    expect((await dato<Resultado>(jefa, PERSONA, { personaId: persona.vera })).puntaje).toBe(50);
    expect(await codigo(jefa, PERSONA, { personaId: persona.victor })).toBe("NOT_FOUND");
    const equipo = await dato<{ personas: { personaId: string }[] }>(jefa, CARGO, { cargoId: cargo.vendedor });
    expect(equipo.personas.map((p) => p.personaId)).toEqual([persona.vera]);
    // Vera con un rol de solo lectura: ve el suyo y a nadie más.
    const vera = ctx(a, "vera", "viewer");
    expect((await dato<Resultado>(vera, PERSONA, {})).puntaje).toBe(50);
    expect(await codigo(vera, PERSONA, { personaId: persona.victor })).toBe("NOT_FOUND");
    expect(await codigo(vera, GUARDAR, { cargoId: cargo.vendedor, indicadores: [] })).toBe("FORBIDDEN");
  });

  it("una versión publicada no se despublica con un borrador, y la persona ve el suyo solo si la empresa lo permite", async () => {
    const LIST = "desempeno.scorecards.list";
    type Fila = { cargoId: string; pendiente: boolean; vigenteDesde: string | null };
    const fila = async () =>
      (await dato<Fila[]>(ctx(a, "gema"), LIST, {})).find((f) => f.cargoId === cargo.vendedor);
    expect(await fila()).toMatchObject({ pendiente: true, vigenteDesde: "2026-11" });
    const borrador = { cargoId: cargo.vendedor, indicadores: [item(40)] };
    expect(await codigo(ctx(a, "gema"), GUARDAR, borrador)).toBe("UNPROCESSABLE");
    // Vera se ve a sí misma en la lista de su cargo, y a nadie más.
    const vera = ctx(a, "vera", "viewer");
    const propio = await dato<{ personas: { personaId: string }[] }>(vera, CARGO, { cargoId: cargo.vendedor });
    expect(propio.personas.map((p) => p.personaId)).toEqual([persona.vera]);
    // Desde diciembre la empresa deja de mostrar el resultado propio en este cargo.
    await dato(ctx(a, "gema"), GUARDAR, {
      cargoId: cargo.vendedor,
      indicadores: [item(50)],
      personaVeResultado: false,
      publicar: true,
    });
    vi.setSystemTime(new Date("2026-12-20T15:00:00Z"));
    expect(await fila()).toMatchObject({ pendiente: false, vigenteDesde: "2026-12" });
    expect(await codigo(vera, PERSONA, {})).toBe("FORBIDDEN");
    const sinElla = await dato<{ personas: unknown[] }>(vera, CARGO, { cargoId: cargo.vendedor });
    expect(sinElla.personas).toEqual([]);
    // Gerencia la sigue viendo.
    expect((await dato<Resultado>(ctx(a, "gema"), PERSONA, { personaId: persona.vera })).vigenteDesde).toBe("2026-12");
  });

  it("otra empresa no ve cargos, scorecards ni resultados de esta", async () => {
    expect(await codigo(ctx(b, "gema"), GET, { cargoId: cargo.vendedor })).toBe("NOT_FOUND");
    expect(await codigo(ctx(b, "gema"), PERSONA, { personaId: persona.vera })).toBe("NOT_FOUND");
    expect(await codigo(ctx(b, "gema"), CARGO, { cargoId: cargo.vendedor })).toBe("NOT_FOUND");
    const cruzado = { cargoId: cargo.vendedor, indicadores: [item(100)], publicar: true };
    expect(await codigo(ctx(b, "gema"), GUARDAR, cruzado)).toBe("NOT_FOUND");
    await expect(
      e.admin.desempenoScorecard.create({
        data: { tenantId: b, cargoId: cargo.vendedor ?? "", vigenteDesde: "2026-11" },
      }),
    ).rejects.toThrow();
  });
});
