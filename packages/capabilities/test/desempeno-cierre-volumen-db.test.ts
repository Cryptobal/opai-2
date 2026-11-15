import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prepararEntorno, type Entorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { dato } from "./maestros-ayuda";

// Volumen del cierre de Desempeño (riesgo anotado en CAR-322): una empresa con 1.500 personas en 3 cargos, cada
// una con usuario y 4 tareas en el mes, cierra a mano dentro del tope de una transacción (15 s) con margen.
const PERSONAS = 1500;

describe.skipIf(!urlPropietario)("desempeño: cierre con volumen (Postgres real)", () => {
  let e: Entorno;
  let a = "";
  let dueno = "";
  const sufijo = randomUUID().slice(0, 8);
  const ctx = () =>
    mod.crearContexto({
      tenantId: a,
      rol: "owner",
      actor: { tipo: "user", id: dueno },
      usuario: {
        id: dueno,
        nombre: "dueño",
        email: `dueno-${sufijo}@prueba.cl`,
        platformRole: null,
      },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["desempeno"],
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo, ...mod.capacidadesDesempeno]);
    a = (
      await e.admin.tenant.create({
        data: {
          slug: `vol-${sufijo}`,
          nombre: "vol",
          vertical: "seguridad",
          timezone: "America/Santiago",
        },
      })
    ).id;
    dueno = (
      await e.admin.user.create({
        data: { name: "dueño", email: `dueno-${sufijo}@prueba.cl`, emailVerified: true },
      })
    ).id;
    await e.admin.membership.create({
      data: { tenantId: a, userId: dueno, rol: "owner", portales: ["erp"] },
    });
    const cargos = await Promise.all(
      ["Guardia", "Supervisor", "Vendedor"].map(
        async (nombre) => (await e.admin.cargo.create({ data: { tenantId: a, nombre } })).id,
      ),
    );
    for (const cargoId of cargos)
      await e.admin.desempenoScorecard.create({
        data: {
          tenantId: a,
          cargoId,
          vigenteDesde: "2026-11",
          estado: "publicado",
          publicadoEn: new Date("2026-11-01T12:00:00Z"),
          indicadores: { create: [{ indicador: "core.tareas_a_tiempo", meta: 100, peso: 100 }] },
        },
      });
    const usuarios = Array.from({ length: PERSONAS }, (_, i) => ({
      id: randomUUID(),
      name: `u${i}`,
      email: `u${i}-${sufijo}@prueba.cl`,
      emailVerified: true,
    }));
    await e.admin.user.createMany({ data: usuarios });
    const personas = usuarios.map((u, i) => ({
      id: randomUUID(),
      tenantId: a,
      nombres: `P${i}`,
      apellidos: "Volumen",
      rut: `${30_000_000 + i}-k`,
      usuarioId: u.id,
    }));
    await e.admin.membership.createMany({
      data: usuarios.map((u) => ({ tenantId: a, userId: u.id, rol: "viewer", portales: ["erp"] })),
    });
    await e.admin.persona.createMany({ data: personas });
    await e.admin.vinculoLaboral.createMany({
      data: personas.map((p, i) => ({
        tenantId: a,
        personaId: p.id,
        cargoId: cargos[i % 3] ?? "",
        tipo: "indefinido",
        inicio: new Date("2026-01-01"),
      })),
    });
    const tareas = usuarios.flatMap((u) =>
      ["05", "10", "15", "20"].map((d) => ({
        id: randomUUID(),
        u: u.id,
        vence: new Date(`2026-11-${d}T15:00:00Z`),
        hecha: new Date(`2026-11-${d}T${d === "10" ? "16" : "14"}:00:00Z`),
      })),
    );
    await e.admin.actividad.createMany({
      data: tareas.map((t) => ({
        id: t.id,
        tenantId: a,
        tipo: "tarea",
        titulo: "Tarea",
        estado: "hecha",
        prioridad: "media",
        vencimiento: t.vence,
        completadaEn: t.hecha,
      })),
    });
    await e.admin.actividadResponsable.createMany({
      data: tareas.map((t) => ({ tenantId: a, actividadId: t.id, usuarioId: t.u })),
    });
  }, 300_000);
  afterAll(async () => {
    await e?.cerrar();
  });

  it(`cierra ${PERSONAS} personas a mano en menos de 10 s`, async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-10T15:00:00Z"));
    const t0 = performance.now();
    const r = await dato<{ personas: number }>(ctx(), "desempeno.periodos.cerrar", {
      periodo: "2026-11",
    });
    const ms = performance.now() - t0;
    vi.useRealTimers();
    console.info(`[volumen] cierre de ${r.personas} personas en ${Math.round(ms)} ms`);
    expect(r.personas).toBe(PERSONAS);
    expect(ms).toBeLessThan(10_000);
  }, 60_000);
});
