import { describe, expect, it } from "vitest";

import {
  avisosDesdeCalculo,
  avisoLineaPuesto,
  dotacionPersonasTexto,
  etiquetaCategoria,
  mensajeFaltantesRecalcular,
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
      "costo pendiente: mutual adicional sin confirmar",
    ]);
    expect(a.map((x) => x.titulo)).toEqual(["Mutual adicional sin confirmar"]);
    expect(a[0]?.enlace?.href).toBe("/configuracion/remuneraciones");
  });

  it("mensaje de recálculo resume faltantes", () => {
    expect(
      mensajeFaltantesRecalcular([
        "costo pendiente: falta sueldo_imponible_minimo",
        "costo pendiente: mutual adicional sin confirmar",
      ]),
    ).toMatch(/sueldo_imponible_minimo/);
  });

  it("dotación pluraliza personas", () => {
    expect(dotacionPersonasTexto(10_000)).toBe("1 persona");
    expect(dotacionPersonasTexto(20_000)).toBe("2 personas");
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
