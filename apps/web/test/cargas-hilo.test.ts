import { describe, expect, it } from "vitest";

import type { Resultado } from "@opai/capabilities";
import type { FilaHilo, ListaHilo } from "@opai/ds";

import {
  cargarFilasHilo,
  cargarPendientesHilo,
  conservarSiFalla,
  refrescoDeSegmentos,
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

  // CAR-317: al reabrir Actividad o Agenda se vuelve a pedir; si el refresco falla, queda lo que se veía.
  it("un refresco fallido conserva la lista que ya se veía", () => {
    const vista = { estado: "listo", items: [] } as const;
    expect(conservarSiFalla(vista, { estado: "error", items: [] })).toBe(vista);
  });
  it("si el refresco dice que ya no hay permiso, se muestra eso y no la lista vieja", () => {
    const sinPermiso = { estado: "sin-permiso", items: [] } as const;
    expect(conservarSiFalla({ estado: "listo", items: [] }, sinPermiso)).toBe(sinPermiso);
  });
  it("cada vez que se abre Agenda se vuelve a pedir, y Pendientes no pide nada", async () => {
    const pedidos: string[] = [];
    const abrir = refrescoDeSegmentos(
      (s) => {
        pedidos.push(s);
        return Promise.resolve({ estado: "listo", items: [] });
      },
      () => undefined,
    );
    abrir("agenda");
    abrir("pendientes");
    abrir("agenda");
    await Promise.resolve();
    expect(pedidos).toEqual(["agenda", "agenda"]);
  });
  it("una respuesta vieja que llega tarde no pisa a la más nueva", async () => {
    const resolver: Array<(l: ListaHilo<FilaHilo>) => void> = [];
    const vistas: number[] = [];
    const abrir = refrescoDeSegmentos(
      () => new Promise((r) => resolver.push(r)),
      (_s, actualizar) =>
        vistas.push(actualizar({ estado: "cargando", items: [] }) === viejo ? 1 : 2),
    );
    const viejo = { estado: "listo", items: [] } as const;
    const nuevo = { estado: "listo", items: [] } as const;
    abrir("agenda");
    abrir("agenda");
    resolver[1]?.(nuevo);
    await new Promise((r) => setTimeout(r, 0));
    resolver[0]?.(viejo);
    await new Promise((r) => setTimeout(r, 0));
    expect(vistas).toEqual([2]);
  });
  it("un refresco bueno reemplaza la lista, y sin lista previa se muestra el error", () => {
    const nueva = { estado: "listo", items: [] } as const;
    expect(conservarSiFalla({ estado: "listo", items: [] }, nueva)).toBe(nueva);
    const error = { estado: "error", items: [] } as const;
    expect(conservarSiFalla({ estado: "cargando", items: [] }, error)).toBe(error);
  });
});
