import { describe, expect, it } from "vitest";

import { planearImportacion1_0, type Checkpoint1_0 } from "./importacion";

const checkpoints: Checkpoint1_0[] = [
  { id: "1", nombre: "Portón norte", codigoQr: "CHK-0001", modo: "qr_gps" },
  { id: "2", nombre: "Bodega A", codigoQr: "CHK-0002", modo: "qr" },
  { id: "3", nombre: "Patio GPS", codigoQr: null, modo: "gps" },
  { id: "4", nombre: "Sin etiqueta", codigoQr: "  ", modo: "qr_gps" },
  { id: "5", nombre: "Duplicado", codigoQr: "CHK-0001", modo: "qr_gps" },
];

describe("plan de importación de etiquetas de 1.0 (decisión p.20)", () => {
  it("importa los puntos con código físico y los reutiliza sin firmar", () => {
    const r = planearImportacion1_0(checkpoints);
    const porton = r.planes.find((p) => p.checkpointId === "1");
    expect(porton).toMatchObject({
      accion: "importar",
      codigo: "CHK-0001",
      firmada: false,
      origen: "importada_1_0",
    });
  });

  it("marca el formato del QR como no verificado por defecto (a verificar)", () => {
    expect(planearImportacion1_0(checkpoints).formatoQrVerificado).toBe(false);
    expect(planearImportacion1_0(checkpoints, { formatoQrVerificado: true }).formatoQrVerificado).toBe(true);
  });

  it("omite un código físico duplicado (una etiqueta no identifica dos puntos)", () => {
    const r = planearImportacion1_0(checkpoints);
    const dup = r.planes.find((p) => p.checkpointId === "5");
    expect(dup?.accion).toBe("omitir");
    expect(dup?.motivoOmision).toContain("duplicado");
  });

  it("un punto GPS sin QR se importa sin advertencia", () => {
    const r = planearImportacion1_0(checkpoints);
    const gps = r.planes.find((p) => p.checkpointId === "3");
    expect(gps?.accion).toBe("importar");
    expect(gps?.codigo).toBeNull();
    expect(gps?.advertencias).toHaveLength(0);
  });

  it("un punto con QR sin código legible se importa con advertencia", () => {
    const r = planearImportacion1_0(checkpoints);
    const sin = r.planes.find((p) => p.checkpointId === "4");
    expect(sin?.accion).toBe("importar");
    expect(sin?.codigo).toBeNull();
    expect(sin?.advertencias[0]).toContain("reimprimir");
  });

  it("resume totales, importados, omitidos y con advertencia", () => {
    const r = planearImportacion1_0(checkpoints);
    expect(r.total).toBe(5);
    expect(r.aImportar).toBe(4);
    expect(r.omitidos).toBe(1);
    expect(r.conAdvertencia).toBe(1);
  });
});
