import { describe, expect, it } from "vitest";
import { z } from "zod";

import { asegurarRegistro } from "../lib/registro";
import { esLista, faltasDelContrato, listasDelRegistro } from "./listas-contrato";
import pendientes from "./listas-pendientes.json";

// CAR-353 (Estándares N-2): toda capacidad de lista nueva cumple el contrato de REGLAS-codigo.md
// (cursor + limite con tope; items + siguiente). Las que existían al 13-nov-2026 sin cumplirlo están
// congeladas en listas-pendientes.json y solo pueden salir de ahí (al migrarlas), nunca entrar.
asegurarRegistro();

describe("contrato único de listas (CAR-353)", () => {
  const listas = listasDelRegistro();
  const congeladas = new Set(pendientes as string[]);

  it("ninguna lista nueva queda fuera del contrato", () => {
    const fuera = listas.filter((l) => l.faltas.length > 0 && !congeladas.has(l.id));
    expect(fuera).toEqual([]);
  });

  it("la lista de pendientes solo nombra listas vigentes que todavía no cumplen", () => {
    const porId = new Map(listas.map((l) => [l.id, l.faltas]));
    const sobran = [...congeladas].filter((id) => (porId.get(id)?.length ?? 0) === 0);
    expect(sobran).toEqual([]);
  });

  it("el detector reconoce el contrato y sus faltas", () => {
    const entrada = z.object({
      cursor: z.string().optional(),
      limite: z.number().int().min(1).max(200).default(50),
    });
    const salida = z.object({ items: z.array(z.string()), siguiente: z.string().nullable() });
    expect(esLista("x.cosas.listar", salida)).toBe(true);
    expect(esLista("x.cosas.list_a_cargo", z.object({}))).toBe(true);
    expect(esLista("x.cosas.buscar", salida)).toBe(true);
    expect(esLista("x.cosas.get", z.object({}))).toBe(false);
    expect(esLista("x.cosas.listado", z.object({}))).toBe(false);
    expect(faltasDelContrato(entrada, salida)).toEqual([]);
    const flojas = z.object({ cursor: z.number().optional(), limite: z.number().max(100) });
    expect(
      faltasDelContrato(flojas, z.object({ items: z.array(z.string()), siguiente: z.string() })),
    ).toEqual([
      "cursor no es texto opcional",
      "limite no es entero ≥ 1",
      "siguiente no admite null",
    ]);
    expect(faltasDelContrato(z.object({ limite: z.number() }), z.array(z.string()))).toEqual([
      "entrada sin cursor",
      "limite sin tope",
      "salida sin items",
      "salida sin siguiente",
    ]);
  });
});
