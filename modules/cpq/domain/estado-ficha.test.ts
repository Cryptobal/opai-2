import { describe, expect, it } from "vitest";

import { ESTADOS_COTIZACION, type EstadoCotizacion } from "./index";
import {
  bloqueosParaLista,
  esCongelada,
  estadoFicha,
  sePuedeCrearVersionNueva,
  sePuedeReabrir,
  type EntradaEstadoFicha,
} from "./estado-ficha";

const sano = { hayLineas: true, costosPendientes: false, desactualizada: false, margenBajo: false };
const e = (estado: EstadoCotizacion, resto: Partial<EntradaEstadoFicha> = {}): EntradaEstadoFicha => ({
  estado,
  ...sano,
  ...resto,
});

describe("estadoFicha: borrador", () => {
  const casos: [string, Partial<EntradaEstadoFicha>, string, string][] = [
    ["sin líneas", { hayLineas: false }, "incompleta", "completar"],
    ["costos pendientes", { costosPendientes: true }, "incompleta", "completar"],
    ["desactualizada", { desactualizada: true }, "desactualizada", "recalcular"],
    ["margen bajo", { margenBajo: true }, "margen_bajo", "pedir_aprobacion"],
    ["todo en orden", {}, "por_dejar_lista", "dejar_lista"],
    ["incompleta gana a desactualizada y margen", { costosPendientes: true, desactualizada: true, margenBajo: true }, "incompleta", "completar"],
    ["desactualizada gana a margen bajo", { desactualizada: true, margenBajo: true }, "desactualizada", "recalcular"],
  ];
  it.each(casos)("%s", (_n, entrada, estado, accion) => {
    const s = estadoFicha(e("borrador", entrada));
    expect(s.estado).toBe(estado);
    expect(s.siguiente.accion).toBe(accion);
  });
});

describe("estadoFicha: desde en_aprobacion no hay estados contradictorios", () => {
  it("en aprobación solo espera, aunque el margen siga bajo", () => {
    const s = estadoFicha(e("en_aprobacion", { margenBajo: true, desactualizada: true }));
    expect(s).toMatchObject({ estado: "en_aprobacion", siguiente: { accion: "esperar" }, bloqueos: [] });
  });
  it("una versión lista (aprobada) no vuelve a mostrar margen bajo ni pide recalcular", () => {
    const s = estadoFicha(e("lista", { margenBajo: true, desactualizada: true, costosPendientes: true }));
    expect(s).toMatchObject({ estado: "lista_para_enviar", siguiente: { accion: "enviar" }, bloqueos: [] });
  });
  it("enviada y cerradas quedan sin siguiente paso", () => {
    for (const est of ["enviada", "aceptada", "rechazada", "vencida", "reemplazada", "archivada"] as const) {
      const s = estadoFicha(e(est, { margenBajo: true }));
      expect(s.estado).toBe(est);
      expect(s.siguiente.accion).toBe("ninguna");
    }
  });
});

describe("estadoFicha: invariantes", () => {
  it("cada combinación devuelve un estado y como mucho un siguiente paso coherente", () => {
    for (const estado of ESTADOS_COTIZACION)
      for (const hayLineas of [true, false])
        for (const costosPendientes of [true, false])
          for (const desactualizada of [true, false])
            for (const margenBajo of [true, false]) {
              const s = estadoFicha({ estado, hayLineas, costosPendientes, desactualizada, margenBajo });
              expect(s.etiqueta.length).toBeGreaterThan(0);
              // «Requiere aprobación» nunca junto a «Lista».
              if (s.estado === "lista_para_enviar") expect(s.siguiente.accion).toBe("enviar");
              if (s.siguiente.accion === "pedir_aprobacion") expect(s.estado).toBe("margen_bajo");
              if (s.bloqueos.length) expect(s.bloqueos[0]?.codigo).toBeDefined();
            }
  });
});

describe("bloqueosParaLista", () => {
  it("sin bloqueos si todo está en orden", () => {
    expect(bloqueosParaLista(sano)).toEqual([]);
  });
  it("lista todos los bloqueos en el orden en que se resuelven, con mensaje simple", () => {
    const b = bloqueosParaLista({ hayLineas: false, costosPendientes: true, desactualizada: true, margenBajo: true });
    expect(b.map((x) => x.codigo)).toEqual(["sin_lineas", "costos_pendientes", "desactualizada", "margen_bajo"]);
    expect(b.every((x) => x.mensaje.length > 10)).toBe(true);
  });
});

describe("reglas de edición y versiones", () => {
  it("solo lista se reabre", () => {
    expect(ESTADOS_COTIZACION.filter(sePuedeReabrir)).toEqual(["lista"]);
  });
  it("versión nueva solo cuando la última ya salió y no hay otra editable", () => {
    expect(ESTADOS_COTIZACION.filter(sePuedeCrearVersionNueva)).toEqual([
      "enviada",
      "aceptada",
      "rechazada",
      "vencida",
      "reemplazada",
    ]);
  });
  it("solo el borrador se recalcula; desde en aprobación se muestra lo congelado", () => {
    expect(esCongelada("borrador")).toBe(false);
    expect(esCongelada("en_aprobacion")).toBe(true);
    expect(esCongelada("lista")).toBe(true);
    expect(esCongelada("enviada")).toBe(true);
  });
});
