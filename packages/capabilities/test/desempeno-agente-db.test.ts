import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { manifest } from "../../../modules/desempeno/manifest";
import { prepararEntorno, type Entorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { dato } from "./maestros-ayuda";

// Desempeño y agentes (CAR-312) contra Postgres real, con RLS sin BYPASSRLS: el agente no publica un
// scorecard solo, tiempo de respuesta a lo escalado y parte de las acciones hecha por el agente.
describe.skipIf(!urlPropietario)("desempeño: agente y escalados contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  const sufijo = randomUUID().slice(0, 8);
  const usuario: Record<string, string> = {};
  const persona: Record<string, string> = {};
  let servicio = "";
  let cargo = "";
  type Medir = { mediciones: { sujetoId: string; valor: number }[] };
  type Persona = { parteAgente: { acciones: number; porAgente: number; porcentaje: number } | null };

  const ctx = (tenantId: string, quien = "gema") =>
    mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "user", id: usuario[quien] ?? "" },
      usuario: { id: usuario[quien] ?? "", nombre: quien, email: `${quien}-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["desempeno"],
    });

  const aprobacion = (tenantId: string, extra: Record<string, unknown>) =>
    e.admin.aprobacion.create({
      data: {
        tenantId,
        agenteInternoId: "agente-interno",
        viaUserId: usuario.vera ?? "",
        capability: "desempeno.scorecards.guardar",
        input: {},
        resumen: "Publicar scorecard",
        venceEn: new Date("2026-11-30T00:00:00Z"),
        createdAt: new Date("2026-11-10T10:00:00Z"),
        ...extra,
      },
    });

  const auditoria = (actorType: string, extra: Record<string, unknown>, seq: number) =>
    e.admin.auditEvent.create({
      data: {
        tenantId: a,
        actorType,
        capability: "core.tareas.crear",
        createdAt: new Date("2026-11-12T12:00:00Z"),
        seq,
        hashAnterior: "0".repeat(64),
        hash: randomUUID(),
        hashCanon: "x",
        ...extra,
      },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarModulos([manifest]);
    const empresa = (slug: string) =>
      e.admin.tenant
        .create({ data: { slug, nombre: slug, vertical: "seguridad", timezone: "America/Santiago" } })
        .then((t) => t.id);
    a = await empresa(`dag-a-${sufijo}`);
    b = await empresa(`dag-b-${sufijo}`);
    for (const clave of ["gema", "vera", "jose"]) {
      const u = await e.admin.user.create({
        data: { name: clave, email: `${clave}-${sufijo}@prueba.cl`, emailVerified: true },
      });
      usuario[clave] = u.id;
      await e.admin.membership.create({ data: { tenantId: a, userId: u.id, rol: "owner", portales: ["erp"] } });
    }
    await e.admin.membership.create({ data: { tenantId: b, userId: usuario.gema ?? "", rol: "owner", portales: ["erp"] } });
    cargo = (await e.admin.cargo.create({ data: { tenantId: a, nombre: "vendedor" } })).id;
    let n = 0;
    for (const clave of ["jose", "vera"]) {
      n += 1;
      const p = await e.admin.persona.create({
        data: {
          tenantId: a,
          nombres: clave,
          apellidos: "Prueba",
          rut: `${22_000_000 + n}-k`,
          usuarioId: usuario[clave] ?? null,
          jefePersonaId: clave === "vera" ? (persona.jose ?? null) : null,
        },
      });
      persona[clave] = p.id;
      if (clave === "vera") {
        await e.admin.vinculoLaboral.create({
          data: { tenantId: a, personaId: p.id, cargoId: cargo, tipo: "indefinido", inicio: new Date("2026-01-01") },
        });
      }
    }
    await e.admin.desempenoScorecard.create({
      data: {
        tenantId: a,
        cargoId: cargo,
        vigenteDesde: "2026-11",
        estado: "publicado",
        publicadoEn: new Date("2026-11-01T12:00:00Z"),
        personaVeResultado: true,
        indicadores: { create: [{ indicador: "core.tareas_a_tiempo", meta: 100, peso: 100 }] },
      },
    });
    // Vera: 1 de 2 tareas a tiempo en noviembre (50 %, bajo la meta de 100).
    for (const [vence, hecha] of [["2026-11-05T15:00:00Z", "2026-11-05T14:00:00Z"], ["2026-11-06T15:00:00Z", "2026-11-07T14:00:00Z"]] as const) {
      const t = await e.admin.actividad.create({
        data: { tenantId: a, tipo: "tarea", titulo: "Tarea", estado: "hecha", prioridad: "media", vencimiento: new Date(vence), completadaEn: new Date(hecha) },
      });
      await e.admin.actividadResponsable.create({ data: { tenantId: a, actividadId: t.id, usuarioId: usuario.vera ?? "" } });
    }
    // Gema resolvió dos escalados (2 h y 4 h); uno venció sin decisión y uno es de plataforma.
    await aprobacion(a, { estado: "aprobada", resueltaPor: usuario.gema, resueltaEn: new Date("2026-11-10T12:00:00Z") });
    await aprobacion(a, { estado: "rechazada", resueltaPor: usuario.gema, resueltaEn: new Date("2026-11-10T14:00:00Z") });
    await aprobacion(a, { estado: "vencida" });
    await aprobacion(a, { estado: "aprobada", capability: "platform.tenants.crear", resueltaPor: usuario.jose, resueltaEn: new Date("2026-11-11T10:00:00Z") });
    await aprobacion(b, { estado: "aprobada", resueltaPor: usuario.gema, resueltaEn: new Date("2026-11-20T10:00:00Z") });
    // Vera: 3 acciones propias y 1 de su agente interno en noviembre. No cuentan: una de otro usuario,
    // una de una key de servicio a su nombre y una lectura auditada.
    servicio = (
      await e.admin.apiKey.create({
        data: { tenantId: a, userId: usuario.vera ?? "", nombre: "Servicio", prefijo: `opai_srv_${sufijo}`, hash: `s${sufijo}`, scopes: ["*"], principalTipo: "servicio", heredaPermisos: false, presupuestoMensualMicro: 1_000_000n },
      })
    ).id;
    let seq = 0;
    for (let i = 0; i < 3; i++) await auditoria("user", { actorId: usuario.vera }, ++seq);
    await auditoria("agent", { actorId: `agente-interno:${usuario.vera}`, viaUserId: usuario.vera }, ++seq);
    await auditoria("agent", { actorId: servicio, viaUserId: usuario.vera }, ++seq);
    await auditoria("user", { actorId: usuario.gema }, ++seq);
    // Una lectura auditada de Vera no es una acción.
    await auditoria("user", { actorId: usuario.vera, capability: "desempeno.resultados.ver_persona" }, seq + 1);
  });
  afterAll(async () => {
    await e?.cerrar();
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-10T15:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("el agente guarda un borrador, pero publicar un scorecard espera aprobación humana", async () => {
    const keyId = (
      await e.admin.apiKey.create({
        data: { tenantId: a, userId: usuario.gema ?? "", nombre: "Agente", prefijo: `opai_age_${sufijo}`, hash: `a${sufijo}`, scopes: ["*"] },
      })
    ).id;
    const agente = mod.crearContexto({
      tenantId: a,
      rol: "owner",
      actor: { tipo: "agent", id: keyId, viaUserId: usuario.gema ?? "" },
      modulosActivos: ["desempeno"],
      scopes: ["*"],
      agente: { apiKeyId: keyId, nombre: "Agente", presupuestoMensualMicro: null, autonomia: {} },
    });
    const indicadores = [{ indicador: "core.tareas_a_tiempo", meta: 90, peso: 100 }];
    const borrador = await mod.executeCapability(agente, "desempeno.scorecards.guardar", { cargoId: cargo, indicadores });
    expect(borrador.ok).toBe(true);
    const publicar = await mod.executeCapability(agente, "desempeno.scorecards.guardar", { cargoId: cargo, indicadores, publicar: true });
    expect(publicar).toMatchObject({ ok: false, error: { code: "APPROVAL_REQUIRED" } });
    const pendiente = await e.admin.aprobacion.findFirst({
      where: { tenantId: a, capability: "desempeno.scorecards.guardar", estado: "pendiente" },
    });
    expect(pendiente).not.toBeNull();
    // La meta publicada sigue siendo la de 100: el agente no la movió solo.
    const vigente = await e.admin.desempenoScorecard.findFirst({
      where: { tenantId: a, cargoId: cargo, estado: "publicado" },
      include: { indicadores: true },
    });
    expect(vigente?.indicadores.map((i) => Number(i.meta))).toEqual([100]);
  });

  it("tiempo de respuesta a lo escalado: promedio de lo resuelto, sin vencidas ni plataforma", async () => {
    const r = await dato<Medir>(ctx(a), "core.indicadores_gestion.medir", {
      indicador: "core.respuesta_escalados",
      periodo: "2026-11",
    });
    expect(r.mediciones.map((m) => [m.sujetoId, m.valor])).toEqual([[usuario.gema, 3]]);
    const enB = await dato<Medir>(ctx(b), "core.indicadores_gestion.medir", {
      indicador: "core.respuesta_escalados",
      periodo: "2026-11",
    });
    expect(enB.mediciones.map((m) => m.valor)).toEqual([240]);
  });

  it("muestra qué parte de las acciones hizo el agente de la persona", async () => {
    const r = await dato<Persona>(ctx(a), "desempeno.resultados.ver_persona", {
      personaId: persona.vera,
      periodo: "2026-11",
    });
    expect(r.parteAgente).toEqual({ acciones: 4, porAgente: 1, porcentaje: 25 });
  });
});
