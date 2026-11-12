import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { manifest } from "../../../modules/asistencia/manifest";
import { prepararEntorno, type Entorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { dato } from "./maestros-ayuda";

// Indicadores de Asistencia (ADR-094, CAR-311) contra Postgres real, con RLS sin BYPASSRLS: marcas a la
// hora y ausentismo por persona desde el consolidado diario; las licencias y vacaciones no cuentan en
// contra. Datos ficticios.
describe.skipIf(!urlPropietario)("indicadores de Asistencia contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let usuaria = "";
  const sufijo = randomUUID().slice(0, 8);
  const MEDIR = "core.indicadores_gestion.medir";
  type Salida = { mediciones: { sujetoId: string; valor: number | null }[] };
  const persona: Record<string, string> = {};

  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "user", id: usuaria },
      usuario: { id: usuaria, nombre: "Rrhh", email: `r-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["asistencia"],
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod.limpiarRegistro();
    mod.limpiarModulos();
    mod.registrarCapacidades([...mod.capacidadesDelNucleo]);
    mod.registrarModulos([manifest]);
    const empresa = (slug: string) =>
      e.admin.tenant
        .create({ data: { slug, nombre: slug, vertical: "seguridad", timezone: "America/Santiago" } })
        .then((t) => t.id);
    a = await empresa(`ias-a-${sufijo}`);
    b = await empresa(`ias-b-${sufijo}`);
    usuaria = (
      await e.admin.user.create({ data: { name: "Rrhh", email: `r-${sufijo}@prueba.cl`, emailVerified: true } })
    ).id;
    for (const tenantId of [a, b]) {
      await e.admin.membership.create({ data: { tenantId, userId: usuaria, rol: "owner", portales: ["erp"] } });
    }
    let n = 0;
    for (const nombre of ["ines", "jose"]) {
      n += 1;
      persona[nombre] = (
        await e.admin.persona.create({
          data: { tenantId: a, nombres: nombre, apellidos: "Prueba", rut: `${50_000_000 + n}-${sufijo.slice(0, 1)}` },
        })
      ).id;
    }
    const dia = (quien: string, fecha: string, estado: string, extra: Record<string, unknown> = {}) =>
      e.admin.dia.create({
        data: {
          tenantId: a,
          personaId: persona[quien] ?? "",
          fecha: new Date(fecha),
          tipoJornada: "ordinaria",
          estado,
          calculadoEn: new Date(),
          ...extra,
        },
      });
    const entrada = new Date("2026-10-01T11:00:00Z");
    // Inés: 4 días con entrada (uno con atraso), 1 ausencia injustificada, 1 licencia, 1 vacaciones.
    await dia("ines", "2026-10-01", "presente", { entrada, sigla: "J.O." });
    await dia("ines", "2026-10-02", "presente", { entrada, sigla: "J.O." });
    await dia("ines", "2026-10-03", "presente", { entrada, sigla: "J.O.", segundosAtraso: 300 });
    await dia("ines", "2026-10-04", "incompleto", { entrada, sigla: "J.O." });
    await dia("ines", "2026-10-05", "ausente", { sigla: "A.I." });
    await dia("ines", "2026-10-06", "ausente", { sigla: "L.M." });
    await dia("ines", "2026-10-07", "ausente", { sigla: "VAC" });
    await dia("ines", "2026-10-08", "sin_turno");
    // José: todos a la hora; un día con turno y sin ninguna marca cuenta como ausencia.
    await dia("jose", "2026-10-01", "presente", { entrada, sigla: "J.O." });
    await dia("jose", "2026-10-02", "ausente", { sigla: "S.A." });
  });
  afterAll(async () => {
    mod.limpiarModulos();
    await e?.cerrar();
  });

  it("marcas a la hora y ausentismo por persona; licencias y vacaciones no cuentan en contra", async () => {
    const medir = (indicador: string) => dato<Salida>(ctx(a), MEDIR, { indicador, periodo: "2026-10" });
    const de = (r: Salida, k: string) => r.mediciones.find((m) => m.sujetoId === persona[k])?.valor;
    const hora = await medir("asistencia.marcas_a_la_hora");
    expect([de(hora, "ines"), de(hora, "jose")]).toEqual([75, 100]);
    const ausentismo = await medir("asistencia.ausentismo");
    // Inés: 1 injustificada sobre 5 días con turno (la licencia y las vacaciones quedan fuera): 20 %.
    expect([de(ausentismo, "ines"), de(ausentismo, "jose")]).toEqual([20, 50]);
    const enB = await dato<Salida>(ctx(b), MEDIR, { indicador: "asistencia.ausentismo", periodo: "2026-10" });
    expect(enB.mediciones).toEqual([]);
  });
});
