import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HiloAgente } from "@/app/_components/agente/hilo-agente";
import { AVISO_SIN_HISTORIAL, textoError } from "@/app/_components/agente/mensajes-error";
import { aplicarTurno } from "@/app/_components/agente/respuesta-plan";
import type { Mensaje } from "@/app/_components/agente/tipos";

const html = (mensajes: Mensaje[]) =>
  renderToStaticMarkup(createElement(HiloAgente, { mensajes, onDecidir: () => undefined }));

describe("historial que no se pudo guardar", () => {
  it("muestra un aviso visible bajo la respuesta, sin ocultarla", () => {
    const h = html([
      { id: "1", rol: "agente", texto: "Respuesta útil", aviso: AVISO_SIN_HISTORIAL },
    ]);
    expect(h).toContain("Respuesta útil");
    expect(h).toContain("no quedó guardada en tu historial");
    expect(h).toContain('role="status"');
  });
  it("sin aviso no agrega nada", () => {
    expect(html([{ id: "1", rol: "agente", texto: "Hola" }])).not.toContain("historial");
  });
  it("un turno que falla al guardar muestra el error corto del servidor", () => {
    const error = textoError("INTERNAL", "No pudimos guardar la conversación en tu historial.");
    expect(error).toBe(
      "No pudimos guardar la conversación en tu historial. No se hizo ningún cambio.",
    );
    expect(html([{ id: "1", rol: "agente", texto: "", error }])).toContain('role="alert"');
  });
  it("una respuesta sin conversación guardada lleva el aviso; con conversación, no", () => {
    const base: Mensaje = { id: "1", rol: "agente", texto: "" };
    const turno = { token: null, texto: "Listo", pasos: [], tokens: 1 };
    expect(aplicarTurno(base, { ...turno, conversacionId: null }, "paso_a_paso").aviso).toBe(
      AVISO_SIN_HISTORIAL,
    );
    expect(aplicarTurno(base, { ...turno, conversacionId: "c1" }, "paso_a_paso").aviso).toBe(
      undefined,
    );
  });
});
