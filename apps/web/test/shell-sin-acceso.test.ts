import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Sin acceso al ERP el shell se monta igual (aviso «Sin permisos» en la página), pero no ofrece
// búsqueda, ⌘K ni Preferencias (N1 del Revisor y N2 de QA sobre el PR #59).
type ItemMenu = { id: string };
const captura = vi.hoisted(() => ({
  onBuscar: undefined as (() => void) | undefined,
  menu: [] as ItemMenu[],
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/app/_acciones/auth", () => ({ accionSalir: vi.fn() }));
vi.mock("@/app/_acciones/capacidad", () => ({ cambiarTenant: vi.fn() }));
vi.mock("@/app/_components/refresco-navegador", () => ({ useEpocaSesion: vi.fn() }));
vi.mock("@/app/_components/link-menu", () => ({ LinkMenu: () => null }));
vi.mock("@opai/ds", () => ({
  AppShell: (p: { onBuscar?: () => void; menuUsuario: ItemMenu[] }) => {
    captura.onBuscar = p.onBuscar;
    captura.menu = p.menuUsuario;
    return null;
  },
}));
import { MarcoShell, type DatosShell } from "@/app/_components/marco-shell";

const base: Omit<DatosShell, "acceso"> = {
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

describe("acciones del shell del ERP según el acceso", () => {
  it("con acceso: hay búsqueda (⌘K) y Preferencias en el menú", () => {
    pintar({ ...base, acceso: true });
    expect(captura.onBuscar).toBeTypeOf("function");
    expect(captura.menu.some((m) => m.id === "pref")).toBe(true);
  });

  it("sin acceso: no hay búsqueda ni Preferencias; se conserva salir", () => {
    pintar({ ...base, acceso: false });
    expect(captura.onBuscar).toBeUndefined();
    expect(captura.menu.some((m) => m.id === "pref")).toBe(false);
    expect(captura.menu.some((m) => m.id === "salir")).toBe(true);
  });
});
