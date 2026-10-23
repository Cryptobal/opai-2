import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { defineCapability } from "../src/define";
import { defineModule, registrarModulos } from "../src/module";
import { limpiarRegistro, obtenerCapacidad } from "../src/registry";

const cap = defineCapability({
  id: "demo.ping",
  descripcion: "",
  permiso: "demo:read",
  input: z.object({}),
  output: z.object({}),
  efecto: "lectura",
  dryRun: false,
  handler: async () => ({}),
});

const base = {
  id: "demo",
  nombre: "Demo",
  version: "0.1.0",
  dependencias: [],
  permisos: [{ id: "demo:read", descripcion: "Leer" }],
  navegacion: [],
  configuracion: z.object({}),
  eventos: [],
  capacidades: [cap],
};

beforeEach(() => limpiarRegistro());

describe("defineModule", () => {
  it("acepta un manifest coherente", () => {
    expect(defineModule(base).id).toBe("demo");
  });

  it("rechaza permisos, capacidades y eventos de otro módulo", () => {
    expect(() =>
      defineModule({ ...base, permisos: [{ id: "otro:read", descripcion: "" }] }),
    ).toThrow(/permiso/);
    expect(() =>
      defineModule({ ...base, id: "otro", permisos: [{ id: "otro:read", descripcion: "" }] }),
    ).toThrow(/no pertenece/);
    expect(() =>
      defineModule({ ...base, eventos: [{ id: "otro.creado", descripcion: "" }] }),
    ).toThrow(/evento/);
  });

  it("rechaza capacidades con permisos no declarados", () => {
    expect(() => defineModule({ ...base, permisos: [] })).toThrow(/no declarado/);
  });
});

describe("registrarModulos", () => {
  it("registra las capacidades y valida dependencias", () => {
    registrarModulos([defineModule(base)]);
    expect(obtenerCapacidad("demo.ping")).toBeDefined();
    expect(() =>
      registrarModulos([
        defineModule({ ...base, id: "x", permisos: [], capacidades: [], dependencias: ["nada"] }),
      ]),
    ).toThrow(/depende/);
  });
});
