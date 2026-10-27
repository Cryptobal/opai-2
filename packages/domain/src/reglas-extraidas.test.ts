import { describe, expect, it } from "vitest";

import { motivoSubidaInvalida } from "./documento-subida";
import { estadoAvisos, type HechoAviso, motivoAvisoInvalido } from "./incidentes";

describe("reglas extraídas de los handlers (NÚCLEO-H)", () => {
  const fecha = new Date("2026-10-01T00:00:00Z");
  const deteccion = new Date("2026-09-30T00:00:00Z");
  const hecho: HechoAviso = {
    evento: "registro", estado: "abierto", destinatario: null,
    ocurridoEn: deteccion, createdAt: fecha,
  };
  it("resuelve detección, registro alternativo, avisos y último estado sin mutar", () => {
    const hechos = [hecho, { ...hecho, evento: "aviso", estado: "notificado", destinatario: "agencia" }];
    const estado = estadoAvisos(hechos);
    expect(estado).toEqual({ avisados: new Set(["agencia"]), actual: "notificado", inicioPlazo: deteccion });
    expect(estadoAvisos([{ ...hecho, ocurridoEn: null }]).inicioPlazo).toEqual(fecha);
    expect(estadoAvisos([{ ...hecho, evento: "otro" }]).inicioPlazo).toEqual(deteccion);
    expect(estadoAvisos([])).toEqual({ avisados: new Set(), actual: "abierto", inicioPlazo: null });
    expect(hechos[0]).toBe(hecho);
  });
  it("conserva precedencia y texto del rechazo de avisos", () => {
    expect(motivoAvisoInvalido("cerrado", new Set(["agencia"]), "agencia"))
      .toBe('No se puede notificar un caso "cerrado".');
    expect(motivoAvisoInvalido("notificado", new Set(["agencia"]), "agencia"))
      .toBe('Ya consta el aviso a "agencia" en este caso.');
    for (const estado of ["abierto", "en_evaluacion", "notificado"] as const)
      expect(motivoAvisoInvalido(estado, new Set(), "titulares")).toBeNull();
  });
  it("conserva validación de subida, orden de errores y MIME opcional", () => {
    const d = { tamano: 10, mime: "application/pdf", sha256: "huella" };
    expect(motivoSubidaInvalida(d, null)).toContain("todavía no llega");
    expect(motivoSubidaInvalida(d, { tamano: 9, mime: "otro" })).toBe("El archivo pesa 9 bytes y se declararon 10.");
    expect(motivoSubidaInvalida(d, { ...d, mime: "otro", sha256: null })).toBe("El archivo llegó como otro y se declaró application/pdf.");
    for (const sha256 of [null, "", "otra"])
      expect(motivoSubidaInvalida(d, { ...d, sha256 })).toContain("SHA-256");
    expect(motivoSubidaInvalida(d, d)).toBeNull();
    expect(motivoSubidaInvalida(d, { tamano: d.tamano, sha256: d.sha256 })).toBeNull();
  });
});
