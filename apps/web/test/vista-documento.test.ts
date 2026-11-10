import { describe, expect, it } from "vitest";

import { modoVista } from "../app/_components/documentos/vista-modo";

describe("modo de la vista de un documento", () => {
  it("un PDF se muestra, aunque el tipo venga solo en el nombre", () => {
    expect(modoVista({ mime: "application/pdf", nombre: "anexo.pdf" })).toBe("pdf");
    expect(modoVista({ mime: "application/octet-stream", nombre: "anexo.pdf" })).toBe("pdf");
  });

  it("una imagen se muestra y un SVG no", () => {
    expect(modoVista({ mime: "image/png", nombre: "logo.png" })).toBe("imagen");
    expect(modoVista({ mime: "image/svg+xml", nombre: "logo.svg" })).toBe("otro");
  });

  it("Word no se pinta en el navegador", () => {
    expect(
      modoVista({
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        nombre: "contrato.docx",
      }),
    ).toBe("otro");
  });
});
