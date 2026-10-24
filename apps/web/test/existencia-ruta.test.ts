import { beforeEach, describe, expect, it, vi } from "vitest";

import { consultaDeRuta } from "@/lib/existencia-ruta";

const ejecutar = vi.fn();
vi.mock("@/lib/servidor", () => ({ ejecutarComoUsuario: (...a: unknown[]) => ejecutar(...a) }));

const CERO = "00000000-0000-0000-0000-000000000000";
const noEncontrado = { ok: false, error: { code: "NOT_FOUND", message: "no existe" } };

describe("qué rutas dependen de la base para ser 404", () => {
  it("reconoce fichas con UUID, plantillas e integraciones", () => {
    expect(consultaDeRuta(`/personas/${CERO}`)).toEqual({
      tipo: "ficha",
      coleccion: "personas",
      id: CERO,
    });
    expect(consultaDeRuta(`/cuentas/${CERO}/contactos`)?.tipo).toBe("ficha");
    expect(consultaDeRuta("/configuracion/comunicaciones/turno.cubierto")).toEqual({
      tipo: "evento",
      evento: "turno.cubierto",
    });
    expect(consultaDeRuta("/configuracion/integraciones/zzz")).toEqual({
      tipo: "integracion",
      proveedor: "zzz",
    });
  });

  it("reconoce las fichas de agentes y de supervisor", () => {
    expect(consultaDeRuta(`/configuracion/agentes/${CERO}`)).toEqual({
      tipo: "ficha",
      coleccion: "agentes",
      id: CERO,
    });
    expect(consultaDeRuta(`/supervisor/instalaciones/${CERO}`)?.tipo).toBe("ficha");
    expect(consultaDeRuta(`/supervisor/personas/${CERO}`)?.tipo).toBe("ficha");
    expect(consultaDeRuta("/configuracion/agentes/conectar")).toBeNull();
  });

  it("un % malformado en el slug no lanza (el proxy no puede dar 500)", () => {
    expect(consultaDeRuta("/configuracion/integraciones/%E0%A4%A")).toBeNull();
    expect(consultaDeRuta("/configuracion/comunicaciones/%zz")).toBeNull();
  });

  it("ignora listas, rutas fijas y ids que no son UUID (esos van por esIdInvalido)", () => {
    for (const r of ["/personas", "/personas/vencimientos", "/configuracion/usuarios", "/"])
      expect(consultaDeRuta(r), r).toBeNull();
  });
});

describe("existeRuta", () => {
  beforeEach(() => ejecutar.mockReset());

  it("un UUID válido que no existe responde false", async () => {
    ejecutar.mockResolvedValue(noEncontrado);
    const { existeRuta } = await import("@/lib/existe-ruta");
    expect(await existeRuta(`/personas/${CERO}`)).toBe(false);
    expect(ejecutar).toHaveBeenCalledWith("erp", "core.personas.get", { id: CERO });
  });

  it("las fichas de agentes y de supervisor se leen con su portal y responden false si no existen", async () => {
    ejecutar.mockResolvedValue(noEncontrado);
    const { existeRuta } = await import("@/lib/existe-ruta");
    expect(await existeRuta(`/configuracion/agentes/${CERO}`)).toBe(false);
    expect(ejecutar).toHaveBeenCalledWith("erp", "core.apikeys.get", { id: CERO });
    expect(await existeRuta(`/supervisor/instalaciones/${CERO}`)).toBe(false);
    expect(ejecutar).toHaveBeenCalledWith("supervisor", "core.instalaciones.get", { id: CERO });
    expect(await existeRuta(`/supervisor/personas/${CERO}`)).toBe(false);
    expect(ejecutar).toHaveBeenCalledWith("supervisor", "core.personas.get", { id: CERO });
  });

  it("existente, sin sesión o con otro error: true (decide la página)", async () => {
    const { existeRuta } = await import("@/lib/existe-ruta");
    ejecutar.mockResolvedValue({ ok: true, data: {} });
    expect(await existeRuta(`/personas/${CERO}`)).toBe(true);
    ejecutar.mockResolvedValue({ ok: false, error: { code: "UNAUTHENTICATED", message: "x" } });
    expect(await existeRuta(`/personas/${CERO}`)).toBe(true);
  });

  it("slug de integración «próximamente» o desconocido responde false", async () => {
    const { existeRuta } = await import("@/lib/existe-ruta");
    ejecutar.mockResolvedValue({ ok: true, data: { estado: "proximamente" } });
    expect(await existeRuta("/configuracion/integraciones/futura")).toBe(false);
    ejecutar.mockResolvedValue(noEncontrado);
    expect(await existeRuta("/configuracion/integraciones/zzz")).toBe(false);
    expect(await existeRuta("/configuracion/integraciones/ia")).toBe(true);
  });

  it("evento de comunicación fuera del catálogo responde false", async () => {
    const { existeRuta } = await import("@/lib/existe-ruta");
    ejecutar.mockResolvedValue({ ok: true, data: [{ evento: "turno.cubierto" }] });
    expect(await existeRuta("/configuracion/comunicaciones/turno.cubierto")).toBe(true);
    expect(await existeRuta("/configuracion/comunicaciones/inventado")).toBe(false);
  });
});
