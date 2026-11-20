import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  datos: null as Record<string, unknown> | null,
  identidadVista: vi.fn(),
  real: { usuario: { id: "usuario-real-ficticio" }, actual: { tenantId: "tenant-ficticio" } },
}));
vi.mock("@/lib/servidor", () => ({ identidadActual: async () => m.real }));
vi.mock("@/lib/ver-como", () => ({
  verComoDe: async () => ({ portal: "trabajador", nombre: "Persona ficticia" }),
  identidadDeLaVista: m.identidadVista,
}));
vi.mock("@/lib/marco-servidor", () => ({
  marcoDeLaPeticion: async () => "nuevo",
  menuPlegadoDeLaPeticion: vi.fn(), anchoMenuDeLaPeticion: vi.fn(),
}));
vi.mock("@/app/_components/datos-shell", () => ({
  datosShell: () => ({
    epoca: "epoca-de-persona-vista", acceso: true, usuario: { nombre: "Persona ficticia" },
    nav: [{ href: "/trabajador/mis-datos" }],
    empresas: [{ id: "tenant-ficticio" }],
    portales: [{ id: "trabajador" }, { id: "cliente" }],
  }),
}));
vi.mock("@/app/_components/marco-portal", () => ({
  MarcoPortal: ({ datos, children }: { datos: Record<string, unknown>; children: ReactNode }) => {
    m.datos = datos;
    return createElement("main", null, children);
  },
}));
vi.mock("@/app/_components/ver-como/banner-ver-como", () => ({ BannerVerComo: () => null }));
vi.mock("@/app/_components/carga-portal", () => ({
  CargaPortal: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@opai/ds", () => ({ Loading: () => null }));

import { epocaDe } from "@/lib/epoca-sesion";
import { PortalLayout } from "@/app/_components/portal-layout";
import { DesactivarEnVista } from "@/app/_components/ver-como/solo-lectura";

beforeEach(() => {
  m.datos = null;
  m.identidadVista.mockReset().mockResolvedValue({ usuario: { id: "persona-vista-ficticia" } });
});

describe("época de sesión en el shell de ver como", () => {
  it("transporta la época real desde el layout y conserva navegación vista y solo lectura", async () => {
    const children = createElement(DesactivarEnVista, null, createElement("button", null, "Guardar"));
    const shell = PortalLayout({ portal: "trabajador", children }).props.children;
    const marco = await shell.type(shell.props);
    const epocaReal = epocaDe("usuario-real-ficticio", "tenant-ficticio");
    expect(marco.props.epocaSesion).toBe(epocaReal);
    const contenido = await marco.type(marco.props);
    const html = renderToStaticMarkup(contenido);
    expect(m.datos).toMatchObject({
      epoca: epocaReal, vista: true, usuario: { nombre: "Persona ficticia" },
      nav: [{ href: "/trabajador/mis-datos" }], empresas: [], portales: [{ id: "trabajador" }],
    });
    expect(html).toMatch(/<fieldset[^>]*disabled/);
  });
});
