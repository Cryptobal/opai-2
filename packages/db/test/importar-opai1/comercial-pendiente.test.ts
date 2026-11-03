import { describe, expect, it } from "vitest";

import {
  COMERCIAL_EN_MAIN,
  historialNegocio,
  instalacionesDeNegocio,
  mapearEtapa,
  mapearMotivoPerdida,
  mapearRolNegocioContacto,
  pendientesComerciales,
} from "../../scripts/importar-opai1/comercial-pendiente";
import { fixture } from "./memoria";

const etapa = (extra: Partial<Parameters<typeof mapearEtapa>[0]> = {}) => ({
  id: "s",
  name: " Etapa ",
  order: 1,
  isClosedWon: false,
  isClosedLost: false,
  isAccepted: false,
  ...extra,
});

describe("mapeo comercial (pendiente de CRM PR 1)", () => {
  it("COMERCIAL_EN_MAIN activo: el plan cuenta etapas y negocios (apply CRM pendiente)", () => {
    expect(COMERCIAL_EN_MAIN).toBe(true);
    expect(pendientesComerciales(fixture())).toEqual([]);
  });

  it("etapas 1:1 con tipo y exigencia de inicio de servicio", () => {
    expect(mapearEtapa(etapa())).toEqual({ nombre: "Etapa", orden: 1, tipo: "abierta", exige: [] });
    expect(mapearEtapa(etapa({ isClosedWon: true }))).toMatchObject({ tipo: "ganada" });
    expect(mapearEtapa(etapa({ isClosedLost: true }))).toMatchObject({ tipo: "perdida" });
    expect(mapearEtapa(etapa({ isAccepted: true }))).toMatchObject({ exige: ["inicio_servicio"] });
    expect(mapearEtapa(etapa({ isClosedWon: true, isClosedLost: true }))).toEqual({
      error: "etapa_ambigua",
    });
  });

  it("motivo de pérdida: catálogo cerrado, nulo sin categoría, desconocido avisado", () => {
    expect(mapearMotivoPerdida("Precio")).toEqual({ motivo: "precio", desconocido: false });
    expect(mapearMotivoPerdida("sin respuesta")).toEqual({
      motivo: "sin_respuesta",
      desconocido: false,
    });
    expect(mapearMotivoPerdida(null)).toEqual({ motivo: null, desconocido: false });
    expect(mapearMotivoPerdida("raro")).toEqual({ motivo: null, desconocido: true });
  });

  it("rol del contacto en el negocio", () => {
    expect(mapearRolNegocioContacto("decision_maker")).toEqual({
      rol: "decisor",
      esPrincipal: false,
    });
    expect(mapearRolNegocioContacto("primary")).toEqual({ rol: null, esPrincipal: true });
    expect(mapearRolNegocioContacto("participant")).toEqual({ rol: "usuario", esPrincipal: false });
  });

  it("historial en orden con la duración en la etapa anterior", () => {
    const h = historialNegocio(fixture().dealStageHistory, "deal-1");
    expect(h.map((t) => t.idOpai1)).toEqual(["h-1", "h-2"]);
    expect(h[0]?.duracionAnteriorMs).toBeNull();
    expect(h[1]?.duracionAnteriorMs).toBe(24 * 3600 * 1000);
  });

  it("instalaciones del negocio: activadas primero; nunca desde el texto", () => {
    const datos = fixture();
    const negocio = datos.deals[0];
    if (!negocio) throw new Error("fixture sin negocio");
    const de = (n: typeof negocio) => instalacionesDeNegocio(n, datos.installations);
    expect(de(negocio)).toEqual({ ids: ["ins-i2"], via: "activada" });
    const unica = {
      ...negocio,
      id: "deal-2",
      accountId: "acc-a6",
      installationName: "oficina delta",
    };
    expect(de(unica)).toEqual({ ids: ["ins-i5"], via: "nombre" });
    const repetida = { ...negocio, id: "deal-3", installationName: "bodega central" };
    expect(de(repetida)).toEqual({ ids: [], via: "ambigua" });
    const inventada = { ...negocio, id: "deal-4", installationName: "No existe" };
    expect(de(inventada)).toEqual({ ids: [], via: "sin_coincidencia" });
  });
});
