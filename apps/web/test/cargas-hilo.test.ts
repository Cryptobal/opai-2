import { describe, expect, it } from "vitest";

import type { Resultado } from "@opai/capabilities";

import {
  cargarFilasHilo,
  cargarPendientesHilo,
  type LecturasHilo,
} from "@/app/_components/hilo/cargas-hilo";

const AHORA = new Date("2026-11-11T15:00:00Z");
const bien = (data: unknown) => (): Promise<Resultado> =>
  Promise.resolve({ ok: true, data, dryRun: false });
const falla = (code: "FORBIDDEN" | "INTERNAL") => (): Promise<Resultado> =>
  Promise.resolve({ ok: false, error: { code, message: "" } });
const caida = (): Promise<Resultado> => Promise.reject(new Error("sin red"));
const lecturas = (
  una: () => Promise<Resultado>,
  extra: Partial<LecturasHilo> = {},
): LecturasHilo => ({
  pendientes: una,
  contadores: una,
  actividad: una,
  agenda: una,
  ...extra,
});

describe("cargas del hilo", () => {
  it("sin red, Actividad y Agenda quedan en error y no cargando para siempre", async () => {
    expect((await cargarFilasHilo(lecturas(caida), "actividad", AHORA)).estado).toBe("error");
    expect((await cargarFilasHilo(lecturas(caida), "agenda", AHORA)).estado).toBe("error");
  });

  it("sin permiso para leer, el segmento lo dice", async () => {
    expect((await cargarFilasHilo(lecturas(falla("FORBIDDEN")), "agenda", AHORA)).estado).toBe(
      "sin-permiso",
    );
  });

  it("con datos, el segmento queda listo", async () => {
    const lista = await cargarFilasHilo(lecturas(bien({ items: [] })), "actividad", AHORA);
    expect(lista).toEqual({ estado: "listo", items: [] });
  });

  it("sin red, los pendientes no se resuelven: quien llama conserva lo que tenía o muestra el error", async () => {
    expect(await cargarPendientesHilo(lecturas(caida))).toBeNull();
    expect(await cargarPendientesHilo(lecturas(falla("INTERNAL")))).toBeNull();
  });

  it("los pendientes se muestran aunque fallen los contadores de avisos", async () => {
    const leer = lecturas(caida, { pendientes: bien([]) });
    expect(await cargarPendientesHilo(leer)).toEqual({ estado: "listo", items: [] });
  });
});
