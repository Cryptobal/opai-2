import { describe, expect, it } from "vitest";

import {
  aplicarAccionCierre, emitibleEnLote, etapaCierre, motivoNoEmitible, resumirEtapas, SEGUIMIENTO_CIERRE_INICIAL,
} from "./cierre";

const seg = (p: Partial<typeof SEGUIMIENTO_CIERRE_INICIAL>) => ({ ...SEGUIMIENTO_CIERRE_INICIAL, ...p });

describe("etapaCierre", () => {
  it("sin seguimiento, un borrador está por enviar", () => {
    expect(etapaCierre("borrador", null)).toBe("por_enviar");
  });
  it("un documento ya emitido es «emitido» aunque el seguimiento diga otra cosa", () => {
    expect(etapaCierre("aceptado", seg({ estado: "observada" }))).toBe("emitido");
    expect(etapaCierre("enviado", null)).toBe("emitido");
  });
  it("falta OC/HES solo si la empresa la exige y no hay ninguna", () => {
    expect(etapaCierre("borrador", seg({ requiereOcHes: true }))).toBe("falta_oc_hes");
    expect(etapaCierre("borrador", seg({ requiereOcHes: true, hes: "9901" }))).toBe("por_enviar");
    expect(etapaCierre("borrador", seg({ requiereOcHes: false }))).toBe("por_enviar");
  });
  it("recorre enviada → OK, y una observación manda sobre el resto", () => {
    expect(etapaCierre("borrador", seg({ estado: "enviada" }))).toBe("esperando_ok");
    expect(etapaCierre("borrador", seg({ estado: "ok" }))).toBe("listo");
    expect(etapaCierre("borrador", seg({ estado: "observada", requiereOcHes: true }))).toBe("observado");
  });
  it("con OK pero sin la OC/HES exigida no está listo", () => {
    expect(etapaCierre("borrador", seg({ estado: "ok", requiereOcHes: true }))).toBe("falta_oc_hes");
  });
});

describe("aplicarAccionCierre", () => {
  it("registra OC y HES sin pisar lo que no se envía, y limpia los vacíos", () => {
    const a = aplicarAccionCierre(seg({ ordenCompra: "45" }), { accion: "registrar_oc_hes", hes: " 99 " });
    expect(a).toMatchObject({ ok: true, seguimiento: { ordenCompra: "45", hes: "99" } });
    const b = aplicarAccionCierre(seg({ ordenCompra: "45" }), { accion: "registrar_oc_hes", ordenCompra: "  " });
    expect(b).toMatchObject({ ok: true, seguimiento: { ordenCompra: null } });
  });
  it("enviar tras una observación la limpia; reenviar con OK no procede", () => {
    const a = aplicarAccionCierre(seg({ estado: "observada", observacion: "monto" }), { accion: "marcar_enviada" });
    expect(a).toMatchObject({ ok: true, seguimiento: { estado: "enviada", observacion: null } });
    expect(aplicarAccionCierre(seg({ estado: "ok" }), { accion: "marcar_enviada" }).ok).toBe(false);
  });
  it("observar exige texto", () => {
    expect(aplicarAccionCierre(null, { accion: "observar", observacion: "  " }).ok).toBe(false);
    expect(aplicarAccionCierre(null, { accion: "observar", observacion: "Monto" })).toMatchObject({
      ok: true, seguimiento: { estado: "observada", observacion: "Monto" },
    });
  });
  it("reabrir vuelve a pendiente", () => {
    expect(aplicarAccionCierre(seg({ estado: "ok" }), { accion: "reabrir" })).toMatchObject({ ok: true, seguimiento: { estado: "pendiente" } });
  });
});

describe("emitibleEnLote y resumen", () => {
  it("solo emite lo que está listo", () => {
    expect(emitibleEnLote("borrador", seg({ estado: "ok" }))).toBe(true);
    expect(emitibleEnLote("borrador", seg({ estado: "enviada" }))).toBe(false);
    expect(emitibleEnLote("aceptado", seg({ estado: "ok" }))).toBe(false);
  });
  it("con el OK exigido, enviada no alcanza: se espera el OK del cliente", () => {
    expect(motivoNoEmitible("borrador", seg({ estado: "enviada", requiereOk: true }))).toBe("Esperando el OK del cliente.");
    expect(motivoNoEmitible("borrador", null)).toBe("Esperando el OK del cliente.");
  });
  it("con el OK dispensado (programación con «esperar OK» apagado) se emite sin él, y el OK solo se informa", () => {
    for (const estado of ["pendiente", "enviada", "ok"] as const) {
      expect(emitibleEnLote("borrador", seg({ estado, requiereOk: false }))).toBe(true);
    }
  });
  it("faltar la OC/HES o una observación del cliente bloquea aunque el OK esté dispensado", () => {
    expect(motivoNoEmitible("borrador", seg({ requiereOk: false, requiereOcHes: true }))).toMatch(/orden de compra/);
    expect(motivoNoEmitible("borrador", seg({ requiereOk: false, estado: "observada", observacion: "monto" }))).toMatch(/observó/);
    expect(motivoNoEmitible("aceptado", seg({ requiereOk: false }))).toMatch(/ya no es un borrador/);
  });
  it("resume cantidad y total por etapa en orden fijo", () => {
    const r = resumirEtapas([
      { etapa: "listo", montoTotal: 100 },
      { etapa: "listo", montoTotal: 50 },
      { etapa: "emitido", montoTotal: 7 },
    ]);
    expect(r.map((x) => x.etapa)).toEqual(["falta_oc_hes", "observado", "por_enviar", "esperando_ok", "listo", "emitido"]);
    expect(r.find((x) => x.etapa === "listo")).toEqual({ etapa: "listo", cantidad: 2, total: 150 });
  });
});
