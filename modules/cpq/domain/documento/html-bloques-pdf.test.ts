import { describe, expect, it } from "vitest";

import { bloquesDeHtml } from "./html-bloques-pdf";

describe("HTML de la plantilla → bloques del PDF (CAR-533)", () => {
  it("títulos con color, párrafos, viñetas numeradas, reglas y saltos de línea", () => {
    const b = bloquesDeHtml(
      '<section><h1 style="color: #1f3a5f">Propuesta <strong>Alfa</strong></h1><p>Uno<br>dos   tres</p>' +
        "<ol><li>Ronda</li><li>Control</li></ol><ul><li>Guardia</li></ul><hr></section>",
    );
    expect(b).toEqual([
      { t: "titulo", nivel: 1, texto: "Propuesta Alfa", color: "#1f3a5f" },
      { t: "parrafo", texto: "Uno\ndos tres", color: null },
      { t: "item", marca: "1.", texto: "Ronda" },
      { t: "item", marca: "2.", texto: "Control" },
      { t: "item", marca: "•", texto: "Guardia" },
      { t: "regla" },
    ]);
  });

  it("tablas con encabezado y texto suelto dentro de contenedores", () => {
    const b = bloquesDeHtml(
      "<div>Texto suelto <em>con énfasis</em><table><thead><tr><th>Puesto</th><th>Turno</th></tr></thead>" +
        "<tbody><tr><td>Guardia</td><td>4×4</td></tr><tr><td></td><td></td></tr></tbody></table></div>",
    );
    expect(b).toEqual([
      { t: "parrafo", texto: "Texto suelto con énfasis", color: null },
      {
        t: "tabla",
        filas: [
          { celdas: ["Puesto", "Turno"], encabezado: true },
          { celdas: ["Guardia", "4×4"], encabezado: false },
        ],
      },
    ]);
  });

  it("descarta lo vacío y no interpreta colores que no sean hexadecimales", () => {
    expect(bloquesDeHtml('<p style="color: red">Hola</p><p>  </p><h2></h2>')).toEqual([{ t: "parrafo", texto: "Hola", color: null }]);
  });
});

it("omite contenido no visible también dentro de párrafos, tablas y spans", () => {
  const oculto = "<style>CSS_OCULTO</style><script>JS_OCULTO</script><template>TPL_OCULTO</template>";
  const bloques = bloquesDeHtml(`<p>Visible${oculto}</p><table><tr><td>Celda${oculto}</td></tr></table><span>Texto${oculto}</span>`);
  expect(bloques).toEqual([
    { t: "parrafo", texto: "Visible", color: null },
    { t: "tabla", filas: [{ celdas: ["Celda"], encabezado: false }] },
    { t: "parrafo", texto: "Texto", color: null },
  ]);
});
