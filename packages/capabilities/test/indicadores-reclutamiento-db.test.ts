import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararEntorno, type Entorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { codigo, dato } from "./maestros-ayuda";

// «Reclutado por», «Retención a 90 días» y «Días para cubrir una vacante» (ADR-094, adenda CAR-309)
// contra Postgres real, con RLS sin BYPASSRLS. Datos ficticios.
describe.skipIf(!urlPropietario)("indicadores de reclutamiento contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let rita = "";
  let raul = "";
  const sufijo = randomUUID().slice(0, 8);
  const MEDIR = "core.indicadores_gestion.medir";
  type Salida = { mediciones: { sujetoId: string; valor: number | null }[] };
  let n = 0;
  let cargo = "";
  let inst = "";
  let puesto = "";
  let patron = "";

  const ctx = (tenantId: string, userId = rita, modulos: string[] = ["pauta"]) =>
    mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "user", id: userId },
      usuario: { id: userId, nombre: "Rita", email: `r-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: modulos,
    });
  const persona = async (nombre: string) => {
    n += 1;
    return (
      await e.admin.persona.create({
        data: { tenantId: a, nombres: nombre, apellidos: "Prueba", rut: `${30_000_000 + n}-${sufijo.slice(0, 1)}` },
      })
    ).id;
  };
  const vinculo = (personaId: string, inicio: string, extra: Record<string, unknown> = {}) =>
    e.admin.vinculoLaboral.create({
      data: { tenantId: a, personaId, cargoId: cargo, tipo: "indefinido", inicio: new Date(inicio), ...extra },
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    limpiarModulos();
    mod.limpiarRegistro();
    registrarModulos([
      defineModule({
        id: "pauta",
        nombre: "Pauta",
        version: "0.1.0",
        dependencias: [],
        permisos: [{ id: "pauta:read", descripcion: "Ver la pauta" }],
        navegacion: [],
        configuracion: mod.ajustesPauta,
        eventos: [],
        capacidades: [],
        indicadores: mod.indicadoresPauta,
      }),
    ]);
    mod.registrarCapacidades(mod.capacidadesDelNucleo);
    const empresa = (slug: string) =>
      e.admin.tenant
        .create({ data: { slug, nombre: slug, vertical: "seguridad", timezone: "America/Santiago" } })
        .then((t) => t.id);
    a = await empresa(`rec-a-${sufijo}`);
    b = await empresa(`rec-b-${sufijo}`);
    const usuario = async (nombre: string) =>
      (await e.admin.user.create({ data: { name: nombre, email: `${nombre}-${sufijo}@prueba.cl`, emailVerified: true } })).id;
    rita = await usuario("rita");
    raul = await usuario("raul");
    await e.admin.membership.create({ data: { tenantId: a, userId: rita, rol: "owner", portales: ["erp"] } });
    await e.admin.membership.create({ data: { tenantId: b, userId: raul, rol: "owner", portales: ["erp"] } });
    cargo = (await e.admin.cargo.create({ data: { tenantId: a, nombre: "Guardia" } })).id;
    const cuenta = (await e.admin.cuenta.create({ data: { tenantId: a, nombre: `Cuenta ${sufijo}` } })).id;
    inst = (await e.admin.instalacion.create({ data: { tenantId: a, cuentaId: cuenta, nombre: `Planta ${sufijo}` } })).id;
    patron = (await e.admin.patronTurno.create({ data: { tenantId: a, nombre: "4x4", diasTrabajo: 4, diasDescanso: 4 } })).id;
    puesto = (
      await e.admin.puesto.create({
        data: { tenantId: a, instalacionId: inst, cargoId: cargo, nombre: "Portería", diasTrabajo: 4, diasDescanso: 4, horaInicio: "08:00", horaFin: "20:00" },
      })
    ).id;
  });
  afterAll(async () => {
    limpiarModulos();
    await e?.cerrar();
  });

  it("«Reclutado por» queda con quien registra el ingreso, se puede cambiar y no acepta un usuario ajeno", async () => {
    const p = await persona("Ivo");
    const v = await dato<{ id: string; reclutadoPorId: string | null }>(ctx(a), "core.vinculos.create", {
      personaId: p,
      cargoId: cargo,
      instalacionId: inst,
      horasSemanales: 44,
      distribucion: "Lunes a viernes",
      tipo: "indefinido",
      inicio: "2026-06-01",
    });
    expect(v.reclutadoPorId).toBe(rita);
    expect(await codigo(ctx(a), "core.vinculos.update", { id: v.id, reclutadoPorId: raul })).toBe("UNPROCESSABLE");
    const sin = await dato<{ reclutadoPorId: string | null }>(ctx(a), "core.vinculos.update", {
      id: v.id,
      reclutadoPorId: null,
    });
    expect(sin.reclutadoPorId).toBeNull();
  });

  it("retención a 90 días: cuenta en el mes en que se cumplen y solo con reclutador", async () => {
    // Día 90 en octubre: julio 10 → oct 8 (sigue); julio 20 → oct 18 (salió antes); sin reclutador no cuenta.
    await vinculo(await persona("Ana"), "2026-07-10", { reclutadoPorId: rita });
    await vinculo(await persona("Beto"), "2026-07-20", {
      reclutadoPorId: rita,
      estado: "terminado",
      termino: new Date("2026-09-01"),
    });
    await vinculo(await persona("Ciro"), "2026-07-15");
    const oct = await dato<Salida>(ctx(a), MEDIR, { indicador: "core.personas_retencion_90", periodo: "2026-10" });
    expect(oct.mediciones).toEqual([expect.objectContaining({ sujetoId: rita, valor: 50 })]);
    const enB = await dato<Salida>(ctx(b, raul), MEDIR, { indicador: "core.personas_retencion_90", periodo: "2026-10" });
    expect(enB.mediciones).toEqual([]);
  });

  it("días para cubrir una vacante: desde la serie sin titular hasta la que lo tiene", async () => {
    const dana = await persona("Dana");
    await vinculo(dana, "2026-10-20", { reclutadoPorId: rita });
    const serie = (desde: string, titular: string | null, hasta?: string) =>
      e.admin.seriePauta.create({
        data: {
          tenantId: a,
          puestoId: puesto,
          patronId: patron,
          inicioCiclo: new Date("2026-09-01"),
          titularPersonaId: titular,
          vigenteDesde: new Date(desde),
          ...(hasta ? { vigenteHasta: new Date(hasta) } : {}),
        },
      });
    await serie("2026-09-01", await persona("Eli"), "2026-10-04");
    await serie("2026-10-05", null, "2026-10-14");
    await serie("2026-10-15", null, "2026-10-21");
    await serie("2026-10-22", dana);
    const oct = await dato<Salida>(ctx(a), MEDIR, { indicador: "pauta.dias_cubrir_vacante", periodo: "2026-10" });
    // Sin titular desde el 5 hasta que Dana lo toma el 22: 17 días, atribuidos a Rita.
    expect(oct.mediciones).toEqual([expect.objectContaining({ sujetoId: rita, valor: 17 })]);
    const sep = await dato<Salida>(ctx(a), MEDIR, { indicador: "pauta.dias_cubrir_vacante", periodo: "2026-09" });
    expect(sep.mediciones).toEqual([]);
  });
});
