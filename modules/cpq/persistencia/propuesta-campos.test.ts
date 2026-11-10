import { executeCapability, registrarCapacidades } from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const resolver = vi.hoisted(() => vi.fn());
vi.mock("@opai/capabilities", async (orig) => ({
  ...(await orig()),
  resolverCamposDocumento: resolver,
}));

import { ACTIVOS, NEGOCIO_1, semilla } from "../capabilities/fixtures";
import { capacidades } from "../capabilities/index";
import { contratoCamposPropuesta } from "./propuesta-campos";

const bloques = (texto: string) =>
  JSON.stringify([
    {
      id: "a",
      tipo: "texto_libre",
      activo: true,
      fijo: false,
      opcional: true,
      contenidoOverride: texto,
    },
  ]);

beforeAll(() => registrarCapacidades(capacidades));

/** Contexto con una cotización real sobre un negocio con cuenta, y la entrada para un texto. */
async function preparar(texto: string) {
  const { ctx } = contextoDePrueba({ semilla: semilla(), modulosActivos: ACTIVOS, rol: "owner" });
  const r = await executeCapability(ctx, "cpq.cotizaciones.create", {
    negocioId: NEGOCIO_1,
    titulo: "Guardias planta norte",
  });
  if (!r.ok) throw new Error("fixture");
  const cotizacionId = (r.data as { id: string }).id;
  return {
    ctx,
    entrada: {
      cotizacionId,
      propuestaBloquesJson: bloques(texto),
      bloquesBiblioteca: {},
      destinatarios: [],
    },
  };
}

beforeEach(() => resolver.mockReset());

describe("contrato de campos de la propuesta", () => {
  it("sin tokens no resuelve nada ni congela contrato", async () => {
    const c = await preparar("Texto sin campos");
    expect(await contratoCamposPropuesta(c.ctx, c.entrada)).toBeUndefined();
    expect(resolver).not.toHaveBeenCalled();
  });

  it("rechaza un token que no es de propuesta antes de leer datos", async () => {
    const c = await preparar("RUT {{cuenta.rut}}");
    await expect(contratoCamposPropuesta(c.ctx, c.entrada)).rejects.toThrow(/no se pueden usar/);
    expect(resolver).not.toHaveBeenCalled();
  });

  it("congela los valores resueltos con su versión de catálogo", async () => {
    resolver.mockResolvedValue({
      campos: { "cuenta.nombre": "Cliente Ficticio SpA" },
      colecciones: { instalaciones: [] },
    });
    const p = await preparar("Para {{cuenta.nombre}}");
    const c = await contratoCamposPropuesta(p.ctx, p.entrada);
    expect(c?.usados).toEqual(["cuenta.nombre"]);
    expect(c?.versionCatalogo).toBe(2);
    expect(c?.valores.campos["cuenta.nombre"]).toBe("Cliente Ficticio SpA");
    expect(resolver.mock.calls[0]?.[1]).toMatchObject({ finalidad: "propuesta" });
  });

  it("no deja salir una propuesta con datos del cliente que faltan", async () => {
    resolver.mockResolvedValue({ campos: {}, colecciones: { instalaciones: [] } });
    const c = await preparar("Giro {{cuenta.giro}}");
    await expect(contratoCamposPropuesta(c.ctx, c.entrada)).rejects.toThrow(
      /Faltan datos.*cuenta\.giro/,
    );
  });

  it("con referencias congela solo las autorizadas y sin ninguna no deja salir una sección vacía", async () => {
    const texto = "{{#cada referencias}}- {{referencia.cliente}}\n{{/cada}}";
    resolver.mockResolvedValue({
      campos: {},
      colecciones: {
        instalaciones: [],
        referencias: [{ "referencia.cliente": "Cliente de Logística en Quilicura" }],
      },
    });
    const p = await preparar(texto);
    const c = await contratoCamposPropuesta(p.ctx, p.entrada);
    expect(c?.valores.colecciones.referencias).toEqual([
      { "referencia.cliente": "Cliente de Logística en Quilicura" },
    ]);
    expect(c?.valores.colecciones.instalaciones).toEqual([]);
    resolver.mockResolvedValue({ campos: {}, colecciones: { instalaciones: [], referencias: [] } });
    await expect(contratoCamposPropuesta(p.ctx, p.entrada)).rejects.toThrow(
      /ningún cliente activo tiene un consentimiento vigente/,
    );
  });
});
