import { describe, expect, it } from "vitest";

import {
  avisosDesdeCalculo,
  avisoLineaPuesto,
  etiquetaCategoria,
  subtituloLineaCpq,
  ventaMensualTexto,
} from "@/lib/cpq-presentacion";
import { textoAprobacionMargenN6 } from "@/lib/cpq-aprobacion-presentacion";

describe("cpq-presentacion", () => {
  it("traduce categorías internas", () => {
    expect(etiquetaCategoria("mano_obra")).toBe("Mano de obra");
    expect(etiquetaCategoria("movilizacion")).toBe("Movilización");
  });

  it("venta pendiente no muestra cero", () => {
    expect(ventaMensualTexto(0, true)).toBe("Pendiente");
    expect(ventaMensualTexto(null, false)).toBe("Pendiente");
    expect(ventaMensualTexto(1_000_000, false)).toBe(1_000_000);
  });

  it("avisos accionables desde el motor", () => {
    const a = avisosDesdeCalculo([
      "costo laboral pendiente: motor de sueldos",
      "costo pendiente: falta mutual adicional",
    ]);
    expect(a.map((x) => x.titulo)).toEqual([
      "Falta completar el costo laboral",
      "Falta la tasa de mutual adicional",
    ]);
    expect(a[0]?.enlace?.href).toContain("remuneraciones");
  });

  it("aviso por línea con nombre del puesto", () => {
    const a = avisoLineaPuesto("costo pendiente: falta sueldo base", "Guardia noche");
    expect(a?.titulo).toContain("Guardia noche");
  });

  it("subtítulo de línea puesto sin repetir tipo genérico", () => {
    expect(
      subtituloLineaCpq({
        tipo: "puesto",
        posiciones: 2,
        patron: "4×4",
        horaInicio: "08:00",
        horaFin: "20:00",
      }),
    ).toBe("4×4 · 2 guardias");
    expect(subtituloLineaCpq({ tipo: "mano_obra" })).toBe("Mano de obra");
  });

  it("texto N6 de aprobación de margen", () => {
    expect(
      textoAprobacionMargenN6({
        autoaprobacionMargen: true,
        puedeAprobarMargen: true,
        motivoNoAprobarMargen: null,
      }).detalle,
    ).toContain("autoaprobación");
  });
});
