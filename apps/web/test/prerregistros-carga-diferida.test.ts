import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/app/_components/use-capacidad", () => ({
  useCapacidad: () => ({ ejecutar: vi.fn(), pendiente: false, error: null, limpiarError: vi.fn() }),
}));
vi.mock("@/app/(erp)/accesos/prerregistros/_componentes/campos-prerregistro", () => {
  throw new Error("No cargar formulario antes de abrir");
});
vi.mock("@/app/_components/maestros/dialogo-confirmar", () => {
  throw new Error("No cargar confirmación antes de abrir");
});
import { Prerregistrar } from "@/app/(erp)/accesos/prerregistros/_componentes/prerregistrar";
import { CancelarPrerregistro } from "@/app/(erp)/accesos/prerregistros/_componentes/cancelar-prerregistro";

describe("Prerregistros: acciones iniciales sin formularios ocultos", () => {
  it("mantiene botón Prerregistrar sin cargar campos", () => {
    const html = renderToStaticMarkup(
      createElement(Prerregistrar, {
        instalaciones: [{ id: "qa", nombre: "Instalación ficticia" }],
        hoy: "2026-11-18",
      }),
    );
    expect(html).toContain("Prerregistrar");
    expect(html).not.toContain("Cargando formulario");
  });
  it("mantiene botón Cancelar sin cargar confirmación", () => {
    const html = renderToStaticMarkup(createElement(CancelarPrerregistro, { id: "qa" }));
    expect(html).toContain("Cancelar prerregistro");
    expect(html).not.toContain("Cargando confirmación");
  });
});
