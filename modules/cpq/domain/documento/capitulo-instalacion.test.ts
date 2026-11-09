import { describe, expect, it } from "vitest";

import {
  armarCapitulo,
  esClaveSeccion,
  formatearPersonas,
  mapaSeguro,
  normalizarTextoCapitulo,
  SECCIONES_TEXTO,
  type EntradaCapitulo,
} from "./capitulo-instalacion";
import { armarIndice, numeroCapitulo } from "./indice-propuesta";

const base: EntradaCapitulo = {
  instalacionId: "i1",
  nombre: "Planta Ficticia Norte",
  direccion: "Av. Ejemplo 1234, Quilicura",
  mapaUrl: "https://maps.example.test/?q=planta",
  puestos: [
    { nombre: "Guardia de acceso", guardiasSimultaneos: 1, dotacion: 4.67, turno: "4x4 · 08:00–20:00" },
    { nombre: "Guardia nocturno", guardiasSimultaneos: 2, dotacion: 4, turno: "4x4 · 20:00–08:00" },
  ],
  textos: { comprension_servicio: "Servicio de control de acceso.", supervision: "  " },
};

describe("armarCapitulo", () => {
  it("incluye solo las secciones con texto y marca el resto como faltante verificable", () => {
    const c = armarCapitulo(base);
    expect(c.secciones.map((s) => s.clave)).toEqual(["comprension_servicio"]);
    expect(c.faltantes.map((f) => f.clave)).toEqual(
      SECCIONES_TEXTO.map((s) => s.clave).filter((k) => k !== "comprension_servicio"),
    );
  });

  it("suma guardias simultáneos y dotación solo si todos los puestos la traen", () => {
    expect(armarCapitulo(base).totales).toEqual({ guardiasSimultaneos: 3, dotacion: 8.67 });
    const sin = armarCapitulo({ ...base, puestos: [{ ...base.puestos[0]!, dotacion: null }] });
    expect(sin.totales.dotacion).toBeNull();
    expect(sin.faltantes.some((f) => f.clave === "dotacion")).toBe(true);
  });

  it("sin dirección o sin puestos lo informa y no inventa nada", () => {
    const c = armarCapitulo({ ...base, direccion: " ", mapaUrl: null, puestos: [] });
    expect(c.direccion).toBeNull();
    expect(c.mapaUrl).toBeNull();
    expect(c.faltantes[0]).toEqual({ clave: "direccion", titulo: "Dirección de la instalación" });
    expect(c.faltantes.some((f) => f.clave === "puestos")).toBe(true);
    expect(c.totales).toEqual({ guardiasSimultaneos: 0, dotacion: null });
  });

  it("supervisión es solo texto: sin texto no hay sección ni ítem", () => {
    expect(armarCapitulo(base).secciones.find((s) => s.clave === "supervision")).toBeUndefined();
  });
});

describe("helpers", () => {
  it("el mapa solo admite http(s)", () => {
    expect(mapaSeguro("javascript:alert(1)")).toBeNull();
    expect(mapaSeguro("no es url")).toBeNull();
    expect(mapaSeguro(" https://maps.example.test/a ")).toBe("https://maps.example.test/a");
  });
  it("normaliza saltos de línea y rechaza textos demasiado largos", () => {
    expect(normalizarTextoCapitulo(" a\r\nb ")).toBe("a\nb");
    expect(() => normalizarTextoCapitulo("x".repeat(8001))).toThrow("TEXTO_CAPITULO_LARGO");
  });
  it("conoce solo las claves de sección del capítulo", () => {
    expect(esClaveSeccion("rondas")).toBe(true);
    expect(esClaveSeccion("precio")).toBe(false);
  });
  it("formatea personas con coma y sin ceros sobrantes", () => {
    expect(formatearPersonas(4.67)).toBe("4,7");
    expect(formatearPersonas(5)).toBe("5");
  });
});

describe("armarIndice", () => {
  it("numera bloques y capítulos con la misma regla", () => {
    const e = armarIndice([{ titulo: "Comprensión" }, { titulo: "Detalle", subtitulos: ["Norte", "Sur"] }, { titulo: "Resumen" }]);
    expect(e.map((x) => `${x.numero} ${x.titulo}`)).toEqual(["1 Comprensión", "2 Detalle", "2.1 Norte", "2.2 Sur", "3 Resumen"]);
    expect(numeroCapitulo(1, 1)).toBe("2.2");
  });
});
