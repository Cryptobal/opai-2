import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  comoAgenteInterno,
  defineCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import { proveedorIa } from "@opai/integrations";
import type {
  LlamadaHerramienta,
  RespuestaConversacion,
  SolicitudConversacion,
} from "@opai/integrations";
import { z } from "zod";

import { prepararTurno } from "./bucle";
import { CARGAR, USAR, indiceDelAgente } from "./herramientas-demanda";

beforeEach(() => limpiarRegistro());
afterEach(() => vi.unstubAllGlobals());

function contexto(cuantas: number) {
  registrarCapacidades(
    Array.from({ length: cuantas }, (_, i) =>
      defineCapability({
        id: `core.prueba.lee${i}`,
        descripcion: `Lee el dato sintético número ${i} para probar la carga de herramientas.`,
        permiso: "core:prueba.read",
        input: z.object({ filtro: z.string().optional() }),
        output: z.string(),
        efecto: "lectura",
        dryRun: false,
        handler: async () => `dato ${i}`,
      }),
    ),
  );
  const { ctx } = contextoDePrueba({ modulosActivos: ["agente"] });
  ctx.revalidarAccesoSolicitud = async () => "acceso-ficticio";
  const agente = { ...comoAgenteInterno(ctx), medidor: ctx.medidor, eventos: ctx.eventos };
  agente.revalidarAccesoSolicitud = ctx.revalidarAccesoSolicitud;
  return agente;
}
const respuesta = (texto: string, llamadas: LlamadaHerramienta[] = []) =>
  ({
    texto,
    llamadas,
    uso: { tokensEntrada: 10, tokensSalida: 5 },
    motivo: llamadas.length ? "herramienta" : "fin",
    modelo: "simulado",
    proveedor: "ia_anthropic",
  }) satisfies RespuestaConversacion;

it("no envía los esquemas del registro: siempre las mismas dos herramientas", async () => {
  const ctx = contexto(40);
  const vistos: string[][] = [];
  const plan = await prepararTurno(ctx, "hola", {
    conversar: async (s: SolicitudConversacion) => {
      vistos.push((s.herramientas ?? []).map((h) => h.nombre));
      expect(JSON.stringify(s.herramientas)).not.toContain("core_prueba_lee7");
      return respuesta("listo");
    },
  });
  expect(plan.texto).toBe("listo");
  expect(vistos).toEqual([[CARGAR, USAR]]);
});

it("el índice nombra todas las herramientas sin sus esquemas", () => {
  const ctx = contexto(3);
  const indice = indiceDelAgente(ctx);
  expect(indice).toContain("core_prueba_lee0");
  expect(indice).toContain("core_prueba_lee2");
  expect(indice).not.toContain("filtro");
});

it("carga el esquema pedido y después ejecuta la herramienta real", async () => {
  const ctx = contexto(5);
  const resultados: string[] = [];
  let n = 0;
  const guion = [
    respuesta("", [
      { id: "1", nombre: CARGAR, argumentos: { nombres: ["core_prueba_lee3", "no_existe"] } },
    ]),
    respuesta("", [
      { id: "2", nombre: USAR, argumentos: { nombre: "core_prueba_lee3", argumentos: {} } },
    ]),
    respuesta("El dato es 3."),
  ];
  const plan = await prepararTurno(ctx, "dame el dato 3", {
    conversar: async (s: SolicitudConversacion) => {
      resultados.length = 0;
      for (const m of s.mensajes) if (m.rol === "herramienta") resultados.push(m.resultado);
      return guion[n++]!;
    },
  });
  expect(resultados[0]).toContain("filtro");
  expect(resultados[0]).toContain('"desconocidas":["no_existe"]');
  expect(resultados[1]).toContain("dato 3");
  expect(plan.texto).toBe("El dato es 3.");
});

it("con el adaptador real de Anthropic, cargar y usar no rompe la continuidad", async () => {
  const ctx = contexto(4);
  const cuerpos: string[] = [];
  const uso = { input_tokens: 10, output_tokens: 4 };
  const guion = [
    {
      content: [
        { type: "tool_use", id: "t1", name: CARGAR, input: { nombres: ["core_prueba_lee2"] } },
      ],
      usage: uso,
      stop_reason: "tool_use",
    },
    {
      content: [
        {
          type: "tool_use",
          id: "t2",
          name: USAR,
          input: { nombre: "core_prueba_lee2", argumentos: {} },
        },
      ],
      usage: uso,
      stop_reason: "tool_use",
    },
    { content: [{ type: "text", text: "El dato es 2." }], usage: uso, stop_reason: "end_turn" },
  ];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_u: string, init: RequestInit) => {
      cuerpos.push(String(init.body));
      return Response.json(guion[cuerpos.length - 1]);
    }),
  );
  const proveedor = proveedorIa("ia_anthropic", "clave-ficticia");
  const plan = await prepararTurno(ctx, "dame el dato 2", {
    conversar: (s) => proveedor.conversar("modelo-simulado", s),
  });
  expect(plan.texto).toBe("El dato es 2.");
  expect(cuerpos).toHaveLength(3);
  expect(cuerpos[2]).toContain("dato 2");
});
