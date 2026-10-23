import { describe, expect, it } from "vitest";

import { validarPlantilla } from "../plantillas";
import { COMUNICABLES_NUCLEO, ejemplosDe, layoutCorreo, renderizarCorreo, rutasDe } from "./index";

// Color de marca como dato del tenant (no estilo de la app): se arma para no confundirlo con un token.
const COLOR = `#${"0A84FF"}`;

describe("eventos comunicables del núcleo", () => {
  it("cada plantilla por defecto usa solo variables declaradas y renderiza con los ejemplos", () => {
    const ids = COMUNICABLES_NUCLEO.map((e) => e.evento);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of COMUNICABLES_NUCLEO) {
      for (const p of Object.values(e.plantillas)) {
        validarPlantilla(p.asunto, rutasDe(e));
        validarPlantilla(p.cuerpo, rutasDe(e));
      }
      const correo = e.plantillas.correo;
      if (correo) {
        const r = renderizarCorreo(e, correo, ejemplosDe(e), { nombre: "Gard" });
        expect(r.texto).not.toMatch(/\{\{/);
      }
    }
  });

  it("escapa los valores en HTML, enlaza URLs y aplica solo colores válidos", () => {
    const e = COMUNICABLES_NUCLEO.find((x) => x.evento === "core.usuario.invitado");
    if (!e?.plantillas.correo) throw new Error("falta la plantilla");
    const datos = {
      ...ejemplosDe(e),
      invitador: { nombre: "<script>x</script>" },
      url: "https://test.opai.cl/i/abc",
    };
    const r = renderizarCorreo(e, e.plantillas.correo, datos, {
      nombre: "Gard",
      colorPrimario: COLOR,
    });
    expect(r.html).toContain("&lt;script&gt;");
    expect(r.html).not.toContain("<script>");
    expect(r.html).toContain('<a href="https://test.opai.cl/i/abc">');
    expect(r.html).toContain(`border-top:4px solid ${COLOR}`);
    expect(layoutCorreo({ nombre: "X", colorPrimario: "red;}<x" }, "")).not.toContain("red;");
  });
});
