import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararEntorno, type Entorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { dato } from "./maestros-ayuda";

// Indicadores de Operaciones (ADR-094, CAR-310) contra Postgres real, con RLS sin BYPASSRLS. Rondas
// completas por guardia y, por instalación, cobertura y turnos descubiertos cargados al supervisor y al
// jefe de zona (adenda CAR-310). Datos ficticios.
describe.skipIf(!urlPropietario)("indicadores de Operaciones contra Postgres real", () => {
  let e: Entorno;
  let a = "";
  let b = "";
  let usuaria = "";
  let sara = "";
  let zoe = "";
  const sufijo = randomUUID().slice(0, 8);
  const MEDIR = "core.indicadores_gestion.medir";
  type Salida = { mediciones: { sujetoId: string; valor: number | null }[] };
  const persona: Record<string, string> = {};

  const ctx = (tenantId: string) =>
    mod.crearContexto({
      tenantId,
      rol: "owner",
      actor: { tipo: "user", id: usuaria },
      usuario: { id: usuaria, nombre: "Ops", email: `o-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["rondas", "pauta"],
    });

  beforeAll(async () => {
    e = await prepararEntorno();
    limpiarModulos();
    mod.limpiarRegistro();
    registrarModulos([
      defineModule({
        id: "rondas",
        nombre: "Rondas",
        version: "0.1.0",
        dependencias: [],
        permisos: [{ id: "rondas:read", descripcion: "Ver rondas" }],
        navegacion: [],
        configuracion: mod.ajustesRondas,
        eventos: [],
        capacidades: [],
        indicadores: mod.indicadoresRondas,
      }),
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
    a = await empresa(`iop-a-${sufijo}`);
    b = await empresa(`iop-b-${sufijo}`);
    usuaria = (
      await e.admin.user.create({ data: { name: "Ops", email: `o-${sufijo}@prueba.cl`, emailVerified: true } })
    ).id;
    for (const tenantId of [a, b]) {
      await e.admin.membership.create({ data: { tenantId, userId: usuaria, rol: "owner", portales: ["erp"] } });
    }
    const cuentaId = (await e.admin.cuenta.create({ data: { tenantId: a, nombre: "Cliente" } })).id;
    const instalacionId = (await e.admin.instalacion.create({ data: { tenantId: a, cuentaId, nombre: "Planta" } })).id;
    const dispositivoId = (
      await e.admin.dispositivo.create({
        data: { tenantId: a, instalacionId, identificador: "DSP-1", estado: "activo", tokenHash: `h-${sufijo}` },
      })
    ).id;
    const plantillaId = (
      await e.admin.plantillaRonda.create({ data: { tenantId: a, instalacionId, nombre: "Perímetro", tiempoMaxMin: 30 } })
    ).id;
    let n = 0;
    for (const nombre of ["gino", "hugo"]) {
      n += 1;
      persona[nombre] = (
        await e.admin.persona.create({
          data: { tenantId: a, nombres: nombre, apellidos: "Prueba", rut: `${40_000_000 + n}-${sufijo.slice(0, 1)}` },
        })
      ).id;
    }
    const ronda = async (quien: string, hora: string, estado: string, marcados: number) => {
      const ejecucion = await e.admin.ejecucionRonda.create({
        data: {
          tenantId: a,
          instalacionId,
          plantillaId,
          dispositivoId,
          clave: randomUUID(),
          personaId: persona[quien] ?? null,
          horaInicio: new Date(hora),
        },
      });
      await e.admin.cierreRonda.create({
        data: {
          tenantId: a,
          instalacionId,
          ejecucionId: ejecucion.id,
          dispositivoId,
          clave: randomUUID(),
          personaId: persona[quien] ?? null,
          estado,
          puntosObligatorios: 4,
          puntosMarcados: marcados,
          horaCierre: new Date(hora),
        },
      });
    };
    // Gino: 3 completas y 1 incompleta en octubre; una incompleta en septiembre no cuenta.
    for (const d of ["05", "06", "07"]) await ronda("gino", `2026-10-${d}T03:00:00Z`, "completada", 4);
    await ronda("gino", "2026-10-08T03:00:00Z", "incompleta", 2);
    await ronda("gino", "2026-09-20T03:00:00Z", "incompleta", 1);
    await ronda("hugo", "2026-10-10T03:00:00Z", "completada", 4);

    // Pauta: Sara supervisa la planta; Zoe es su jefa de zona (el cargo Supervisor reporta a Jefe de zona).
    const usuario = async (nombre: string) =>
      (await e.admin.user.create({ data: { name: nombre, email: `${nombre}-${sufijo}@prueba.cl`, emailVerified: true } })).id;
    sara = await usuario("sara");
    zoe = await usuario("zoe");
    const jefaZona = (await e.admin.cargo.create({ data: { tenantId: a, nombre: "Jefe de zona" } })).id;
    const supervisor = (
      await e.admin.cargo.create({ data: { tenantId: a, nombre: "Supervisor", jefaturaCargoId: jefaZona, jefaturaVe: "equipo" } })
    ).id;
    const guardia = (await e.admin.cargo.create({ data: { tenantId: a, nombre: "Guardia" } })).id;
    for (const [nombre, userId, cargoId] of [
      ["zoe", zoe, jefaZona],
      ["sara", sara, supervisor],
      ["gino-titular", null, guardia],
    ] as const) {
      n += 1;
      // La ficha solo se une a un usuario con membresía en la empresa.
      if (userId) {
        await e.admin.membership.create({ data: { tenantId: a, userId, rol: "supervisor", portales: ["erp"] } });
      }
      const p = await e.admin.persona.create({
        data: {
          tenantId: a,
          nombres: nombre,
          apellidos: "Prueba",
          rut: `${40_000_000 + n}-${sufijo.slice(0, 1)}`,
          ...(userId ? { usuarioId: userId } : {}),
        },
      });
      persona[nombre] = p.id;
      await e.admin.vinculoLaboral.create({
        data: { tenantId: a, personaId: p.id, cargoId, instalacionId, tipo: "indefinido", inicio: new Date("2026-01-01") },
      });
    }
    const membresia = await e.admin.membership.findFirstOrThrow({ where: { tenantId: a, userId: sara } });
    await e.admin.supervisorInstalacion.create({ data: { tenantId: a, membershipId: membresia.id, instalacionId } });
    const patron = (await e.admin.patronTurno.create({ data: { tenantId: a, nombre: "4x4", diasTrabajo: 4, diasDescanso: 4 } })).id;
    const puestoId = (
      await e.admin.puesto.create({
        data: { tenantId: a, instalacionId, cargoId: guardia, nombre: "Portería", diasTrabajo: 4, diasDescanso: 4, horaInicio: "08:00", horaFin: "20:00" },
      })
    ).id;
    await e.admin.seriePauta.create({
      data: {
        tenantId: a,
        puestoId,
        patronId: patron,
        inicioCiclo: new Date("2026-10-01"),
        titularPersonaId: persona["gino-titular"] ?? null,
        vigenteDesde: new Date("2026-10-01"),
      },
    });
    // Un día de ausencia sin reemplazo: queda como puesto por cubrir.
    await e.admin.excepcionPauta.create({
      data: { tenantId: a, puestoId, fecha: new Date("2026-10-02"), tipo: "ausencia", motivo: "Enfermo", personaId: persona["gino-titular"] ?? null },
    });
  });
  afterAll(async () => {
    limpiarModulos();
    await e?.cerrar();
  });

  it("rondas completas: por guardia y por mes de cierre", async () => {
    const oct = await dato<Salida>(ctx(a), MEDIR, { indicador: "rondas.rondas_completas", periodo: "2026-10" });
    const valor = (k: string) => oct.mediciones.find((m) => m.sujetoId === persona[k])?.valor;
    expect([valor("gino"), valor("hugo")]).toEqual([75, 100]);
    const enB = await dato<Salida>(ctx(b), MEDIR, { indicador: "rondas.rondas_completas", periodo: "2026-10" });
    expect(enB.mediciones).toEqual([]);
  });

  it("cobertura y turnos descubiertos de la instalación se cargan al supervisor y a su jefa de zona", async () => {
    const medir = (indicador: string) => dato<Salida>(ctx(a), MEDIR, { indicador, periodo: "2026-10" });
    const de = (r: Salida, u: string) => r.mediciones.find((m) => m.sujetoId === u)?.valor;
    const cobertura = await medir("pauta.cobertura");
    const descubiertos = await medir("pauta.turnos_descubiertos");
    // 4x4 desde el 1 de octubre: 16 turnos; uno quedó sin cubrir.
    expect([de(cobertura, sara), de(cobertura, zoe)]).toEqual([93.8, 93.8]);
    expect([de(descubiertos, sara), de(descubiertos, zoe)]).toEqual([1, 1]);
    const enB = await dato<Salida>(ctx(b), MEDIR, { indicador: "pauta.cobertura", periodo: "2026-10" });
    expect(enB.mediciones).toEqual([]);
  });
});
