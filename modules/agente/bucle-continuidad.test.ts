import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { limpiarRegistro } from "@opai/capabilities";
import { proveedorIa } from "@opai/integrations";
import { entornoBucle } from "./bucle-fixtures";
import { prepararTurno } from "./bucle";

beforeEach(() => limpiarRegistro());
afterEach(() => vi.unstubAllGlobals());
it("transporta el handle hasta Anthropic sin incluir pensamiento o firma en Plan ni auditoría", async () => {
  const raw = [
    { type: "thinking", thinking: "PENSAMIENTO_PRIVADO", signature: "FIRMA_PRIVADA" },
    { type: "tool_use", id: "t1", name: "core_prueba_accion", input: {} },
  ];
  const cuerpos: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_u: string, init: RequestInit) => {
      cuerpos.push(String(init.body));
      return Response.json({
        content: cuerpos.length === 1 ? raw : [{ type: "text", text: "Plan público" }],
        usage: { input_tokens: 2, output_tokens: 3 },
        stop_reason: cuerpos.length === 1 ? "tool_use" : "end_turn",
      });
    }),
  );
  const e = entornoBucle("escritura");
  const ia = proveedorIa("ia_anthropic", "key-ficticia");
  const plan = await prepararTurno(e.ctx, "Prepara la vista previa", {
    conversar: (s) => ia.conversar("m", s),
  });
  expect(JSON.parse(cuerpos[1]!).messages[1].content).toEqual(raw);
  expect(plan.tokens).toBe(10);
  expect(plan.pasos).toHaveLength(1);
  expect(e.escrituras()).toBe(0);
  for (const salida of [JSON.stringify(plan), JSON.stringify(e.eventos), JSON.stringify(e.usos)]) {
    expect(salida).not.toContain("PENSAMIENTO_PRIVADO");
    expect(salida).not.toContain("FIRMA_PRIVADA");
    expect(salida).not.toContain("continuidad");
  }
});
