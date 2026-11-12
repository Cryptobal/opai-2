import { beforeEach, expect, it } from "vitest";
import {
  comoAgenteInterno,
  defineCapability,
  limpiarRegistro,
  registrarCapacidades,
} from "@opai/capabilities";
import { contextoDePrueba } from "@opai/capabilities/testing";
import type {
  LlamadaHerramienta,
  RespuestaConversacion,
  SolicitudConversacion,
} from "@opai/integrations";
import { z } from "zod";

import { prepararTurno } from "./bucle";
import { CARGAR, indiceDelAgente } from "./herramientas-demanda";

beforeEach(() => limpiarRegistro());

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

it("no envía los esquemas de todo el registro: parte solo con la herramienta de carga", async () => {
  const ctx = contexto(40);
  const vistos: string[][] = [];
  const plan = await prepararTurno(ctx, "hola", {
    conversar: async (s: SolicitudConversacion) => {
      vistos.push((s.herramientas ?? []).map((h) => h.nombre));
      return respuesta("listo");
    },
  });
  expect(plan.texto).toBe("listo");
  expect(vistos).toEqual([[CARGAR]]);
});

it("el índice nombra todas las herramientas sin sus esquemas", () => {
  const ctx = contexto(3);
  const indice = indiceDelAgente(ctx);
  expect(indice).toContain("core_prueba_lee0");
  expect(indice).toContain("core_prueba_lee2");
  expect(indice).not.toContain("filtro");
});

it("carga a demanda: lo pedido queda disponible en la llamada siguiente y se puede usar", async () => {
  const ctx = contexto(5);
  const vistos: string[][] = [];
  const resultados: string[] = [];
  const guion = [
    respuesta("", [
      { id: "1", nombre: CARGAR, argumentos: { nombres: ["core_prueba_lee3", "no_existe"] } },
    ]),
    respuesta("", [{ id: "2", nombre: "core_prueba_lee3", argumentos: {} }]),
    respuesta("El dato es 3."),
  ];

  const plan = await prepararTurno(ctx, "dame el dato 3", {
    conversar: async (s: SolicitudConversacion) => {
      vistos.push((s.herramientas ?? []).map((h) => h.nombre));
      for (const m of s.mensajes) if (m.rol === "herramienta") resultados.push(m.resultado);
      return guion[vistos.length - 1]!;
    },
  });
  expect(vistos[0]).toEqual([CARGAR]);
  expect(vistos[1]).toEqual([CARGAR, "core_prueba_lee3"]);
  expect(resultados.join(" ")).toContain("no_existe");
  expect(resultados.join(" ")).toContain("dato 3");
  expect(plan.texto).toBe("El dato es 3.");
});
