import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { manifest } from "../../../modules/desempeno/manifest";
import { prepararEntorno, type Entorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { consumidorBajoMeta } from "../src/desempeno/avisos";
import { dato } from "./maestros-ayuda";

// Avisos bajo la meta al cerrar el mes (CAR-312) contra Postgres real, con RLS sin BYPASSRLS: silencio
// por defecto; encendido, a la persona y a su jefatura directa, sin puntaje y una sola vez.
describe.skipIf(!urlPropietario)("desempeño: avisos bajo la meta contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  const sufijo = randomUUID().slice(0, 8);
  const usuario: Record<string, string> = {};
  const persona: Record<string, string> = {};
  const TIPOS = ["desempeno.resultado.bajo_meta", "desempeno.equipo.bajo_meta"];

  const ctx = (quien = "gema") =>
    mod.crearContexto({
      tenantId: a,
      rol: "owner",
      actor: { tipo: "user", id: usuario[quien] ?? "" },
      usuario: { id: usuario[quien] ?? "", nombre: quien, email: `${quien}-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["desempeno"],
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    mod.registrarModulos([manifest]);
    a = (
      await e.admin.tenant.create({
        data: { slug: `dav-${sufijo}`, nombre: "Empresa A", vertical: "seguridad", timezone: "America/Santiago" },
      })
    ).id;
    for (const clave of ["gema", "vera", "jose"]) {
      const u = await e.admin.user.create({ data: { name: clave, email: `${clave}-${sufijo}@prueba.cl`, emailVerified: true } });
      usuario[clave] = u.id;
      await e.admin.membership.create({ data: { tenantId: a, userId: u.id, rol: "owner", portales: ["erp"] } });
    }
    // José es jefe de ventas; el cargo vendedor cuelga del suyo y Vera lo tiene de jefe en la ficha.
    const jefe = (await e.admin.cargo.create({ data: { tenantId: a, nombre: "Jefe de ventas" } })).id;
    const vendedor = (
      await e.admin.cargo.create({ data: { tenantId: a, nombre: "Vendedor", jefaturaCargoId: jefe, jefaturaVe: "equipo" } })
    ).id;
    let n = 0;
    for (const [clave, cargo] of [["jose", jefe], ["vera", vendedor]] as const) {
      n += 1;
      const p = await e.admin.persona.create({
        data: {
          tenantId: a,
          nombres: clave,
          apellidos: "Prueba",
          rut: `${23_000_000 + n}-k`,
          usuarioId: usuario[clave] ?? null,
          jefePersonaId: clave === "vera" ? (persona.jose ?? null) : null,
        },
      });
      persona[clave] = p.id;
      await e.admin.vinculoLaboral.create({
        data: { tenantId: a, personaId: p.id, cargoId: cargo, tipo: "indefinido", inicio: new Date("2026-01-01") },
      });
    }
    await e.admin.desempenoScorecard.create({
      data: {
        tenantId: a,
        cargoId: vendedor,
        vigenteDesde: "2026-10",
        estado: "publicado",
        publicadoEn: new Date("2026-10-01T12:00:00Z"),
        personaVeResultado: true,
        indicadores: { create: [{ indicador: "core.tareas_a_tiempo", meta: 100, peso: 100 }] },
      },
    });
    // Vera: 1 de 2 tareas a tiempo en octubre y en noviembre (50 %, bajo la meta de 100).
    for (const mes of ["10", "11"]) {
      for (const [vence, hecha] of [["05T15", "05T14"], ["06T15", "07T14"]]) {
        const t = await e.admin.actividad.create({
          data: {
            tenantId: a, tipo: "tarea", titulo: "Tarea", estado: "hecha", prioridad: "media",
            vencimiento: new Date(`2026-${mes}-${vence}:00:00Z`), completadaEn: new Date(`2026-${mes}-${hecha}:00:00Z`),
          },
        });
        await e.admin.actividadResponsable.create({ data: { tenantId: a, actividadId: t.id, usuarioId: usuario.vera ?? "" } });
      }
    }
  });
  afterAll(async () => {
    await e?.cerrar();
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-10T15:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  const eventos = (periodo: string) =>
    e.admin.evento.findMany({ where: { tenantId: a, tipo: { in: TIPOS }, payload: { path: ["periodo"], equals: periodo } } });
  const consumir = async (periodo: string) => {
    for (const ev of await eventos(periodo)) await consumidorBajoMeta.handler(ctx(), ev);
  };

  it("con el aviso apagado (por defecto) el cierre no emite avisos", async () => {
    await dato(ctx(), "desempeno.periodos.cerrar", { periodo: "2026-10" });
    expect(await eventos("2026-10")).toHaveLength(0);
  });

  it("encendido, avisa a la persona y a su jefatura una sola vez y sin puntaje", async () => {
    await dato(ctx(), "core.config.set", { modulo: "desempeno", clave: "aviso_bajo_meta", valor: true });
    await dato(ctx(), "desempeno.periodos.cerrar", { periodo: "2026-11" });
    const evs = await eventos("2026-11");
    expect(evs.map((ev) => [ev.tipo, ev.entidadId]).sort()).toEqual([
      ["desempeno.equipo.bajo_meta", persona.jose],
      ["desempeno.resultado.bajo_meta", persona.vera],
    ]);
    await consumir("2026-11");
    await consumir("2026-11"); // Idempotente: el mismo evento no avisa dos veces.
    const lista = await e.admin.notificacion.findMany({ where: { tenantId: a }, orderBy: { titulo: "asc" } });
    expect(lista.map((x) => [x.usuarioId, x.titulo])).toEqual([
      [usuario.jose, "1 de tu equipo bajo la meta en noviembre de 2026"],
      [usuario.vera, "Tu resultado de noviembre de 2026 quedó bajo la meta"],
    ]);
    expect(lista.every((x) => !/50|puntaje/i.test(`${x.titulo} ${x.cuerpo ?? ""}`))).toBe(true);
  });

  it("una jefatura sin permiso de ver resultados no recibe el aviso de su equipo", async () => {
    const [ev] = (await eventos("2026-11")).filter((x) => x.tipo === "desempeno.equipo.bajo_meta");
    if (!ev) throw new Error("falta el evento");
    await e.admin.notificacion.deleteMany({ where: { tenantId: a, usuarioId: usuario.jose ?? "" } });
    const m = await e.admin.membership.findFirstOrThrow({ where: { tenantId: a, userId: usuario.jose ?? "" } });
    await e.admin.permisoExcepcion.create({
      data: { tenantId: a, membershipId: m.id, permiso: "desempeno:resultados.ver", conceder: false, motivo: "Prueba" },
    });
    await consumidorBajoMeta.handler(ctx(), ev);
    expect(await e.admin.notificacion.count({ where: { tenantId: a, usuarioId: usuario.jose ?? "" } })).toBe(0);
  });
});
