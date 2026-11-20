import { createElement as h } from "react";
import type * as ReactTypes from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("react", async (original) => ({ ...await original<typeof ReactTypes>(), useState: () => [true, vi.fn()] }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@opai/ds", () => ({ Button: () => null }));
vi.mock("@/app/(erp)/asistencia/_componentes/proponer-correccion", () => ({
  ProponerCorreccion: ({ desde, hasta }: { desde: string; hasta: string }) =>
    h("span", { "data-desde": desde, "data-hasta": hasta }),
}));

import { BotonProponerCorreccion } from "../app/(erp)/asistencia/_componentes/boton-proponer-correccion";

it("envía días AAAA-MM-DD al listado de marcas, no timestamps rechazados por el contrato", () => {
  const html = renderToStaticMarkup(h(BotonProponerCorreccion, {
    personaId: "persona-ficticia", nombre: "Persona ficticia", fecha: "2026-11-17",
  }));
  expect(html).toContain('data-desde="2026-11-17"');
  expect(html).toContain('data-hasta="2026-11-17"');
  expect(html).not.toContain("T00:");
});
