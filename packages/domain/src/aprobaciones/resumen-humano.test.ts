import { describe, expect, it } from "vitest";

import {
  accionGenerica,
  esResumenAntiguo,
  frasePedido,
  resumenGenerico,
  resumenParaMostrar,
  textoAprobacionesPendientes,
} from "./resumen-humano";

describe("texto humano de aprobaciones (CAR-250)", () => {
  it("singular y plural", () => {
    expect(textoAprobacionesPendientes(1)).toBe("1 aprobación pendiente");
    expect(textoAprobacionesPendientes(2)).toBe("2 aprobaciones pendientes");
  });
  it("arma la frase con quien pide", () => {
    expect(frasePedido("Grok", "emitir la factura 33, $11.900")).toBe(
      "Grok pide emitir la factura 33, $11.900",
    );
    expect(frasePedido(" ", "algo")).toBe("Un agente pide algo");
  });
  it("saca la acción de la descripción", () => {
    expect(accionGenerica("Emite un borrador: asigna folio y firma el XML. Requiere CAF.")).toBe(
      "Emite un borrador",
    );
    expect(accionGenerica("Envía al SII un documento ya firmado. Usa el adaptador.")).toBe(
      "Envía al SII un documento ya firmado",
    );
    expect(accionGenerica("x".repeat(300)).length).toBe(100);
  });
  it("reconoce y reemplaza el formato anterior", () => {
    const viejo = 'finanzas.ventas.emitir {"documentoId":"abc"}';
    expect(esResumenAntiguo(viejo, "finanzas.ventas.emitir")).toBe(true);
    expect(esResumenAntiguo("Grok pide emitir", "finanzas.ventas.emitir")).toBe(false);
    expect(
      resumenParaMostrar({
        resumen: viejo,
        capabilityId: "finanzas.ventas.emitir",
        agente: "Grok",
        descripcion: "Emite un borrador: asigna folio.",
      }),
    ).toBe("Grok pide aprobación: Emite un borrador");
  });
  it("conserva el texto ya humano y tolera capacidad desconocida", () => {
    expect(
      resumenParaMostrar({
        resumen: "Grok pide emitir la factura 33",
        capabilityId: "finanzas.ventas.emitir",
        agente: "Grok",
        descripcion: null,
      }),
    ).toBe("Grok pide emitir la factura 33");
    expect(resumenGenerico("Grok", "x.y.z", null)).toBe("Grok pide aprobación para x.y.z");
  });
});
