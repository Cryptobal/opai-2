import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararEntorno, type Entorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";

// Volumen de los indicadores de Asistencia (riesgo anotado en CAR-322): marcas a la hora y ausentismo leen
// los días con turno del mes con `diasConTurno`. Con 2.000 personas y un turno cada día de octubre son 62.000
// días: la lectura no debe chocar con el tope de parámetros de Postgres y debe caber con margen en 10 s.
const PERSONAS = 2000;
const DIAS = 31;

describe.skipIf(!urlPropietario)("días con turno con volumen (Postgres real)", () => {
  let e: Entorno;
  let a = "";
  const sufijo = randomUUID().slice(0, 8);
  const ctx = () =>
    mod.crearContexto({
      tenantId: a,
      rol: "owner",
      actor: { tipo: "user", id: randomUUID() },
      usuario: null,
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["asistencia"],
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    a = (
      await e.admin.tenant.create({
        data: {
          slug: `vola-${sufijo}`,
          nombre: "vola",
          vertical: "seguridad",
          timezone: "America/Santiago",
        },
      })
    ).id;
    const cuentaId = (await e.admin.cuenta.create({ data: { tenantId: a, nombre: "Cliente" } })).id;
    const instalacionId = (
      await e.admin.instalacion.create({ data: { tenantId: a, cuentaId, nombre: "Planta" } })
    ).id;
    const personas = Array.from({ length: PERSONAS }, (_, i) => ({
      id: randomUUID(),
      tenantId: a,
      nombres: `P${i}`,
      apellidos: "Volumen",
      rut: `${31_000_000 + i}-k`,
    }));
    await e.admin.persona.createMany({ data: personas });
    for (let d = 1; d <= DIAS; d++) {
      const dia = `2026-10-${String(d).padStart(2, "0")}`;
      const turnos = personas.map((p) => ({
        id: randomUUID(),
        tenantId: a,
        personaId: p.id,
        fecha: new Date(`${dia}T00:00:00Z`),
        inicio: new Date(`${dia}T11:00:00Z`),
        fin: new Date(`${dia}T23:00:00Z`),
        instalacionId,
        origen: "pauta",
      }));
      await e.admin.turnoEsperado.createMany({ data: turnos });
      await e.admin.dia.createMany({
        data: turnos.map((t, i) => ({
          tenantId: a,
          personaId: t.personaId,
          fecha: t.fecha,
          turnoEsperadoId: t.id,
          instalacionId,
          tipoJornada: "ordinaria",
          estado: i % 20 === 0 ? "sin_marca" : "presente",
          entrada: i % 20 === 0 ? null : t.inicio,
          segundosAtraso: i % 10 === 1 ? 1200 : 0,
          calculadoEn: t.fin,
        })),
      });
    }
  }, 600_000);
  afterAll(async () => {
    await e?.cerrar();
  });

  it(`lee ${PERSONAS * DIAS} días con turno en menos de 10 s`, async () => {
    const t0 = performance.now();
    const dias = await mod.diasConTurno(ctx(), {
      desde: "2026-10-01",
      hasta: "2026-11-01",
      corte: "2026-11-01",
      ahora: new Date("2026-11-10T12:00:00Z"),
    });
    const ms = performance.now() - t0;
    console.info(`[volumen] ${dias.length} días con turno en ${Math.round(ms)} ms`);
    expect(dias).toHaveLength(PERSONAS * DIAS);
    expect(dias.filter((d) => d.estado === "ausente")).toHaveLength((PERSONAS / 20) * DIAS);
    expect(ms).toBeLessThan(10_000);
  }, 120_000);
});
