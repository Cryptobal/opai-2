import { describe, expect, it } from "vitest";

import { idAutor } from "../src";

// CAR-247: las columnas de autor uuid guardan a la persona cuando escribe un agente sin key.
describe("idAutor", () => {
  const persona = "0193a5d4-0000-7000-8000-000000000001";
  it("persona y agente con key conservan su id", () => {
    expect(idAutor({ tipo: "user", id: persona })).toBe(persona);
    expect(idAutor({ tipo: "agent", id: "0193a5d4-0000-7000-8000-0000000000aa", viaUserId: persona })).toBe(
      "0193a5d4-0000-7000-8000-0000000000aa",
    );
  });
  it("agente interno y app OAuth guardan a la persona", () => {
    expect(idAutor({ tipo: "agent", id: `agente-interno:${persona}`, viaUserId: persona, interno: true })).toBe(persona);
    expect(idAutor({ tipo: "agent", id: "oauth:claude", viaUserId: persona, interno: true })).toBe(persona);
  });
  it("el sistema no tiene autor", () => {
    expect(idAutor({ tipo: "system" })).toBeNull();
  });
});
