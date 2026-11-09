import { afterEach, expect, it, vi } from "vitest";
import type { EventoStream, Mensaje } from "./contrato";
import { proveedorIa } from "./proveedores";
import {
  continuar,
  privados,
  respuestaHttp,
  solicitud,
  sseContinuidad,
} from "./continuidad-fixture";

afterEach(() => vi.unstubAllGlobals());

it.each([false, true])(
  "stream completo privado=%s conserva legado o rechaza antes de continuar",
  async (privado) => {
    const fetch = vi.fn(async () => sseContinuidad(privado));
    vi.stubGlobal("fetch", fetch);
    const ia = proveedorIa("ia_anthropic", "key-sintetica");
    const s = solicitud();
    const eventos: EventoStream[] = [];
    for await (const ev of ia.conversarStream("m", s)) eventos.push(ev);
    for (const secreto of privados) expect(JSON.stringify(eventos)).not.toContain(secreto);
    const fin = eventos.at(-1);
    if (fin?.tipo !== "fin") throw new Error("Fixture fin");
    fetch.mockImplementation(async () => respuestaHttp());
    if (privado)
      await expect(ia.conversar("m", continuar(s, fin.respuesta))).rejects.toMatchObject({
        estado: 400,
      });
    else
      await expect(ia.conversar("m", continuar(s, fin.respuesta))).resolves.toMatchObject({
        uso: { tokensEntrada: 10 },
      });
    expect(fetch).toHaveBeenCalledTimes(privado ? 1 : 2);
  },
);

it.each([false, true])(
  "cancelación antesfin (privados posteriores=%s) no permite reconstruir tools",
  async (posterior) => {
    const fetch = vi.fn(async () => sseContinuidad(true, true, posterior));
    vi.stubGlobal("fetch", fetch);
    const ia = proveedorIa("ia_anthropic", "key-sintetica");
    const s = solicitud();
    const mensajes: Mensaje[] = [...s.mensajes];
    for await (const ev of ia.conversarStream("m", s))
      if (ev.tipo === "herramienta") {
        mensajes.push(
          { rol: "asistente", llamadas: [ev.llamada] },
          { rol: "herramienta", id: ev.llamada.id, nombre: ev.llamada.nombre, resultado: "x" },
        );
        break;
      }
    await expect(ia.conversar("m", { ...s, mensajes })).rejects.toMatchObject({ estado: 400 });
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockImplementation(async () => respuestaHttp([{ type: "text", text: "Nuevo turno" }]));
    await expect(ia.conversar("m", solicitud())).resolves.toMatchObject({ texto: "Nuevo turno" });
  },
);

it("un stream truncado no puede continuarse sin handle ni volver a stream", async () => {
  const fetch = vi.fn(async () => sseContinuidad(true, false));
  vi.stubGlobal("fetch", fetch);
  const ia = proveedorIa("ia_anthropic", "key-sintetica");
  const s = solicitud();
  const mensajes: Mensaje[] = [...s.mensajes];
  await expect(
    (async () => {
      for await (const ev of ia.conversarStream("m", s))
        if (ev.tipo === "herramienta")
          mensajes.push(
            { rol: "asistente", llamadas: [ev.llamada] },
            { rol: "herramienta", id: "t1", nombre: "buscar", resultado: "x" },
          );
    })(),
  ).rejects.toThrow();
  await expect(
    (async () => {
      for await (const _ev of ia.conversarStream("m", { ...s, mensajes })) {
        /* consumir */
      }
    })(),
  ).rejects.toMatchObject({ estado: 400 });
  expect(fetch).toHaveBeenCalledTimes(1);
});

it("saturar 32 prefijos falla cerrado aunque se borren handle y llamadas; otra instancia inicia limpio", async () => {
  const fetch = vi.fn(async () => sseContinuidad(true));
  vi.stubGlobal("fetch", fetch);
  const ia = proveedorIa("ia_anthropic", "key-sintetica");
  let s = solicitud();
  for (let n = 0; n < 33; n++) {
    s = { ...solicitud(), mensajes: [{ rol: "usuario", texto: `Solicitud ${n}` }] };
    for await (const ev of ia.conversarStream("m", s)) if (ev.tipo === "herramienta") break;
  }
  await expect(
    ia.conversar("m", {
      ...s,
      mensajes: [...s.mensajes, { rol: "asistente", texto: "Proyección cambiada" }],
    }),
  ).rejects.toMatchObject({ estado: 400 });
  expect(fetch).toHaveBeenCalledTimes(33);
  fetch.mockImplementation(async () => respuestaHttp([{ type: "text", text: "Nuevo" }]));
  await expect(
    proveedorIa("ia_anthropic", "key-sintetica").conversar("m", solicitud()),
  ).resolves.toMatchObject({ texto: "Nuevo" });
});

it.each([false, true])(
  "A firmado completo=%s no impide B neutral ni desbloquea A",
  async (completo) => {
    const fetch = vi.fn(async () => sseContinuidad(true));
    vi.stubGlobal("fetch", fetch);
    const ia = proveedorIa("ia_anthropic", "key-sintetica");
    const a = solicitud();
    let llamada: Mensaje | undefined;
    for await (const ev of ia.conversarStream("m", a))
      if (ev.tipo === "herramienta") {
        llamada = { rol: "asistente", llamadas: [ev.llamada] };
        if (!completo) break;
      }
    fetch.mockImplementation(async () => sseContinuidad(false));
    const b = { ...solicitud(), mensajes: [{ rol: "usuario" as const, texto: "Otra consulta" }] };
    let fin: EventoStream | undefined;
    for await (const ev of ia.conversarStream("m", b)) fin = ev;
    if (fin?.tipo !== "fin" || !llamada) throw new Error("Fixture");
    expect(fin.respuesta.continuidad).toBeUndefined();
    fetch.mockImplementation(async () => respuestaHttp([{ type: "text", text: "Listo" }]));
    await expect(ia.conversar("m", continuar(b, fin.respuesta))).resolves.toMatchObject({
      texto: "Listo",
    });
    await expect(
      ia.conversar("m", {
        ...a,
        mensajes: [
          ...a.mensajes,
          llamada,
          { rol: "herramienta", id: "t1", nombre: "buscar", resultado: "x" },
        ],
      }),
    ).rejects.toMatchObject({ estado: 400 });
    expect(fetch).toHaveBeenCalledTimes(3);
  },
);
