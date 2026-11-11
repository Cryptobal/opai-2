import { describe, expect, it } from "vitest";

import type { Resultado } from "@opai/capabilities";

import {
  cargarFilasHilo,
  cargarPendientesHilo,
  type EjecutarHilo,
} from "@/app/_components/hilo/cargas-hilo";

const AHORA = new Date("2026-11-11T15:00:00Z");
const caida: EjecutarHilo = () => Promise.reject(new Error("sin red"));
const bien = (data: unknown): Resultado => ({ ok: true, data, dryRun: false });
const responde =
  (data: unknown): EjecutarHilo =>
  () =>
    Promise.resolve(bien(data));
const falla =
  (code: "FORBIDDEN" | "INTERNAL"): EjecutarHilo =>
  () =>
    Promise.resolve({ ok: false, error: { code, message: "" } });

describe("cargas del hilo", () => {
  it("sin red, Actividad y Agenda quedan en error y no cargando para siempre", async () => {
    expect((await cargarFilasHilo(caida, "actividad", AHORA)).estado).toBe("error");
    expect((await cargarFilasHilo(caida, "agenda", AHORA)).estado).toBe("error");
  });

  it("sin permiso para leer, el segmento lo dice", async () => {
    expect((await cargarFilasHilo(falla("FORBIDDEN"), "agenda", AHORA)).estado).toBe("sin-permiso");
  });

  it("con datos, el segmento queda listo", async () => {
    const lista = await cargarFilasHilo(responde({ items: [] }), "actividad", AHORA);
    expect(lista).toEqual({ estado: "listo", items: [] });
  });

  it("sin red, los pendientes no se resuelven: quien llama conserva lo que tenía o muestra el error", async () => {
    expect(await cargarPendientesHilo(caida)).toBeNull();
    expect(await cargarPendientesHilo(falla("INTERNAL"))).toBeNull();
  });

  it("los avisos sin leer se suman a los pendientes aunque fallen los contadores", async () => {
    const ejecutar: EjecutarHilo = (id) =>
      id === "core.inicio.pendientes"
        ? Promise.resolve(bien([]))
        : Promise.reject(new Error("sin red"));
    expect(await cargarPendientesHilo(ejecutar)).toEqual({ estado: "listo", items: [] });
  });
});
