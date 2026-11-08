import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ErrorCapacidad } from "@opai/capabilities";

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
vi.mock("@/lib/mfa", () => ({ verificarMfaDe: async () => null }));
vi.stubEnv("DATABASE_URL", "postgresql://opai_app:x@localhost:5432/opai");
import { PaginaPortal } from "@/app/_components/pagina-portal";

function identidad(portales: string[], extra: Partial<Parameters<typeof membresia>[0]> = {}): Identidad {
  const actual = membresia({ portales, ...extra });
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

async function pintarCliente(cargar?: () => Promise<unknown>) {
  const pagina = PaginaPortal({
    portal: "cliente",
    ruta: "/cliente",
    titulo: "Resumen",
    ...(cargar ? { cargar } : {}),
    children: null,
  });
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

  it("también si la membresía interna incluye «cliente» por error: no carga datos ni cae en el Forbidden desnudo", async () => {
    estado.identidad = identidad(["erp", "cliente"]);
    const cargar = vi.fn(async () => {
      throw new ErrorCapacidad("FORBIDDEN", "Sin acceso.");
    });
    const html = await pintarCliente(cargar);
    expect(html).toContain("Esta cuenta es de la empresa, no de un cliente");
    expect(html).toContain("Cerrar sesión para entrar como cliente");
    expect(html).not.toContain("No tienes acceso a esta sección");
    expect(cargar).not.toHaveBeenCalled();
  });

  it("un owner con solo «cliente» (incoherente) también ve el aviso de empresa", async () => {
    estado.identidad = identidad(["cliente"], { rol: "owner" });
    expect(await pintarCliente()).toContain("Esta cuenta es de la empresa, no de un cliente");
  });

  it("un contacto de cliente (viewer con solo «cliente») no ve el aviso y sí carga sus datos", async () => {
    estado.identidad = identidad(["cliente"], { rol: "viewer" });
    const cargar = vi.fn(async () => "datos");
    const html = await pintarCliente(cargar);
    expect(html).not.toContain("Esta cuenta es de la empresa");
    expect(cargar).toHaveBeenCalledOnce();
  });

  it("una sesión sin membresía ni Plataforma sigue con el «sin permisos» genérico", async () => {
    estado.identidad = { ...identidad(["erp"]), actual: null, membresias: [] };
    const html = await pintarCliente();
    expect(html).not.toContain("Esta cuenta es de la empresa");
    expect(html).toContain("Aún no perteneces a ninguna empresa activa");
  });
});
