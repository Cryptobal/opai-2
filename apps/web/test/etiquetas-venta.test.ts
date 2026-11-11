import { describe, expect, it } from "vitest";

import {
  estadoCesionVenta,
  estadoCobroVenta,
  estadoDteVenta,
  porTransmitir,
  tituloVenta,
} from "../app/(erp)/finanzas/ventas/_componentes/etiquetas-venta";

const INTERNOS = /^[a-z]+(_[a-z]+)+$|^(borrador|aceptado|enviado|rechazado|pendiente|pagada|cedida|cedido)$/;

describe("etiquetas de venta (B4)", () => {
  it("ningún estado interno se muestra tal cual", () => {
    const todos = [
      ...["borrador", "enviado", "aceptado", "aceptado_sii", "rechazado", "anulado_nc", "anulado_nd"].map((e) => estadoDteVenta(e)),
      ...["pendiente", "pagada_parcial", "pagada", "cedida", "anulada"].map(estadoCobroVenta),
      ...["simulado", "emitido", "solicitado", "cedido", "rechazado"].map(estadoCesionVenta),
      estadoDteVenta("estado_nuevo"),
    ];
    for (const e of todos) expect(e.etiqueta).not.toMatch(INTERNOS);
    expect(estadoDteVenta("aceptado_sii").etiqueta).toBe("Aceptada por el SII");
    expect(estadoDteVenta("estado_nuevo").etiqueta).toBe("Sin clasificar");
  });
  it("una firmada sin track ID no se presenta como enviada al SII (CAR-270)", () => {
    expect(estadoDteVenta("enviado", null).etiqueta).toBe("Firmada, sin enviar al SII");
    expect(estadoDteVenta("enviado", "264005956").etiqueta).toBe("Enviada al SII");
    expect(porTransmitir({ estadoDte: "anulado_nc", trackIdSii: null })).toBe(true);
    expect(porTransmitir({ estadoDte: "anulado_nc", trackIdSii: "1" })).toBe(false);
    expect(porTransmitir({ estadoDte: "aceptado", trackIdSii: null })).toBe(false);
  });
  it("el título muestra folio o borrador", () => {
    expect(tituloVenta({ folio: 1204, tipoDteNombre: "Factura 33" })).toBe("Factura 33 · folio 1204");
    expect(tituloVenta({ folio: null, tipoDteNombre: "Factura 33" })).toBe("Borrador · Factura 33");
  });
});
