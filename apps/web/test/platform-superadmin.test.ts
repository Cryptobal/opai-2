import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Identidad } from "@/lib/actor";
import { tieneAccesoAPortal } from "@/lib/acceso-portal";
import { datosShell } from "@/app/_components/datos-shell";
import { membresia } from "./fuentes-falsas";

const estado = vi.hoisted(() => ({ identidad: null as Identidad | null }));
vi.mock("@/lib/servidor", async () => ({
  ...(await import("@/lib/acceso-portal")),
  requerirIdentidad: async () => estado.identidad,
}));
vi.mock("@/lib/metricas-navegacion", () => ({ medirFase: (_f: string, fn: () => unknown) => fn() }));
vi.mock("@/app/_components/cabecera-pagina", () => ({ CabeceraPagina: () => null }));
vi.mock("@/app/_components/marcador-metricas", () => ({ MarcadorMetricas: () => null }));
import { PaginaPortal } from "@/app/_components/pagina-portal";

function identidad(platformRole: Identidad["usuario"]["platformRole"], conEmpresa: boolean): Identidad {
  const actual = conEmpresa ? membresia({ portales: ["erp", "platform"] }) : null;
  return {
    usuario: { id: "u1", nombre: "Prueba", email: "prueba@example.test", platformRole },
    actual, membresias: actual ? [actual] : [], modulosActivos: [],
    acceso: { permisosRol: null, excepciones: [], instalaciones: null },
  };
}

async function pintar() {
  const cargar = vi.fn(async () => "Empresas");
  const opciones = vi.fn(() => ({ titulo: "Empresas" }));
  const children = vi.fn((dato: string) => createElement("p", null, dato));
  const pagina = PaginaPortal({ portal: "platform", ruta: "/platform", titulo: "Empresas", cargar, opciones, children });
  const contenido = pagina as ReactElement<typeof pagina.props, (p: typeof pagina.props) => Promise<ReactElement>>;
  const html = renderToStaticMarkup(await contenido.type(contenido.props));
  return { html, cargar, opciones, children };
}

describe("Plataforma: guarda real del servidor y del shell", () => {
  for (const rol of ["owner", "support"] as const) {
    it.each([false, true])(`${rol}, con empresa=%s: carga Empresas sin depender del tenant`, async (conEmpresa) => {
      const i = identidad(rol, conEmpresa);
      estado.identidad = i;
      expect(tieneAccesoAPortal(i, "platform")).toBe(true);
      expect(datosShell(i, "platform").acceso).toBe(true);
      expect(datosShell(i, "platform").nav[0]?.etiqueta).toBe("Empresas");
      const r = await pintar();
      expect(r.html).toContain("Empresas");
      expect(r.html).not.toContain("No tienes acceso");
      expect(r.cargar).toHaveBeenCalledOnce();
      expect(r.children).toHaveBeenCalledOnce();
    });
  }

  it.each([false, true])("sin rol global, con empresa=%s: ni owner del tenant ni portales[] conceden Plataforma", async (conEmpresa) => {
    const i = identidad(null, conEmpresa);
    estado.identidad = i;
    expect(tieneAccesoAPortal(i, "platform")).toBe(false);
    const shell = datosShell(i, "platform");
    expect(shell.acceso).toBe(false);
    expect(shell.nav).toEqual([]);
    expect(shell.portales.some((p) => p.id === "platform")).toBe(true);
    const r = await pintar();
    expect(r.html).toContain("No tienes acceso");
    expect(r.cargar).not.toHaveBeenCalled();
    expect(r.opciones).not.toHaveBeenCalled();
    expect(r.children).not.toHaveBeenCalled();
  });

  it.each([undefined, "", "admin", "superadmin"])("rol global desconocido %s: fail-closed", (rol) => {
    const i = identidad(null, true);
    Object.assign(i.usuario, { platformRole: rol });
    expect(tieneAccesoAPortal(i, "platform")).toBe(false);
    expect(datosShell(i, "platform").acceso).toBe(false);
  });
});
