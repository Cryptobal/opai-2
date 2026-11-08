import { inspect } from "node:util";
import { afterEach, expect, it, vi } from "vitest";
import type { ContinuidadIa } from "./contrato";
import { proveedorIa } from "./proveedores";
import { bloques, continuar, privados, respuestaHttp, solicitud } from "./continuidad-fixture";

afterEach(() => vi.unstubAllGlobals());
function fixture() {
  const cuerpos: { messages: { content: unknown }[] }[] = [];
  const fetch = vi.fn(async (_url: string, init: RequestInit) => {
    cuerpos.push(JSON.parse(String(init.body)));
    return respuestaHttp(bloques(`t${cuerpos.length}`));
  });
  vi.stubGlobal("fetch", fetch);
  return { ia: proveedorIa("ia_anthropic", "key-ficticia"), fetch, cuerpos };
}

it("conserva contenido completo y orden durante múltiples rondas, sin exponer bloques privados", async () => {
  const { ia, cuerpos } = fixture();
  const s = solicitud();
  const r1 = await ia.conversar("m", s);
  const s2 = continuar(s, r1);
  const r2 = await ia.conversar("m", s2);
  await ia.conversar("m", continuar(s2, r2));
  expect(cuerpos[1]!.messages[1]!.content).toEqual(bloques("t1"));
  expect(cuerpos[2]!.messages[1]!.content).toEqual(bloques("t1"));
  expect(cuerpos[2]!.messages[3]!.content).toEqual(bloques("t2"));
  for (const privado of privados) {
    expect(JSON.stringify(r1)).not.toContain(privado);
    expect(inspect(r1, { depth: null })).not.toContain(privado);
    expect(JSON.stringify(s2)).not.toContain(privado);
  }
});

it.each([
  "sistema",
  "prefijo",
  "texto",
  "argumentos",
  "tools",
  "choice",
  "salida",
  "resultado",
  "perdida",
  "perdida_total",
  "forjada",
  "json",
])("rechaza %s sin pedir red ni revelar contenido", async (caso) => {
  const { ia, fetch } = fixture();
  const s = solicitud();
  const r = await ia.conversar("m", s);
  const n = continuar(s, r);
  const mensajes = [...n.mensajes];
  const asistente = mensajes[2]!;
  if (asistente.rol !== "asistente") throw new Error("Fixture");
  if (caso === "sistema") mensajes[0] = { rol: "sistema", texto: "Distinto" };
  if (caso === "prefijo") mensajes[1] = { rol: "usuario", texto: "Distinto" };
  if (caso === "texto") asistente.texto = "Distinto";
  if (caso === "argumentos")
    asistente.llamadas = [{ ...r.llamadas[0]!, argumentos: { q: "otro" } }];
  if (caso === "tools") n.herramientas = [];
  if (caso === "choice") n.eleccionHerramienta = "ninguna";
  if (caso === "salida") n.salidaEstructurada = { nombre: "distinta", esquema: {} };
  if (caso === "resultado")
    mensajes[3] = { rol: "herramienta", id: "ajeno", nombre: "buscar", resultado: "x" };
  if (caso === "perdida") delete asistente.continuidad;
  if (caso === "perdida_total") {
    delete asistente.continuidad;
    delete asistente.llamadas;
    asistente.texto = "Proyección distinta";
    mensajes.splice(3);
  }
  if (caso === "forjada") asistente.continuidad = {} as ContinuidadIa;
  if (caso === "json") asistente.continuidad = JSON.parse(JSON.stringify(r.continuidad));
  await expect(ia.conversar("m", { ...n, mensajes })).rejects.toMatchObject({
    estado: 400,
    reintentable: false,
  });
  expect(fetch).toHaveBeenCalledTimes(1);
});

it.each(["modelo", "cuenta", "instancia", "openai", "google"])(
  "rechaza cambio %s antes de red",
  async (caso) => {
    const { ia, fetch } = fixture();
    const s = solicitud();
    const r = await ia.conversar("m", s);
    const otro =
      caso === "modelo"
        ? ia
        : proveedorIa(
            caso === "openai" ? "ia_openai" : caso === "google" ? "ia_google" : "ia_anthropic",
            caso === "cuenta" ? "otra-key" : "key-ficticia",
          );
    await expect(
      otro.conversar(caso === "modelo" ? "otro-modelo" : "m", continuar(s, r)),
    ).rejects.toMatchObject({ estado: 400 });
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);

it("snapshot previo a HTTP detecta mutación mientras espera y permite presupuesto maxTokens variable", async () => {
  const { ia, fetch } = fixture();
  const s = solicitud();
  const r = await ia.conversar("m", s);
  await expect(ia.conversar("m", { ...continuar(s, r), maxTokens: 500 })).resolves.toMatchObject({
    uso: { tokensEntrada: 10 },
  });
  fetch.mockImplementationOnce(async () => {
    s.mensajes = [{ rol: "usuario", texto: "mutado durante HTTP" }];
    return respuestaHttp();
  });
  // La instancia nueva evita confundir un turno anterior con esta solicitud independiente.
  const nueva = proveedorIa("ia_anthropic", "key-ficticia");
  const rr = await nueva.conversar("m", s);
  await expect(nueva.conversar("m", continuar(s, rr))).rejects.toMatchObject({ estado: 400 });
});

it("texto final y salida estructurada no añaden handles que impidan otra conversación", async () => {
  const { ia, fetch } = fixture();
  fetch.mockImplementation(async () => respuestaHttp([{ type: "text", text: "Listo" }]));
  expect((await ia.conversar("m", solicitud())).continuidad).toBeUndefined();
  await expect(ia.conversar("m", solicitud())).resolves.toMatchObject({ texto: "Listo" });
});

it("preserva múltiples tools intercaladas y admite sus resultados completos en otro orden", async () => {
  const { ia, fetch, cuerpos } = fixture();
  const raw = [...bloques(), { type: "tool_use", id: "t2", name: "buscar", input: { q: "y" } }];
  fetch.mockImplementationOnce(async () => respuestaHttp(raw));
  const s = solicitud();
  const r = await ia.conversar("m", s);
  const n = continuar(s, r);
  await ia.conversar("m", {
    ...n,
    mensajes: [...n.mensajes.slice(0, 3), ...n.mensajes.slice(3).reverse()],
  });
  expect(cuerpos[0]!.messages[1]!.content).toEqual(raw);
});
