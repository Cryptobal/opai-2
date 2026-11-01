import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Identidad } from "@/lib/actor";
import { membresia } from "./fuentes-falsas";

const estado = vi.hoisted(() => ({ identidad: null as Identidad | null, ejecutar: vi.fn() }));
vi.mock("@/lib/servidor", () => ({
  identidadActual: async () => estado.identidad,
  ejecutarComoUsuario: estado.ejecutar,
}));
vi.mock("@/app/_components/link-next", () => ({ LinkNext: "a" }));
vi.mock("@/app/_components/maestros/enlace-boton-hoja", () => ({
  EnlaceBotonHoja: ({ children }: { children: string }) => createElement("span", null, children),
}));
vi.mock("@/app/(erp)/cuentas/_componentes/diferidas", () => ({
  HojaContacto: () => "Formulario nuevo",
}));
import { CuentasContacto } from "@/app/(erp)/contactos/_componentes/cuentas-contacto";
import { ListaVinculos } from "@/app/(erp)/contactos/_componentes/lista-vinculos";
import { ContactosCuenta } from "@/app/(erp)/cuentas/_componentes/contactos-cuenta";

const vinculo = {
  id: "v1",
  contactoId: "c1",
  cuentaId: "cu2",
  cuentaNombre: "Cuenta segunda",
  cargo: "Compras",
  roles: ["cesion"],
  esPrincipal: true,
};
function identidad(rol: string, permisosRol: string[] | null = null, denegar = false) {
  const actual = membresia({ rol });
  estado.identidad = {
    actual,
    membresias: [actual],
    modulosActivos: [],
    mfaActiva: true,
    usuario: {
      id: "u1",
      nombre: "Persona ficticia",
      email: "persona@example.test",
      platformRole: null,
    },
    acceso: {
      permisosRol,
      instalaciones: null,
      excepciones: denegar ? [{ permiso: "core:cuentas.manage", conceder: false }] : [],
    },
  };
}
beforeEach(() => {
  estado.ejecutar.mockReset();
  identidad("viewer");
});

describe("CRM PR 2b-1 · permisos calculados en servidor", () => {
  it.each([
    ["owner", null, false, true],
    ["viewer", null, false, false],
    ["owner", null, true, false],
    ["owner", ["core:cuentas.read"], false, false],
    ["viewer", ["core:cuentas.read", "core:cuentas.manage"], false, true],
  ] as const)("%s con permisos %j y denegación %s", async (rol, permisos, denegar, visible) => {
    identidad(rol, permisos ? [...permisos] : null, denegar);
    estado.ejecutar.mockResolvedValue({ ok: true, data: [vinculo] });
    const html = renderToStaticMarkup(await CuentasContacto({ contactoId: "c1" }));
    expect(estado.ejecutar).toHaveBeenCalledWith("erp", "core.contactos.cuentas", {
      contactoId: "c1",
    });
    expect(html).toContain("Cuenta segunda");
    expect(html).toContain("Cesión");
    expect(html).toContain("Principal en esta cuenta");
    for (const accion of ["Vincular a otra cuenta", "Editar vínculo", "Desvincular"]) {
      expect(html.includes(accion)).toBe(visible);
    }
  });

  it.each([false, true])("vacío con gestionar=%s", (gestionar) => {
    const html = renderToStaticMarkup(
      createElement(ListaVinculos, { contactoId: "c1", vinculos: [], gestionar }),
    );
    expect(html).toContain("Sin cuentas visibles");
    expect(html.includes("Vincular a otra cuenta")).toBe(gestionar);
  });

  it.each(["INTERNAL", "FORBIDDEN"])("error %s sin acciones ni datos", async (code) => {
    identidad("owner");
    estado.ejecutar.mockResolvedValue({ ok: false, error: { code, message: "Error" } });
    const html = renderToStaticMarkup(await CuentasContacto({ contactoId: "c1" }));
    expect(html).not.toContain("Cuenta segunda");
    expect(html).not.toContain("Vincular a otra cuenta");
    expect(html).toContain(code === "INTERNAL" ? "Reintentar" : "No tienes acceso");
  });

  it.each(["viewer", "owner"])("Cuenta lee el vínculo y muestra alta solo para %s", async (rol) => {
    identidad(rol);
    estado.ejecutar.mockResolvedValue({
      ok: true,
      data: [
        {
          ...vinculo,
          nombres: "Contacto",
          apellidos: "Ficticio",
          email: null,
          telefono: null,
        },
      ],
    });
    const html = renderToStaticMarkup(await ContactosCuenta({ cuentaId: "cu2" }));
    expect(estado.ejecutar).toHaveBeenCalledWith("erp", "core.cuentas.contactos", {
      cuentaId: "cu2",
    });
    expect(html).toContain('href="/contactos/c1"');
    expect(html).toContain("Compras");
    expect(html).toContain("Cesión");
    expect(html.includes("Nuevo contacto")).toBe(rol === "owner");
    expect(html.includes("Formulario nuevo")).toBe(rol === "owner");
  });
});
