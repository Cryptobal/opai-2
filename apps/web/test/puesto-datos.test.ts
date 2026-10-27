// Brief 11 · Puestos PR 1 (revisión 5658390255, punto 5): la hoja de puesto no reenvía horas
// semanales viejas. Solo se envían si el usuario las escribió; si cambia algo que las afecta y no
// las tocó, el valor mostrado se vacía y el servidor las recalcula.
import { describe, expect, it } from "vitest";

import {
  conCambio,
  inicialPuesto,
  puestoAInput,
} from "@/app/(erp)/instalaciones/_componentes/puesto-datos";
import type { Puesto } from "@/lib/tipos-maestros";

const existente = { nombre: "Día", horasSemanales: 42, horaInicio: "08:00", horaFin: "20:00" } as Partial<Puesto>;

describe("horas semanales de la hoja de puesto", () => {
  it("al editar sin tocar las horas no se envían", () => {
    const d = conCambio(inicialPuesto(existente as Puesto), "nombre", "Día norte");
    expect(d.horas).toBe("42");
    expect(puestoAInput(d)).not.toHaveProperty("horasSemanales");
  });

  it("si cambia el horario y no se tocaron, se vacían y no se envían", () => {
    const d = conCambio(inicialPuesto(existente as Puesto), "fin", "18:00");
    expect(d.horas).toBe("");
    expect(puestoAInput(d)).not.toHaveProperty("horasSemanales");
  });

  it("si el usuario las escribe, se envían y no se borran al cambiar el horario", () => {
    const tocado = { ...inicialPuesto(existente as Puesto), horas: "40", horasTocadas: true };
    const d = conCambio(tocado, "inicio", "07:00");
    expect(puestoAInput(d)).toMatchObject({ horasSemanales: 40 });
    expect(puestoAInput({ ...d, horas: "" })).toMatchObject({ horasSemanales: null });
  });
});
