import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  continuar,
  bloques,
  respuestaHttp,
  solicitud,
  sseContinuidad,
} from "../../integrations/src/ia/continuidad-fixture";
import type { Mensaje, RespuestaConversacion } from "@opai/integrations";
import { iaDe } from "../src/integraciones/ia";
import { contextoDePrueba } from "../src/testing";
import type { Candidato } from "../src/integraciones/ia-respaldo";

const { candidatos } = vi.hoisted(() => ({ candidatos: vi.fn() }));
vi.mock("../src/integraciones/ia-candidatos", () => ({ candidatosIa: candidatos }));
const anthropic: Candidato = {
  id: "ia_anthropic",
  modelo: "m",
  cred: { modalidad: "propia", valor: "key-sintetica" },
};
beforeEach(() =>
  candidatos.mockResolvedValue({ cands: [anthropic], soloPropias: true, propiasInutiles: [] }),
);
afterEach(() => vi.unstubAllGlobals());

it("iaDe conserva instancia y protocolo entre rondas, mide cada respuesta y no cobra BYOK", async () => {
  const cuerpos: string[] = [];
  const fetch = vi.fn(async (_u: string, init: RequestInit) => {
    cuerpos.push(String(init.body));
    return respuestaHttp();
  });
  vi.stubGlobal("fetch", fetch);
  const e = contextoDePrueba();
  const ia = (await iaDe(e.ctx, "economica"))!;
  const s = solicitud();
  const r = await ia.conversar(s);
  await ia.conversar(continuar(s, r));
  expect(JSON.parse(cuerpos[1]!).messages[1].content).toEqual(bloques());
  expect(e.usos).toHaveLength(4);
  expect(e.usos.every((u) => u.sinCosto && u.yaIncurrido)).toBe(true);
  const otra = (await iaDe(e.ctx, "economica"))!;
  await expect(otra.conversar(continuar(s, r))).rejects.toMatchObject({ estado: 400 });
  expect(fetch).toHaveBeenCalledTimes(2);
});

it.each(["valida", "perdida", "perdida_total", "json", "fallo"])(
  "respaldo inicial seguido de continuación %s nunca vuelve al primero",
  async (caso) => {
    candidatos.mockResolvedValue({
      cands: [{ ...anthropic, id: "ia_openai" }, anthropic],
      soloPropias: true,
      propiasInutiles: [],
    });
    const fetch = vi.fn(async (url: string) =>
      String(url).includes("openai")
        ? new Response("fallo sintético", { status: 500 })
        : respuestaHttp(),
    );
    vi.stubGlobal("fetch", fetch);
    const e = contextoDePrueba();
    const ia = (await iaDe(e.ctx, "economica", "agente", undefined, { avisar: false }))!;
    const s = solicitud();
    const r = await ia.conversar(s);
    expect(fetch).toHaveBeenCalledTimes(2);
    const n = continuar(s, r);
    const m = n.mensajes[2]!;
    if (m.rol !== "asistente") throw new Error("Fixture");
    if (caso === "perdida") delete m.continuidad;
    if (caso === "perdida_total") {
      delete m.continuidad;
      delete m.llamadas;
      m.texto = "Proyección modificada";
    }
    if (caso === "json") m.continuidad = JSON.parse(JSON.stringify(m.continuidad));
    if (caso === "fallo") fetch.mockResolvedValue(new Response("fallo sintético", { status: 500 }));
    if (caso === "valida") await ia.conversar(n);
    else
      await expect(ia.conversar(n)).rejects.toMatchObject({ estado: caso === "fallo" ? 500 : 400 });
    expect(fetch).toHaveBeenCalledTimes(caso === "valida" || caso === "fallo" ? 3 : 2);
    expect(fetch.mock.calls.filter(([url]) => String(url).includes("openai"))).toHaveLength(1);
    expect(e.eventos).toHaveLength(0);
  },
);

it("un límite de payload bloquea continuación después de medir uso ya incurrido", async () => {
  const grande = [...bloques(), { type: "redacted_thinking", data: "x".repeat(2 * 1024 * 1024) }];
  const fetch = vi.fn(async () => respuestaHttp(grande));
  vi.stubGlobal("fetch", fetch);
  const e = contextoDePrueba();
  const ia = (await iaDe(e.ctx, "economica"))!;
  const s = solicitud();
  const r = await ia.conversar(s);
  expect(e.usos.map((u) => u.cantidad)).toEqual([10, 4]);
  await expect(ia.conversar(continuar(s, r))).rejects.toMatchObject({
    estado: 400,
    reintentable: false,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(e.usos).toHaveLength(2);
});

it("fallback inicial y stream cancelado sin handle no vuelve a otro proveedor; mide uso parcial", async () => {
  candidatos.mockResolvedValue({
    cands: [{ ...anthropic, id: "ia_openai" }, anthropic],
    soloPropias: true,
    propiasInutiles: [],
  });
  const fetch = vi.fn(async (url: string) =>
    String(url).includes("openai")
      ? new Response("fallo sintético", { status: 500 })
      : sseContinuidad(true, true, true),
  );
  vi.stubGlobal("fetch", fetch);
  const e = contextoDePrueba();
  const ia = (await iaDe(e.ctx, "economica"))!;
  const s = solicitud();
  const mensajes: Mensaje[] = [...s.mensajes];
  for await (const ev of ia.conversarStream(s))
    if (ev.tipo === "herramienta") {
      mensajes.push(
        { rol: "asistente", llamadas: [ev.llamada] },
        { rol: "herramienta", id: "t1", nombre: "buscar", resultado: "x" },
      );
      break;
    }
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(e.usos.map((u) => u.cantidad)).toEqual([10, 0]);
  await expect(ia.conversar({ ...s, mensajes })).rejects.toMatchObject({ estado: 400 });
  expect(fetch).toHaveBeenCalledTimes(2);
});

it("iaDe permite B neutral tras A firmado completo sin desbloquear la reconstrucción de A", async () => {
  const fetch = vi.fn(async () => sseContinuidad(true));
  vi.stubGlobal("fetch", fetch);
  const e = contextoDePrueba();
  const ia = (await iaDe(e.ctx, "economica"))!;
  const a = solicitud();
  let ra: RespuestaConversacion | undefined;
  let rb: RespuestaConversacion | undefined;
  for await (const ev of ia.conversarStream(a)) if (ev.tipo === "fin") ra = ev.respuesta;
  fetch.mockImplementation(async () => sseContinuidad(false));
  const b = { ...solicitud(), mensajes: [{ rol: "usuario" as const, texto: "Otra consulta" }] };
  for await (const ev of ia.conversarStream(b)) if (ev.tipo === "fin") rb = ev.respuesta;
  if (!ra || !rb) throw new Error("Fixture fin");
  fetch.mockImplementation(async () => respuestaHttp([{ type: "text", text: "Listo" }]));
  await expect(ia.conversar(continuar(b, rb))).resolves.toMatchObject({ texto: "Listo" });
  delete ra.continuidad;
  await expect(ia.conversar(continuar(a, ra))).rejects.toMatchObject({ estado: 400 });
  expect(fetch).toHaveBeenCalledTimes(3);
});
