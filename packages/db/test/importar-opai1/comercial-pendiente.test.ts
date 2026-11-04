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
import {
  ETAPA_ADJUDICADO_2,
  ETAPA_PERDIDO_2,
  cargarEquivalenciaEtapas,
  resolverEtapaNegocio,
} from "../../scripts/importar-opai1/etapas-equivalencia";
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

describe("mapeo comercial (importador v2)", () => {
  it("COMERCIAL_EN_MAIN activo: el CRM ya no queda pendiente por PR1", () => {
    expect(COMERCIAL_EN_MAIN).toBe(true);
    const p = pendientesComerciales(fixture());
    expect(p.some((x) => x.motivo === "pendiente_crm_pr1")).toBe(false);
  });

  it("equivalencia Gard: lost/won y tabla por stageId", () => {
    const eq = cargarEquivalenciaEtapas("gard");
    expect(Object.keys(eq)).toHaveLength(8);
    const etapas1 = new Map(fixture().pipelineStages.map((e) => [e.id, e]));
    expect(
      resolverEtapaNegocio({ stageId: "st-1", status: "open" }, eq, etapas1),
    ).toEqual({ error: "etapa_sin_mapeo" });
    expect(resolverEtapaNegocio({ stageId: "x", status: "lost" }, eq, etapas1)).toEqual({
      etapaId2: ETAPA_PERDIDO_2,
      revisar: false,
    });
    expect(resolverEtapaNegocio({ stageId: "x", status: "won" }, eq, etapas1)).toEqual({
      etapaId2: ETAPA_ADJUDICADO_2,
      revisar: false,
    });
  });

  it("etapas legacy 1:1 con tipo y exigencia de inicio de servicio", () => {
    expect(mapearEtapa(etapa())).toEqual({ nombre: "Etapa", orden: 1, tipo: "abierta", exige: [] });
    expect(mapearEtapa(etapa({ isClosedWon: true }))).toMatchObject({ tipo: "ganada" });
    expect(mapearEtapa(etapa({ isClosedLost: true }))).toMatchObject({ tipo: "perdida" });
    expect(mapearEtapa(etapa({ isAccepted: true }))).toMatchObject({ exige: ["inicio_servicio"] });
  });

  it("motivo de pérdida: catálogo cerrado, nulo sin categoría, desconocido avisado", () => {
    expect(mapearMotivoPerdida("Precio")).toEqual({ motivo: "precio", desconocido: false });
    expect(mapearMotivoPerdida(null)).toEqual({ motivo: null, desconocido: false });
    expect(mapearMotivoPerdida("raro")).toEqual({ motivo: null, desconocido: true });
  });

  it("rol del contacto en el negocio", () => {
    expect(mapearRolNegocioContacto("primary")).toEqual({ rol: null, esPrincipal: true });
  });

  it("historial en orden con la duración en la etapa anterior", () => {
    const h = historialNegocio(fixture().dealStageHistory, "deal-1");
    expect(h.map((t) => t.idOpai1)).toEqual(["h-1", "h-2"]);
    expect(h[1]?.duracionAnteriorMs).toBe(24 * 3600 * 1000);
  });

  it("instalaciones del negocio: activadas primero; nunca desde el texto", () => {
    const datos = fixture();
    const negocio = datos.deals[0];
    if (!negocio) throw new Error("fixture sin negocio");
    expect(instalacionesDeNegocio(negocio, datos.installations)).toEqual({
      ids: ["ins-i2"],
      via: "activada",
    });
  });
});
