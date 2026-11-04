import { beforeEach, describe, expect, it, vi } from "vitest";

const ejecutar = vi.hoisted(() => vi.fn());
vi.mock("@/lib/servidor", () => ({ ejecutarComoUsuario: ejecutar }));

import { buscarCandidatosDocumento } from "@/app/_acciones/candidatos-documento";
import {
  FILA_INFO,
  opcionesDeCandidatos,
  TEXTO_MAS,
} from "@/app/_components/documentos/opciones-candidatos";
import { vinculoInicial } from "@/app/_components/documentos/use-destino";

beforeEach(() => ejecutar.mockReset());

describe("buscador de «Vincular a»: filas informativas y vínculo de partida", () => {
  it("avisa que hay más resultados solo al llegar al tope de 20", async () => {
    const filas = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ id: `c${i}`, nombre: `C${i}` }));
    ejecutar.mockResolvedValue({ ok: true, data: { items: filas(19) } });
    const poco = await buscarCandidatosDocumento({ tipo: "cuenta", q: "" });
    expect(poco.ok && poco.hayMas).toBeUndefined();
    ejecutar.mockResolvedValue({ ok: true, data: { items: filas(20) } });
    const tope = await buscarCandidatosDocumento({ tipo: "cuenta", q: "" });
    expect(tope.ok && tope.hayMas).toBe(true);
    const opciones = opcionesDeCandidatos(tope);
    expect(opciones).toHaveLength(21);
    expect(opciones[20]).toEqual({ valor: "__mas", etiqueta: TEXTO_MAS });
    expect(FILA_INFO.has("__mas") && FILA_INFO.has("__error")).toBe(true);
    expect(opcionesDeCandidatos(poco)).toHaveLength(19);
    expect(opcionesDeCandidatos({ ok: false, mensaje: "x" })).toEqual([
      { valor: "__error", etiqueta: "x" },
    ]);
  });

  it("el vínculo de partida es la entidad fija o la empresa (a lo que vuelve al cerrar la hoja)", () => {
    expect(vinculoInicial({ tipo: "persona", id: "p1" })).toEqual({
      tipo: "persona",
      id: "p1",
      nombre: null,
    });
    expect(vinculoInicial({ tipo: "puesto", id: "x" }).tipo).toBe("tenant");
  });
});
