import { beforeEach, describe, expect, it, vi } from "vitest";

import { identidadCpq } from "./cpq-fixtures";

const mocks = vi.hoisted(() => ({ identidad: vi.fn(), ejecutar: vi.fn() }));
vi.mock("@/lib/servidor", () => ({
  identidadActual: mocks.identidad,
  ejecutarComoUsuario: mocks.ejecutar,
}));
import { cargarCotizaciones } from "@/app/(erp)/cotizaciones/_componentes/datos";

const negocioId = "0192f3a0-0000-7000-8000-000000000011";
const cursor = "0192f3a0-0000-7000-8000-000000000012";
const fila = {
  id: cursor,
  codigo: "CPQ-2026-001",
  titulo: "Cotización ficticia",
  negocioId,
  negocioTitulo: "Negocio ficticio",
  cuentaTitulo: "Cuenta ficticia",
  vigente: true,
  alternativaDeId: null,
  creadoPorId: "dato no necesario",
  version: {
    numero: 1,
    estado: "borrador",
    validaHasta: "2027-01-01",
    ventaMensualClp: null,
    margen: { objetivoPct: 1700 },
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.identidad.mockResolvedValue(identidadCpq());
  mocks.ejecutar.mockResolvedValue({ ok: true, data: { items: [fila], siguiente: cursor } });
});

describe("CPQ: datos de pantalla autorizados en servidor", () => {
  it("supervisor o módulo apagado: no consulta ni entrega filas", async () => {
    for (const i of [identidadCpq("supervisor"), { ...identidadCpq(), modulosActivos: [] }]) {
      mocks.identidad.mockResolvedValue(i);
      expect(await cargarCotizaciones()).toMatchObject({
        state: "forbidden",
        items: [],
        crear: false,
        costos: false,
      });
    }
    expect(mocks.ejecutar).not.toHaveBeenCalled();
  });
  it("viewer lee sin creación y sin serializar margen ni datos que la lista no usa", async () => {
    mocks.identidad.mockResolvedValue(identidadCpq("viewer"));
    const r = await cargarCotizaciones(cursor, negocioId);
    expect(r).toMatchObject({
      state: "ready",
      crear: false,
      siguiente: cursor,
      items: [{ negocioTitulo: fila.negocioTitulo }],
    });
    expect(mocks.ejecutar).toHaveBeenCalledWith("erp", "cpq.cotizaciones.list", {
      limite: 20,
      cursor,
      negocioId,
    });
    expect(JSON.stringify(r)).not.toMatch(/margen|objetivoPct|creadoPorId/);
  });
  it("rechazo y fallo se muestran como tales, nunca como vacío listo", async () => {
    for (const [code, state] of [
      ["FORBIDDEN", "forbidden"],
      ["INTERNAL", "error"],
    ]) {
      mocks.ejecutar.mockResolvedValue({ ok: false, error: { code } });
      expect(await cargarCotizaciones()).toMatchObject({ state, items: [] });
    }
  });
});
