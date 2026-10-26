import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const captura = vi.hoisted(() => ({ titulo: "", campana: null as ReactElement | null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({}) }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/app/_acciones/auth", () => ({ accionSalir: vi.fn() }));
vi.mock("@/app/_acciones/capacidad", () => ({ cambiarTenant: vi.fn() }));
vi.mock("@/app/_components/refresco-navegador", () => ({ useEpocaSesion: vi.fn() }));
vi.mock("@/app/_components/link-menu", () => ({ LinkMenu: () => null }));
vi.mock("@opai/ds", () => ({
  AppShell: (p: { titulo: string; campana: ReactElement }) => {
    captura.titulo = p.titulo;
    captura.campana = p.campana;
    return null;
  },
}));
import { MarcoShell, type DatosShell } from "@/app/_components/marco-shell";
import { fijarCabecera } from "@/app/_components/cabecera-contexto";

const datos: DatosShell = {
  portal: "erp",
  nav: [],
  portales: [],
  tenant: { nombre: "Empresa" },
  usuario: { nombre: "Prueba", email: "prueba@example.test" },
  empresas: [],
  epoca: "u1:t1",
};

function pintar(d: DatosShell) {
  const props = { datos: d, children: null };
  renderToStaticMarkup(createElement(MarcoShell, props, null));
}

describe("estado del shell al cambiar de contexto", () => {
  it("la campana conserva identidad en el mismo tenant y se remonta al cambiar empresa", () => {
    pintar(datos);
    const primera = captura.campana?.key;
    expect(primera).toBe(datos.epoca);
    pintar({ ...datos });
    expect(captura.campana?.key).toBe(primera);
    pintar({ ...datos, epoca: "u1:t2" });
    expect(captura.campana?.key).not.toBe(primera);
  });

  it("el shell tiene título antes de que la página del ERP publique su cabecera", () => {
    fijarCabecera({ titulo: "" });
    pintar(datos);
    expect(captura.titulo).toBe("Inicio");
  });
});
