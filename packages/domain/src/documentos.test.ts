import { describe, expect, it } from "vitest";

import { claveDocumento, esSha256, mimePermitido, nombreSeguro } from "./documentos";

describe("documentos", () => {
  it("restringe MIME por tipo o por el núcleo", () => {
    expect(mimePermitido("application/pdf")).toBe(true);
    expect(mimePermitido("application/x-msdownload")).toBe(false);
    expect(mimePermitido("application/pdf", ["image/png"])).toBe(false);
    expect(mimePermitido("IMAGE/PNG", ["image/png"])).toBe(true);
  });

  it("sanea nombres sin perder la extensión", () => {
    expect(nombreSeguro("../../etc/passwd")).toBe("passwd");
    expect(nombreSeguro("C:\\docs\\Contrato ñ:final?.pdf")).toBe("Contrato ñ_final_.pdf");
    expect(nombreSeguro("...oculto")).toBe("oculto");
    expect(nombreSeguro("\u0000")).toBe("archivo");
    const largo = nombreSeguro(`${"a".repeat(300)}.pdf`);
    expect(largo).toHaveLength(120);
    expect(largo.endsWith(".pdf")).toBe(true);
  });

  it("arma la clave con tenant, documento y versión", () => {
    expect(claveDocumento("t1", "d1", 2, "Contrato final.pdf")).toBe(
      "t/t1/d/d1/v2/Contrato%20final.pdf",
    );
    expect(esSha256("a".repeat(64))).toBe(true);
    expect(esSha256("A".repeat(64))).toBe(false);
  });
});
