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
    const crearPersona = async (tenantId: string, nombre: string) => {
      n += 1;
      persona[nombre] = (
        await e.admin.persona.create({
          data: { tenantId, nombres: nombre, apellidos: "Prueba", rut: `${50_000_000 + n}-${sufijo.slice(0, 1)}` },
        })
      ).id;
    };
    for (const nombre of ["ines", "jose"]) await crearPersona(a, nombre);
    await crearPersona(b, "berta");
    const lugar = async (tenantId: string) => {
      const cuentaId = (await e.admin.cuenta.create({ data: { tenantId, nombre: "Cliente" } })).id;
      return (await e.admin.instalacion.create({ data: { tenantId, cuentaId, nombre: "Planta" } })).id;
    };
    const instA = await lugar(a);
    const instB = await lugar(b);
    const dia = async (
      tenantId: string,
      quien: string,
      fecha: string,
      estado: string,
      extra: Record<string, unknown> = {},
      turno: "vigente" | "anulado" | null = "vigente",
    ) => {
      let turnoEsperadoId: string | null = null;
      if (turno) {
        turnoEsperadoId = (
          await e.admin.turnoEsperado.create({
            data: {
              tenantId,
              personaId: persona[quien] ?? "",
              fecha: new Date(fecha),
              inicio: new Date(`${fecha}T11:00:00Z`),
              fin: new Date(`${fecha}T23:00:00Z`),
              instalacionId: tenantId === a ? instA : instB,
              origen: "manual",
              vigente: turno === "vigente",
            },
          })
        ).id;
      }
      await e.admin.dia.create({
        data: {
          tenantId,
          personaId: persona[quien] ?? "",
          fecha: new Date(fecha),
          tipoJornada: "ordinaria",
          estado,
          calculadoEn: new Date(),
          turnoEsperadoId,
          ...extra,
        },
      });
    };
    const entrada = new Date("2026-10-01T11:00:00Z");
    // Inés: 4 días trabajados (uno con atraso); el 5 sin marca (S.A.); el 6 su turno se anuló porque
    // registraron tarde una licencia; el 7 vacaciones; el 8 quedó «sin marca» y el turno ya terminó;
    // el 9 una ausencia registrada en la Pauta (sin día consolidado); el 10 marcó fuera de turno.
    await dia(a, "ines", "2026-10-01", "presente", { entrada, sigla: "J.O." });
    await dia(a, "ines", "2026-10-02", "presente", { entrada, sigla: "J.O." });
    // El 3 llegó 20 minutos tarde (fuera de la tolerancia de 15); el 4, 10 minutos (dentro).
    await dia(a, "ines", "2026-10-03", "presente", { entrada, sigla: "J.O.", segundosAtraso: 1200 });
    await dia(a, "ines", "2026-10-04", "incompleto", { entrada, sigla: "J.O.", segundosAtraso: 600 });
    await dia(a, "ines", "2026-10-05", "ausente", { sigla: "S.A." });
    await dia(a, "ines", "2026-10-06", "ausente", { sigla: "S.A." }, "anulado");
    await dia(a, "ines", "2026-10-07", "ausente", { sigla: "VAC" });
    await dia(a, "ines", "2026-10-08", "sin_marca");
    await dia(a, "ines", "2026-10-10", "presente", { entrada, sigla: "J.O.", segundosAtraso: 900 }, null);
    const cargo = (await e.admin.cargo.create({ data: { tenantId: a, nombre: "Guardia" } })).id;
    const puestoId = (
      await e.admin.puesto.create({
        data: { tenantId: a, instalacionId: instA, cargoId: cargo, nombre: "Portería", diasTrabajo: 4, diasDescanso: 4, horaInicio: "08:00", horaFin: "20:00" },
      })
    ).id;
    await e.admin.excepcionPauta.create({
      data: { tenantId: a, puestoId, fecha: new Date("2026-10-09"), tipo: "ausencia", motivo: "No llegó", personaId: persona.ines ?? null },
    });
    // José: a la hora y un día sin marca. Berta (otra empresa): un día sin marca.
    await dia(a, "jose", "2026-10-01", "presente", { entrada, sigla: "J.O." });
    await dia(a, "jose", "2026-10-02", "ausente", { sigla: "S.A." });
    await dia(b, "berta", "2026-10-01", "ausente", { sigla: "S.A." });
  });
  afterAll(async () => {
    mod.limpiarModulos();
    await e?.cerrar();
  });

  it("marcas a la hora y ausentismo por persona; licencias y vacaciones no cuentan en contra", async () => {
    const medir = (indicador: string) => dato<Salida>(ctx(a), MEDIR, { indicador, periodo: "2026-10" });
    const de = (r: Salida, k: string) => r.mediciones.find((m) => m.sujetoId === persona[k])?.valor;
    const hora = await medir("asistencia.marcas_a_la_hora");
    // Tolerancia de 15 minutos por defecto; la marca fuera de turno del 10 no cuenta: 3 de 4 a la hora.
    expect([de(hora, "ines"), de(hora, "jose")]).toEqual([75, 100]);
    const ausentismo = await medir("asistencia.ausentismo");
    // Inés: en contra el 5, el 8 y el 9 sobre 7 días con turno (la licencia del 6 y las vacaciones del 7 no cuentan).
    expect([de(ausentismo, "ines"), de(ausentismo, "jose")]).toEqual([42.9, 50]);
    const enB = await dato<Salida>(ctx(b), MEDIR, { indicador: "asistencia.ausentismo", periodo: "2026-10" });
    expect(enB.mediciones).toEqual([expect.objectContaining({ sujetoId: persona.berta, valor: 100 })]);
  });
});
