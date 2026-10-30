// Corrección del #141 (revisión 5707863593): dos bloqueos por pérdida de datos en las pantallas de
// Rondas. (1) Editar una programación no debe borrar los responsables fijados por API o MCP; la
// pantalla del PR 1b no los edita pero los arrastra. (2) Editar una plantilla no debe borrar de la
// secuencia los puntos ya archivados, que la pantalla no muestra pero debe conservar.
import { describe, expect, it } from "vitest";

import {
  inicialProgramacion,
  programacionAInput,
} from "@/app/(erp)/instalaciones/_componentes/rondas/hoja-programacion-datos";
import {
  inicialPlantilla,
  plantillaAInput,
  secuenciaAGuardar,
} from "@/app/(erp)/instalaciones/_componentes/rondas/hoja-plantilla-datos";
import type { Plantilla, Programacion, Punto } from "@/app/(erp)/instalaciones/_componentes/rondas/tipos";

const PERSONA_A = "0192f3a0-0000-7000-8000-00000000d101";
const PERSONA_B = "0192f3a0-0000-7000-8000-00000000d102";
const PUNTO_ACTIVO = "0192f3a0-0000-7000-8000-0000000000a1";
const PUNTO_ARCHIVADO = "0192f3a0-0000-7000-8000-0000000000a2";
const INST = "0192f3a0-0000-7000-8000-00000000c101";

function programacion(p: Partial<Programacion> = {}): Programacion {
  return {
    id: "0192f3a0-0000-7000-8000-0000000000b1",
    instalacionId: INST,
    plantillaId: "0192f3a0-0000-7000-8000-0000000000b2",
    nombre: "Ronda noche",
    horarios: ["08:00"],
    diasSemana: [1, 2, 3],
    vigenciaDesde: null,
    vigenciaHasta: null,
    toleranciaMin: 15,
    responsables: { modo: "personas", personaIds: [PERSONA_A, PERSONA_B] },
    estado: "activa",
    ...p,
  };
}

describe("hoja-programacion: responsables (bloqueo 1, pérdida de datos)", () => {
  it("al editar conserva el modo y los personaIds existentes (no los pisa con por_turno/[])", () => {
    const prog = programacion();
    const d = inicialProgramacion(prog, "plantilla-x");
    // La pantalla cambia un campo no relacionado (tolerancia) y guarda.
    const input = programacionAInput({ ...d, toleranciaMin: "20" }, INST, prog.id);
    expect(input.responsables).toEqual({ modo: "personas", personaIds: [PERSONA_A, PERSONA_B] });
    expect("id" in input && input.id).toBe(prog.id);
  });

  it("al crear usa «por_turno» sin personas", () => {
    const d = inicialProgramacion(null, "plantilla-x");
    const input = programacionAInput(d, INST, null);
    expect(input.responsables).toEqual({ modo: "por_turno", personaIds: [] });
  });

  it("conserva el modo por_turno si la programación existente lo tenía", () => {
    const prog = programacion({ responsables: { modo: "por_turno", personaIds: [] } });
    const input = programacionAInput(inicialProgramacion(prog, "p"), INST, prog.id);
    expect(input.responsables).toEqual({ modo: "por_turno", personaIds: [] });
  });
});

function punto(id: string): Punto {
  return {
    id,
    instalacionId: INST,
    nombre: `Punto ${id.slice(-2)}`,
    modo: "qr_gps",
    estricto: false,
    latitud: -33.45,
    longitud: -70.66,
    radioM: 15,
    precisionMinM: 25,
    permanenciaS: 15,
    etiquetaQr: "RQR-1",
    exigeFoto: false,
    instrucciones: null,
    estado: "activo",
    creadoEn: "2026-10-01T00:00:00.000Z",
  };
}

function plantilla(): Plantilla {
  return {
    id: "0192f3a0-0000-7000-8000-0000000000c1",
    instalacionId: INST,
    nombre: "Plantilla con archivado",
    ordenModo: "sugerido",
    tiempoMaxMin: 40,
    tiempoMaxTramoMin: null,
    umbralIncompletaPct: 20,
    permiteAdhoc: true,
    estado: "activo",
    // La secuencia tiene un punto activo y uno ya archivado (no vendrá en `puntos`).
    puntos: [
      { puntoId: PUNTO_ACTIVO, orden: 0, obligatorio: true },
      { puntoId: PUNTO_ARCHIVADO, orden: 1, obligatorio: false },
    ],
  };
}

describe("hoja-plantilla: puntos archivados (bloqueo 2, pérdida de datos)", () => {
  it("conserva en la secuencia los puntos archivados que la pantalla no muestra", () => {
    const activos = [punto(PUNTO_ACTIVO)]; // el archivado no está entre los activos
    const d = inicialPlantilla(plantilla(), activos);
    expect(d.archivados).toEqual([{ puntoId: PUNTO_ARCHIVADO, orden: 1, obligatorio: false }]);
    const sec = secuenciaAGuardar(d);
    const ids = sec.map((p) => p.puntoId);
    expect(ids).toContain(PUNTO_ARCHIVADO);
    expect(ids).toContain(PUNTO_ACTIVO);
    // Ordenes renumerados sin colisiones.
    expect(new Set(sec.map((p) => p.orden)).size).toBe(sec.length);
    // El archivado conserva su carácter opcional.
    expect(sec.find((p) => p.puntoId === PUNTO_ARCHIVADO)?.obligatorio).toBe(false);
    // `plantillaAInput` envuelve `secuenciaAGuardar` en `puntos`; al editar lleva el `id`.
    const input = plantillaAInput(d, INST, plantilla().id);
    expect("id" in input && input.id).toBe(plantilla().id);
  });

  it("sin archivados, la secuencia es solo los activos elegidos", () => {
    const pl = plantilla();
    pl.puntos = [{ puntoId: PUNTO_ACTIVO, orden: 0, obligatorio: true }];
    const d = inicialPlantilla(pl, [punto(PUNTO_ACTIVO)]);
    expect(d.archivados).toEqual([]);
    expect(secuenciaAGuardar(d)).toEqual([{ puntoId: PUNTO_ACTIVO, orden: 0, obligatorio: true }]);
  });
});
