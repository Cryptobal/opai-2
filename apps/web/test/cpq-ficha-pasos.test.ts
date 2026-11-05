import { describe, expect, it } from "vitest";

import { pasosDeFicha, type EntradaPasos } from "@/lib/cpq-ficha-pasos";

const base: EntradaPasos = {
  estado: "por_dejar_lista",
  tieneCuenta: true,
  puestos: 2,
  avisosBloqueantes: 0,
  bloqueos: [],
  mutualPendiente: false,
};
const pend = (e: Partial<EntradaPasos>) =>
  Object.fromEntries(pasosDeFicha({ ...base, ...e }).pasos.map((p) => [p.bloque, p.pendientes]));

describe("pasosDeFicha", () => {
  it("cotización nueva: sin puestos abre «Puestos» y bloquea el último paso", () => {
    const r = pasosDeFicha({ ...base, estado: "incompleta", puestos: 0 });
    expect(r.primeroAbierto).toBe("puestos");
    expect(r.pasos.find((p) => p.bloque === "puestos")?.pendientes).toBe(1);
    expect(r.pasos.find((p) => p.bloque === "documento")).toMatchObject({ pendientes: 0, bloqueado: true });
  });

  it("sueldo faltante cuenta en Puestos; margen bajo y valores desactualizados en Costos", () => {
    expect(pend({ estado: "incompleta", avisosBloqueantes: 2 })).toMatchObject({ puestos: 2, costos: 0 });
    expect(pend({ estado: "margen_bajo", bloqueos: ["margen_bajo"] })).toMatchObject({ costos: 1 });
    expect(pend({ estado: "desactualizada", bloqueos: ["desactualizada"] })).toMatchObject({ costos: 1 });
  });

  it("sin puestos el margen no se juzga: Costos no cuenta pendientes", () => {
    expect(pend({ estado: "incompleta", puestos: 0, bloqueos: ["sin_lineas", "costos_pendientes", "margen_bajo"] })).toMatchObject({ puestos: 1, costos: 0 });
  });

  it("un valor legal que falta (sin aviso de puesto) es pendiente de Costos", () => {
    const r = pasosDeFicha({ ...base, estado: "incompleta", bloqueos: ["costos_pendientes"] });
    expect(r.pasos.find((p) => p.bloque === "costos")?.pendientes).toBe(1);
    expect(r.primeroAbierto).toBe("costos");
  });

  it("abre el primer bloque con pendientes, en orden", () => {
    const r = pasosDeFicha({ ...base, tieneCuenta: false, puestos: 0, bloqueos: ["margen_bajo"] });
    expect(r.primeroAbierto).toBe("cliente");
  });

  it("todo listo salvo dejarla lista: abre Documento y envío con 1 pendiente", () => {
    const r = pasosDeFicha(base);
    expect(r.primeroAbierto).toBe("documento");
    expect(r.pasos.at(-1)).toMatchObject({ pendientes: 1, bloqueado: false });
  });

  it("lista o enviada: sin pendientes; la mutual sin confirmar sí cuenta para enviar", () => {
    expect(pend({ estado: "lista_para_enviar" })).toMatchObject({ documento: 0 });
    expect(pend({ estado: "enviada" })).toMatchObject({ documento: 0 });
    expect(pend({ estado: "lista_para_enviar", mutualPendiente: true })).toMatchObject({ documento: 1 });
  });
});
