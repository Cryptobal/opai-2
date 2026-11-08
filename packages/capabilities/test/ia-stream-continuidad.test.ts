import { afterEach, expect, it, vi } from "vitest";
import type { RespuestaConversacion } from "@opai/integrations";
import { continuar, solicitud } from "../../integrations/src/ia/continuidad-fixture";
import { iaDe } from "../src/integraciones/ia";
import { contextoDePrueba } from "../src/testing";

vi.mock("../src/integraciones/ia-candidatos", () => ({
  candidatosIa: async () => ({
    cands: ["ia_anthropic", "ia_openai"].map((id) => ({
      id,
      modelo: "m",
      cred: { modalidad: "propia", valor: "key-ficticia" },
    })),
    soloPropias: true,
    propiasInutiles: [],
  }),
}));
afterEach(() => vi.unstubAllGlobals());
it("un fallo antes del primer evento no invalida el toolturn del respaldo OpenAI", async () => {
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    if (String(url).includes("anthropic")) return new Response("fallo sintético", { status: 500 });
    if (JSON.parse(String(init.body)).stream)
      return new Response(
        [
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    { index: 0, id: "t1", function: { name: "buscar", arguments: "{}" } },
                  ],
                },
              },
            ],
          },
          {
            choices: [{ finish_reason: "tool_calls" }],
            usage: { prompt_tokens: 6, completion_tokens: 3 },
          },
        ]
          .map((e) => `data: ${JSON.stringify(e)}\n\n`)
          .join(""),
      );
    return Response.json({
      choices: [{ message: { content: "Listo" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 4, completion_tokens: 2 },
    });
  });
  vi.stubGlobal("fetch", fetch);
  const e = contextoDePrueba();
  const ia = (await iaDe(e.ctx, "economica"))!;
  const s = solicitud();
  let r: RespuestaConversacion | undefined;
  for await (const ev of ia.conversarStream(s)) if (ev.tipo === "fin") r = ev.respuesta;
  if (!r) throw new Error("Fixture sin fin");
  expect(r.continuidad).toBeUndefined();
  expect(fetch).toHaveBeenCalledTimes(2);
  await expect(ia.conversar(continuar(s, r))).resolves.toMatchObject({
    texto: "Listo",
    proveedor: "ia_openai",
  });
  expect(fetch).toHaveBeenCalledTimes(4);
  expect(e.usos.map((u) => u.cantidad)).toEqual([6, 3, 4, 2]);
});
