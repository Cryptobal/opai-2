import { EventEmitter } from "node:events";

import { describe, expect, it } from "vitest";

import { vigilarCatalogo } from "./compras-qa-catalogo";

describe("socket de catálogo de compras", () => {
  it("absorbe el error idle, conserva solo un indicador y se retira al cerrar", () => {
    const cliente = new EventEmitter();
    const vigilancia = vigilarCatalogo(cliente);
    expect(vigilancia.fallo()).toBe(false);
    cliente.emit("error", Object.assign(new Error("detalle ficticio"), { input: "entrada ficticia" }));
    expect(vigilancia.fallo()).toBe(true);
    cliente.emit("end");
    expect(cliente.listenerCount("error")).toBe(0);
    expect(cliente.listenerCount("end")).toBe(0);
  });

  it("permite retirar explícitamente el monitor cuando end() se resuelve sin evento", () => {
    const cliente = new EventEmitter();
    const vigilancia = vigilarCatalogo(cliente);
    vigilancia.retirar();
    vigilancia.retirar();
    expect(cliente.listenerCount("error")).toBe(0);
    expect(cliente.listenerCount("end")).toBe(0);
  });
});
