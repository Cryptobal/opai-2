import { describe, expect, it } from "vitest";

import {
  gruposTarjetasIntegraciones,
  representanteTarjetaIntegracion,
} from "../app/(erp)/configuracion/integraciones/_componentes/integraciones-tarjetas";
import type { Integracion } from "../app/(erp)/configuracion/integraciones/_componentes/tipos";

const base = (p: Partial<Integracion> & Pick<Integracion, "proveedor" | "categoria">): Integracion => ({
  nombre: p.proveedor,
  modalidad: "propia",
  modalidades: ["propia"],
  plataformaDisponible: false,
  config: {},
  secretos: [],
  ultimoTestEn: null,
  ultimoError: null,
  estado: "no_configurada",
  ...p,
});

describe("gruposTarjetasIntegraciones", () => {
  it("no agrupa dte_cesion con el placeholder factoring «próximamente»", () => {
    const lista = [
      base({ proveedor: "factoring", categoria: "factoring", estado: "proximamente" }),
      base({ proveedor: "dte_cesion", categoria: "factoring", estado: "no_configurada" }),
      base({ proveedor: "dte_emision", categoria: "dte", estado: "no_configurada" }),
    ];
    const grupos = gruposTarjetasIntegraciones(lista);
    expect(grupos.some((g) => g.length === 2)).toBe(false);
    const cesion = grupos.find((g) => g[0]?.proveedor === "dte_cesion");
    expect(cesion).toEqual([lista[1]]);
    const factoring = grupos.find((g) => g[0]?.proveedor === "factoring");
    expect(factoring).toEqual([lista[0]]);
  });

  it("ordena emisión DTE y cesión Octava juntas al inicio del bloque DTE", () => {
    const lista = [
      base({ proveedor: "resend", categoria: "correo" }),
      base({ proveedor: "dte_cesion", categoria: "factoring" }),
      base({ proveedor: "dte_emision", categoria: "dte" }),
    ];
    const ids = gruposTarjetasIntegraciones(lista).map((g) => g[0]?.proveedor);
    expect(ids.indexOf("dte_emision")).toBeLessThan(ids.indexOf("dte_cesion"));
    expect(ids.indexOf("dte_cesion")).toBeLessThan(ids.indexOf("resend"));
  });

  it("sigue agrupando las tres integraciones de IA en una tarjeta", () => {
    const lista = [
      base({ proveedor: "ia_openai", categoria: "ia" }),
      base({ proveedor: "ia_anthropic", categoria: "ia" }),
      base({ proveedor: "ia_google", categoria: "ia" }),
    ];
    const grupos = gruposTarjetasIntegraciones(lista);
    expect(grupos).toHaveLength(1);
    expect(grupos[0]).toHaveLength(3);
  });
});

describe("representanteTarjetaIntegracion", () => {
  it("elige dte_cesion disponible aunque factoring sea el primero del arreglo", () => {
    const items = [
      base({ proveedor: "factoring", categoria: "factoring", estado: "proximamente" }),
      base({ proveedor: "dte_cesion", categoria: "factoring", estado: "no_configurada" }),
    ];
    expect(representanteTarjetaIntegracion(items)?.proveedor).toBe("dte_cesion");
  });
});
