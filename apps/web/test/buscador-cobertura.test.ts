import { describe, expect, it } from "vitest";

import { listarModulos } from "@opai/capabilities";

import { asegurarRegistro } from "../lib/registro";

// CAR-447 (Sesión Núcleo, pedido de Carlos del 14-nov-2026): el buscador ⌘K / `core.buscar` cubre
// todo. Cada módulo registrado aporta al menos un buscador en su manifest o queda aquí con su motivo
// y el ticket que lo resuelve; al agregar el buscador, el módulo sale de esta lista. Un módulo nuevo
// sin buscador ni motivo hace fallar `pnpm test`.
export const SIN_BUSCADOR: Readonly<Record<string, string>> = {
  agente: "No tiene entidades propias que buscar: sus conversaciones tienen su propio historial.",
  acceso:
    "Control de acceso de visitas: pendiente de definir qué se busca (visitas, credenciales).",
  asistencia:
    "Marcas y turnos se ven por persona e instalación, que ya se buscan; pendiente su buscador.",
  desempeno: "Indicadores y scorecards: pendiente su buscador (cargos y personas ya se buscan).",
  finanzas: "CAR-402: facturas, notas y documentos de compra.",
  pauta: "La pauta se abre por instalación, que ya se busca; pendiente su buscador.",
  portal_cliente: "Portal del cliente: no agrega entidades al ERP.",
  portal_trabajador: "Portal del trabajador: no agrega entidades al ERP.",
  rondas: "CAR-405: rondas y puntos de control.",
  tickets: "CAR-404: tickets y puestos.",
};

asegurarRegistro();

describe("buscador general completo (CAR-447)", () => {
  it("todo módulo aporta al buscador o tiene un motivo explícito", () => {
    const sinBuscador = listarModulos()
      .filter((m) => (m.buscadores ?? []).length === 0)
      .map((m) => m.id)
      .sort();
    expect(sinBuscador).toEqual(Object.keys(SIN_BUSCADOR).sort());
  });
});
