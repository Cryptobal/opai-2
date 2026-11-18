import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { validarPlantillaCampos } from "@opai/domain";

vi.mock("@/app/(erp)/configuracion/_cpq/use-vista-previa-cotizacion", () => ({
  useVistaPreviaCotizacion: () => ({ vista: null, pendiente: false, error: null }),
}));
vi.mock("@/app/(erp)/configuracion/_cpq/selector-cotizacion-vista", () => ({
  SelectorCotizacionVista: () => createElement("span", null, "Selector de prueba"),
}));
import { VistaPreviaCpqPlantilla } from "@/app/(erp)/configuracion/_cpq/vista-previa-cpq-plantilla";

describe("contrato de las pruebas preview CPQ", () => {
  it("espera la cotización antes de mostrar el iframe", () => {
    const html = renderToStaticMarkup(createElement(VistaPreviaCpqPlantilla, {
      htmlBorrador: "<p>Prueba ficticia</p>", titulo: "Vista previa del HTML subido",
    }));
    expect(html).toContain("Elige una cotización");
    expect(html).not.toContain("<iframe");
  });
  it("expone claves canónicas y separa la colección puestos de los campos usados", () => {
    const r = validarPlantillaCampos("{{tabla_servicio}}{{resumen_economico}}{{#cada puestos}}{{puesto.nombre}}{{puesto.cantidad}}{{/cada}}", "propuesta");
    expect(r.ok).toBe(true);
    expect(r.usados).toEqual(["bloque.tabla_servicio", "bloque.resumen_economico", "puesto.nombre", "puesto.cantidad"]);
    expect(r.colecciones).toEqual(["puestos"]);
  });
});
