import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Identidad } from "@/lib/actor";
import { membresia } from "./fuentes-falsas";

const estado = vi.hoisted(() => ({ identidad: null as Identidad | null }));
vi.mock("@/lib/servidor", async () => ({
  ...(await import("@/lib/acceso-portal")),
  requerirIdentidad: async () => estado.identidad,
}));
vi.mock("@/lib/metricas-navegacion", () => ({ medirFase: (_f: string, fn: () => unknown) => fn() }));
vi.mock("@/app/_components/cabecera-pagina", () => ({ CabeceraPagina: () => null }));
vi.mock("@/app/_components/marcador-metricas", () => ({ MarcadorMetricas: () => null }));
vi.mock("@/app/_acciones/auth", () => ({ accionSalir: vi.fn() }));
vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
import { PaginaPortal } from "@/app/_components/pagina-portal";

function identidad(portales: string[]): Identidad {
  const actual = membresia({ portales });
  return {
    usuario: { id: "u1", nombre: "Prueba", email: "prueba@example.test", platformRole: null },
    actual,
    membresias: [actual],
    modulosActivos: [],
    acceso: { permisosRol: null, excepciones: [], instalaciones: null },
    mfaActiva: true,
    mfaVerificada: true,
  };
}

async function pintarCliente() {
  const pagina = PaginaPortal({ portal: "cliente", ruta: "/cliente", titulo: "Resumen", children: null });
  const c = pagina as ReactElement<typeof pagina.props, (p: typeof pagina.props) => Promise<ReactElement>>;
  return renderToStaticMarkup(await c.type(c.props));
}

describe("Portal Cliente con una sesión de la empresa (CAR-192)", () => {
  it("muestra el aviso claro con «Cerrar sesión para entrar como cliente» y «Volver al ERP»", async () => {
    estado.identidad = identidad(["erp"]);
    const html = await pintarCliente();
    expect(html).toContain("Esta cuenta es de la empresa, no de un cliente");
    expect(html).toContain("Cerrar sesión para entrar como cliente");
    expect(html).toContain("Volver al ERP");
    expect(html).not.toContain("No tienes acceso a este portal");
  });

  it("solo ese caso: una sesión sin ERP ni Plataforma sigue con el «sin permisos» genérico", async () => {
    estado.identidad = identidad(["trabajador"]);
    const html = await pintarCliente();
    expect(html).toContain("No tienes acceso a este portal en la empresa actual");
    expect(html).not.toContain("Esta cuenta es de la empresa");
  });

  it("un contacto con acceso al portal cliente no ve el aviso", async () => {
    estado.identidad = identidad(["cliente"]);
    const html = await pintarCliente();
    expect(html).not.toContain("Esta cuenta es de la empresa");
  });
});
