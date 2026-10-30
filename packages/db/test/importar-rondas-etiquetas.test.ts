import { describe, expect, it } from "vitest";

import {
  leerArgumentos,
  MENSAJE_SIN_DRY_RUN,
} from "../scripts/importar-rondas-etiquetas/argumentos";
import { formatearReporte, planearDesdeExport } from "../scripts/importar-rondas-etiquetas/nucleo";

const EXPORT = {
  checkpoints: [
    { id: "1", name: "Portón norte", qrCode: "CHK-0001", verificationMode: "qr_gps" },
    { id: "2", name: "Patio GPS", qrCode: null, verificationMode: "gps" },
    { id: "3", name: "Duplicado", qrCode: "CHK-0001", verificationMode: "qr" },
  ],
};

describe("CLI de migración de etiquetas de 1.0 (Rondas PR 2)", () => {
  it("sin --dry-run se niega", () => {
    const r = leerArgumentos(["--origen", "fixtures:x.json"]);
    expect(r).toMatchObject({ ok: false, error: MENSAJE_SIN_DRY_RUN });
  });

  it("--aplicar también se niega (no se escribe en esta entrega)", () => {
    expect(leerArgumentos(["--dry-run", "--aplicar", "--origen", "fixtures:x.json"]).ok).toBe(false);
  });

  it("acepta --dry-run con un origen de fixtures", () => {
    const r = leerArgumentos(["--dry-run", "--origen", "fixtures:ruta.json"]);
    expect(r).toEqual({ ok: true, args: { dryRun: true, fixtures: "ruta.json", salida: null } });
  });

  it("planea desde el export, omite duplicados y marca el formato como sin verificar", () => {
    const plan = planearDesdeExport(EXPORT);
    expect(plan.total).toBe(3);
    expect(plan.aImportar).toBe(2);
    expect(plan.omitidos).toBe(1);
    expect(plan.formatoQrVerificado).toBe(false);
  });

  it("el reporte avisa que no escribió nada y que el formato está sin verificar", () => {
    const texto = formatearReporte(planearDesdeExport(EXPORT));
    expect(texto).toContain("SIMULACIÓN");
    expect(texto).toContain("SIN VERIFICAR");
    expect(texto).toContain("No se escribió nada");
  });
});
