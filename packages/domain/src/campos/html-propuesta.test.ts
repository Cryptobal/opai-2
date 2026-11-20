import { describe, expect, it } from "vitest";

import { renderizarPlantillaCampos } from "./render";
import { htmlResumenEconomico, htmlTablaServicio } from "./html-propuesta";
import { valoresPuesto } from "./mapeo-puesto";

describe("html-propuesta", () => {
  it("genera tabla y resumen con formato CLP", () => {
    const tabla = htmlTablaServicio([
      {
        nombre: "Recepción",
        posiciones: 2,
        patron: "4×4",
        horaInicio: "08:00",
        horaFin: "20:00",
        diasCobertura: 7,
        ventaMensualClp: 1_800_000,
        seccion: "Sede",
      },
    ]);
    expect(tabla).toContain("Recepción");
    expect(tabla).toContain("$");
    const resumen = htmlResumenEconomico({
      netoMensualClp: 3_500_000,
      ivaClp: 665_000,
      totalMensualClp: 4_165_000,
      mesesContrato: 12,
    });
    expect(resumen).toContain("12");
    expect(resumen).toContain("Neto mensual");
  });

  it("renderiza bloques HTML sin escapar etiquetas", () => {
    const html = "<table><tr><td>X</td></tr></table>";
    const r = renderizarPlantillaCampos("Precio: {{bloque.tabla_servicio}}", {
      campos: { "bloque.tabla_servicio": html },
    }, { finalidad: "propuesta", html: true });
    expect(r.ok && r.texto.includes("<table>")).toBe(true);
  });

  it("repite puestos con cantidad y precio", () => {
    const fila = valoresPuesto({
      nombre: "Patrulla",
      posiciones: 1,
      patron: "5×2",
      horaInicio: null,
      horaFin: null,
      diasCobertura: 5,
      ventaMensualClp: 900_000,
      seccion: "Planta",
    });
    const plantilla = "{{#cada puestos}}{{puesto.nombre}} · {{puesto.precio_mensual | clp}}\n{{/cada}}";
    const r = renderizarPlantillaCampos(plantilla, { colecciones: { puestos: [fila] } }, { finalidad: "propuesta" });
    expect(r.ok && r.texto.includes("Patrulla")).toBe(true);
    expect(r.ok && r.texto.includes("$")).toBe(true);
  });
});