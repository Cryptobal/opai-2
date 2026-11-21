// CAR-501 / CAR-748: vigilancia de Rondas cada 5 min contra Postgres real. En el tramo revisado emite «no realizada» para la
// programación sin inicio, «atrasada» para la ronda sin cierre a tiempo y «punto omitido» para el tramo vencido;
// no emite nada para lo que se inició a tiempo, ni en otra empresa, ni sin el módulo activo.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { instanteLocal } from "@opai/domain";

import { tramoEn } from "../../../apps/web/lib/cron";
import { type Entorno, prepararEntorno, urlPropietario } from "../../db/test/entorno";

import type * as ModuloCapacidades from "../src";

const ZONA = "America/Santiago";
const MIN = 60_000;

/** Tramo en curso (lo que encola el cron de trabajos) y el instante en que empieza. */
function tramoLocal(): { tramo: string; hasta: Date } {
  const tramo = tramoEn(ZONA);
  const hasta = instanteLocal(tramo.slice(0, 10), tramo.slice(11), ZONA);
  return { tramo, hasta };
}
const hhmm = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "2-digit", minute: "2-digit" }).format(
    d,
  );

describe.skipIf(!urlPropietario)("vigilancia de rondas en base real (CAR-501)", () => {
  let e: Entorno;
  let mod: typeof ModuloCapacidades;
  const t = { A: "", B: "" };
  const inst = { A: "", B: "" };
  let disp = "";
  const { tramo, hasta } = tramoLocal();
  const desde = new Date(hasta.getTime() - 5 * MIN);
  const pedida = new Date(desde.getTime() + 2 * MIN);
  const pl = { atrasada: "", aTiempo: "" };
  const puntos: string[] = [];
  let ejecucionAtrasada = "";

  const correr = (k: "A" | "B", modulos = ["rondas"]) =>
    mod.trabajoVigilanciaRondas.ejecutar(
      mod.crearContexto({
        tenantId: t[k],
        actor: { tipo: "system" },
        rol: "owner",
        alcance: null,
        medidor: { registrar: async () => undefined },
        modulosActivos: modulos,
      }),
      { tramo },
    );
  const eventos = (k: "A" | "B", tipo: string) =>
    e.admin.evento.findMany({ where: { tenantId: t[k], tipo } });

  beforeAll(async () => {
    e = await prepararEntorno();
    mod = await import("../src");
    const s = randomUUID().slice(0, 8);
    for (const k of ["A", "B"] as const) {
      t[k] = (
        await e.admin.tenant.create({
          data: {
            slug: `rv-${k.toLowerCase()}-${s}`,
            nombre: k,
            vertical: "seguridad",
            timezone: ZONA,
          },
        })
      ).id;
      const cuentaId = (await e.admin.cuenta.create({ data: { tenantId: t[k], nombre: "C" } })).id;
      inst[k] = (
        await e.admin.instalacion.create({
          data: { tenantId: t[k], cuentaId, nombre: `Planta ${k}` },
        })
      ).id;
    }
    disp = (
      await e.admin.dispositivo.create({
        data: {
          tenantId: t.A,
          instalacionId: inst.A,
          identificador: "DSP-1",
          estado: "activo",
          tokenHash: `h-${s}`,
        },
      })
    ).id;
    for (const n of ["P1", "P2"])
      puntos.push(
        (
          await e.admin.puntoControl.create({
            data: { tenantId: t.A, instalacionId: inst.A, nombre: n, modo: "gps" },
          })
        ).id,
      );
    const plantilla = async (extra: object) => {
      const p = await e.admin.plantillaRonda.create({
        data: {
          tenantId: t.A,
          instalacionId: inst.A,
          nombre: randomUUID().slice(0, 6),
          tiempoMaxMin: 30,
          ...extra,
        },
      });
      for (const [i, puntoId] of puntos.entries())
        await e.admin.plantillaPunto.create({
          data: { tenantId: t.A, plantillaId: p.id, puntoId, orden: i },
        });
      await e.admin.programacion.create({
        data: {
          tenantId: t.A,
          instalacionId: inst.A,
          plantillaId: p.id,
          nombre: "Prog",
          horarios: [hhmm(pedida)],
          diasSemana: [0, 1, 2, 3, 4, 5, 6],
          toleranciaMin: 5,
        },
      });
      return p.id;
    };
    pl.atrasada = await plantilla({ tiempoMaxMin: 3, tiempoMaxTramoMin: 2 });
    pl.aTiempo = await plantilla({ tiempoMaxMin: 480 });
    const ejecucion = async (plantillaId: string, inicio: Date) =>
      (
        await e.admin.ejecucionRonda.create({
          data: {
            tenantId: t.A,
            instalacionId: inst.A,
            plantillaId,
            dispositivoId: disp,
            clave: randomUUID(),
            horaInicio: inicio,
          },
        })
      ).id;
    ejecucionAtrasada = await ejecucion(pl.atrasada, new Date(desde.getTime() - MIN));
    await e.admin.marcaRonda.create({
      data: {
        tenantId: t.A,
        instalacionId: inst.A,
        puntoId: puntos[0] ?? "",
        dispositivoId: disp,
        clave: randomUUID(),
        horaCorregida: new Date(desde.getTime() - 30_000),
        geocerca: "sin_gps",
        ejecucionId: ejecucionAtrasada,
      },
    });
    // La otra plantilla se inició 2 min después de la hora pedida: dentro de la tolerancia.
    await ejecucion(pl.aTiempo, new Date(pedida.getTime() + 2 * MIN));
  }, 120_000);
  afterAll(async () => {
    await e?.cerrar?.();
  });

  it("emite no realizada, atrasada y punto omitido del tramo revisado, una vez cada una", async () => {
    expect(await correr("A")).toEqual({ senales: 3 });
    expect(await correr("A")).toEqual({ senales: 0 });
    const [noHecha] = await eventos("A", "rondas.ejecucion.no_realizada");
    expect(noHecha?.payload).toEqual({
      instalacionId: inst.A,
      plantillaId: pl.atrasada,
      programadaPara: pedida.toISOString(),
      tramo,
    });
    const atrasadas = await eventos("A", "rondas.ejecucion.atrasada");
    expect(atrasadas.map((x) => x.entidadId)).toEqual([ejecucionAtrasada]);
    expect(atrasadas[0]?.payload).toMatchObject({
      instalacionId: inst.A,
      vencioEn: new Date(desde.getTime() + 2 * MIN).toISOString(),
    });
    const [omitido] = await eventos("A", "rondas.punto.omitido");
    expect(omitido?.payload).toMatchObject({ instalacionId: inst.A, puntoId: puntos[1] });
  });

  it("nada en la otra empresa ni sin el módulo Rondas", async () => {
    expect(await correr("B")).toEqual({ senales: 0 });
    expect(await correr("A", [])).toEqual({ senales: 0 });
    expect(await e.admin.evento.count({ where: { tenantId: t.B } })).toBe(0);
  });
});
