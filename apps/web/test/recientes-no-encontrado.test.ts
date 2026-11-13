import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { leerRecientes, registrarReciente } from "@/app/_components/use-recientes";

// localStorage mínimo en memoria: el entorno de pruebas de web es Node.
function almacen() {
  const datos = new Map<string, string>();
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
  };
}

describe("recientes y páginas no encontradas", () => {
  beforeEach(() => vi.stubGlobal("localStorage", almacen()));
  afterEach(() => vi.unstubAllGlobals());

  it("no registra una página no encontrada como reciente", () => {
    registrarReciente("e1", { href: "/cotizaciones/x", etiqueta: "No encontrado" });
    registrarReciente("e1", { href: "/trabajador/x", etiqueta: "No encontrado · Portal Trabajador" });
    registrarReciente("e1", { href: "/bancos", etiqueta: "Bancos" });
    expect(leerRecientes("e1").map((r) => r.etiqueta)).toEqual(["Bancos"]);
  });

  it("oculta los «No encontrado» que ya quedaron guardados", () => {
    localStorage.setItem(
      "opai_recientes_e1",
      JSON.stringify([
        { href: "/x", etiqueta: "No encontrado" },
        { href: "/flujo", etiqueta: "Flujo de caja" },
      ]),
    );
    expect(leerRecientes("e1").map((r) => r.href)).toEqual(["/flujo"]);
  });
});
