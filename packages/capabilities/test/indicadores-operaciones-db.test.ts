import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prepararEntorno, type Entorno, urlPropietario } from "../../db/test/entorno";
import * as mod from "../src";
import { defineModule, limpiarModulos, registrarModulos } from "../src/module";
import { dato } from "./maestros-ayuda";

// Indicadores de Operaciones (ADR-094, CAR-310) contra Postgres real, con RLS sin BYPASSRLS. Rondas
// completas por guardia: cierres completos, incompletos y de otro mes. Datos ficticios.
describe.skipIf(!urlPropietario)("indicadores de Operaciones contra Postgres real", () => {
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
      usuario: { id: usuaria, nombre: "Ops", email: `o-${sufijo}@prueba.cl`, platformRole: null },
      portal: "erp",
      portalesMembresia: ["erp"],
      modulosActivos: ["rondas"],
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
});
