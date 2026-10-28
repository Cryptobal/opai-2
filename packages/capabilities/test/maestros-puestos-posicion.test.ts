import { beforeEach, describe, expect, it } from "vitest";

import { contextoDePrueba } from "../src/testing";
import { codigo, dato, reiniciar } from "./maestros-ayuda";

beforeEach(reiniciar);

async function base() {
  const p = contextoDePrueba();
  const cuenta = await dato<{ id: string }>(p.ctx, "core.cuentas.create", { nombre: "Seguridad Sur" });
  const cargo = await dato<{ id: string }>(p.ctx, "core.cargos.create", { nombre: "Guardia" });
  const instalacion = await dato<{ id: string }>(p.ctx, "core.instalaciones.create", {
    cuentaId: cuenta.id,
    nombre: "Torre Centro",
  });
  const patron = await dato<{ id: string; resumen: string }>(p.ctx, "core.patrones.create", {
    nombre: "4×4",
    clase: "ciclico",
    diasTrabajo: 4,
    diasDescanso: 4,
  });
  const funcion = await dato<{ id: string }>(p.ctx, "core.funciones.create", { nombre: "Guardia" });
  return { ...p, cargoId: cargo.id, instalacionId: instalacion.id, patron, funcionId: funcion.id };
}

describe("Puestos PR 1 · el puesto como posición", () => {
  it("el patrón fija el ciclo, el puesto nace en PPC y calcula las horas semanales", async () => {
    const { ctx, cargoId, instalacionId, patron, funcionId, tabla } = await base();
    const p = await dato<{
      cobertura: string;
      coberturaMotivo: string | null;
      diasTrabajo: number;
      diasDescanso: number;
      patron: string | null;
      patronResumen: string | null;
      funcion: string | null;
      horasSemanales: number | null;
      dotacion: number;
    }>(ctx, "core.puestos.create", {
      instalacionId,
      cargoId,
      funcionId,
      patronId: patron.id,
      nombre: "Guardia día",
      diasTrabajo: 1,
      diasDescanso: 1,
      horaInicio: "08:00",
      horaFin: "20:00",
      colacionMin: 60,
    });
    expect(p).toMatchObject({ cobertura: "ppc", coberturaMotivo: "sin_asignar", dotacion: 1 });
    // El ciclo lo fija el patrón (4×4), no el 1×1 enviado.
    expect(p.diasTrabajo).toBe(4);
    expect(p.diasDescanso).toBe(4);
    expect(p.patron).toBe("4×4");
    expect(p.patronResumen).toContain("Ciclo de 8");
    expect(p.funcion).toBe("Guardia");
    // 4×4, 12 h con 60 min de colación dentro → 38,5 h semanales.
    expect(p.horasSemanales).toBe(38.5);
    expect(tabla("evento").map((e) => e["tipo"])).toContain("core.puesto.creado");
  });

  it("la vista previa no escribe y el tramo de noche se refleja en el horario", async () => {
    const { ctx, cargoId, instalacionId, patron, tabla } = await base();
    const entrada = {
      instalacionId,
      cargoId,
      patronId: patron.id,
      nombre: "Rotativo",
      diasTrabajo: 4,
      diasDescanso: 4,
      horaInicio: "08:00",
      horaFin: "20:00",
      horaInicioNoche: "20:00",
      horaFinNoche: "08:00",
      jornada: "rotativa" as const,
    };
    const previa = await dato<{ horarioNoche: string | null }>(ctx, "core.puestos.create", entrada, {
      dryRun: true,
    });
    expect(previa.horarioNoche).toBe("20:00–08:00 (+1)");
    expect(tabla("puesto")).toHaveLength(0);
  });

  it("rechaza un patrón de un catálogo desactivado y un patrón semanal sin días", async () => {
    const { ctx, cargoId, instalacionId, patron } = await base();
    expect(
      await codigo(ctx, "core.patrones.create", {
        nombre: "L a V",
        clase: "semanal",
        diasTrabajo: 5,
        diasDescanso: 2,
      }),
    ).toBe("UNPROCESSABLE");
    await dato(ctx, "core.patrones.set_activo", { id: patron.id, activo: false });
    expect(
      await codigo(ctx, "core.puestos.create", {
        instalacionId,
        cargoId,
        patronId: patron.id,
        nombre: "Puesto inválido",
        diasTrabajo: 4,
        diasDescanso: 4,
        horaInicio: "08:00",
        horaFin: "20:00",
      }),
    ).toBe("UNPROCESSABLE");
  });

  it("lista los patrones de fábrica con su resumen y cuenta los puestos que los usan", async () => {
    const { ctx, cargoId, instalacionId, patron } = await base();
    await dato(ctx, "core.puestos.create", {
      instalacionId,
      cargoId,
      patronId: patron.id,
      nombre: "Guardia día",
      diasTrabajo: 4,
      diasDescanso: 4,
      horaInicio: "08:00",
      horaFin: "20:00",
    });
    const patrones = await dato<{ id: string; nombre: string; resumen: string; puestosActivos: number }[]>(
      ctx,
      "core.patrones.list",
      {},
    );
    const cuatro = patrones.find((x) => x.nombre === "4×4");
    expect(cuatro?.resumen).toContain("4 de trabajo, 4 de descanso");
    expect(cuatro?.puestosActivos).toBe(1);
  });
});
