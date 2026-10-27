import { createElement, isValidElement, type ReactNode } from "react";
import type * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Sin acceso al ERP el shell se monta igual (aviso «Sin permisos» en la página), pero no ofrece
// búsqueda, ⌘K ni Preferencias (N1 del Revisor y N2 de QA sobre el PR #59).
type ItemMenu = { id: string };
const captura = vi.hoisted(() => ({
  onBuscar: undefined as (() => void) | undefined,
  menu: [] as ItemMenu[],
  slots: [] as unknown[], cursor: 0,
  navInferior: undefined as unknown, fijados: undefined as unknown,
  onFijar: undefined as unknown,
  pendiente: false,
}));
vi.mock("react", async (importOriginal) => ({
  ...await importOriginal<typeof React>(),
  useState: (inicial: unknown) => {
    const i = captura.cursor++;
    if (!(i in captura.slots)) captura.slots[i] = inicial;
    return [captura.slots[i], (valor: unknown) => { captura.slots[i] = valor; }];
  },
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/app/_acciones/auth", () => ({ accionSalir: vi.fn() }));
vi.mock("@/app/_acciones/capacidad", () => ({ cambiarTenant: vi.fn() }));
vi.mock("@/app/_components/refresco-navegador", () => ({ useEpocaSesion: vi.fn() }));
vi.mock("@/app/_components/link-menu", () => ({ LinkMenu: () => null }));
vi.mock("@opai/ds", () => ({
  AppShell: (p: { onBuscar?: () => void; menuUsuario: ItemMenu[]; navInferior?: unknown; fijados?: unknown; onFijar?: unknown; campana?: ReactNode }) => {
    captura.onBuscar = p.onBuscar;
    captura.menu = p.menuUsuario;
    captura.navInferior = p.navInferior;
    captura.fijados = p.fijados;
    captura.onFijar = p.onFijar;
    captura.pendiente = isValidElement<{ pendiente: boolean }>(p.campana) && p.campana.props.pendiente;
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
  captura.cursor = 0;
  const props = { datos: d, children: null };
  renderToStaticMarkup(createElement(MarcoShell, props, null));
}
beforeEach(() => { captura.slots = []; });

describe("acciones del shell del ERP según el acceso", () => {
  it("descarta preferencias y contador al revocar acceso sin cambiar usuario ni empresa", () => {
    captura.slots = [false, false, null, {
      navInferiorResuelto: [{ href: "/cuentas", etiqueta: "Cuentas", icono: () => null }],
      fijados: [], onFijar: () => undefined, bandejaPendiente: true,
    }];
    pintar({ ...base, acceso: true });
    expect(captura.navInferior).toBeDefined();
    expect(captura.pendiente).toBe(true);
    pintar({ ...base, acceso: false });
    expect(captura.navInferior).toBeUndefined();
    expect(captura.fijados).toBeUndefined();
    expect(captura.onFijar).toBeUndefined();
    expect(captura.pendiente).toBe(false);
    expect(captura.slots[3]).toBeNull();
    pintar({ ...base, acceso: false });
    expect(captura.navInferior).toBeUndefined();
  });

  it("con acceso: hay búsqueda (⌘K) y Preferencias en el menú", () => {
    pintar({ ...base, acceso: true });
    expect(captura.onBuscar).toBeTypeOf("function");
    expect(captura.menu.some((m) => m.id === "pref")).toBe(true);
    expect(captura.menu.some((m) => m.id === "mi-cuenta")).toBe(true);
  });

  it("sin acceso: no hay búsqueda ni Preferencias; se conserva salir", () => {
    pintar({ ...base, acceso: false });
    expect(captura.onBuscar).toBeUndefined();
    expect(captura.menu.some((m) => m.id === "pref")).toBe(false);
    expect(captura.menu.some((m) => m.id === "salir")).toBe(true);
    expect(captura.menu.some((m) => m.id === "mi-cuenta")).toBe(true);
  });

  it("no ofrece Mi cuenta del ERP en otro portal o sin empresa", () => {
    pintar({ ...base, acceso: true, portal: "platform" });
    expect(captura.menu.some((m) => m.id === "mi-cuenta")).toBe(false);
    pintar({ ...base, acceso: false, tenant: null });
    expect(captura.menu.some((m) => m.id === "mi-cuenta")).toBe(false);
  });
});
