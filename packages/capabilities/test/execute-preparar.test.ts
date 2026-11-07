import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";

import { defineCapability } from "../src/define";
import { executeCapability } from "../src/execute";
import { limpiarRegistro, registrarCapacidades } from "../src/registry";
import { contextoDePrueba } from "../src/testing";

// `preparar` es el gancho para llamadas remotas (firmar un DTE con SimpleAPI): corre ANTES de abrir la
// transacción de la escritura, solo en la ejecución real, y su resultado llega al handler (CAR-196).
const eventos: string[] = [];

const firmar = defineCapability({
  id: "test.documento.firmar",
  descripcion: "Capacidad de prueba que firma fuera de la transacción y luego escribe.",
  permiso: "test:write",
  input: z.object({ n: z.number() }),
  output: z.object({ firma: z.string() }),
  efecto: "escritura",
  dryRun: true,
  preparar: async (_ctx, input) => {
    eventos.push("preparar");
    return { firma: `firmado-${input.n}` };
  },
  async handler(_ctx, _input, modo) {
    eventos.push("handler");
    const p = z.object({ firma: z.string() }).safeParse(modo.preparado);
    return { firma: p.success ? p.data.firma : "sin-preparar" };
  },
});

describe("Capacidad.preparar", () => {
  beforeEach(() => {
    eventos.length = 0;
    limpiarRegistro();
    registrarCapacidades([firmar]);
  });

  function ctx() {
    const { ctx: base } = contextoDePrueba({ permisos: ["test:write"], modulosActivos: ["test"] });
    const original = base.transaccion.bind(base);
    base.transaccion = (fn) => {
      eventos.push("abre-transaccion");
      return original(fn);
    };
    return base;
  }

  it("en la ejecución real prepara antes de abrir la transacción y entrega lo preparado al handler", async () => {
    const r = await executeCapability(ctx(), "test.documento.firmar", { n: 7 });
    expect(r).toMatchObject({ ok: true, data: { firma: "firmado-7" } });
    expect(eventos.slice(0, 3)).toEqual(["preparar", "abre-transaccion", "handler"]);
  });

  it("en vista previa no prepara (no se llama al servicio externo)", async () => {
    const r = await executeCapability(ctx(), "test.documento.firmar", { n: 7 }, { dryRun: true });
    expect(r).toMatchObject({ ok: true, data: { firma: "sin-preparar" } });
    expect(eventos).not.toContain("preparar");
  });
});
