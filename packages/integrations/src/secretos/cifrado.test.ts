import { describe, expect, it } from "vitest";

import { cifrar, descifrar, enmascarar, generarDek, kekDelEntorno, sufijoDe } from "./cifrado";

describe("cifrado de secretos (envelope AES-256-GCM)", () => {
  it("ida y vuelta: KEK cifra la DEK y la DEK cifra el secreto", () => {
    const kek = generarDek();
    const dek = generarDek();
    const dekCifrada = cifrar(kek, dek);
    const secreto = cifrar(descifrar(kek, dekCifrada), Buffer.from("re_123456789"));
    expect(descifrar(dek, secreto).toString()).toBe("re_123456789");
  });

  it("un tag o un cifrado alterado no se descifra", () => {
    const k = generarDek();
    const s = cifrar(k, Buffer.from("x"));
    expect(() => descifrar(k, { ...s, tag: Buffer.alloc(16) })).toThrow();
    expect(() => descifrar(generarDek(), s)).toThrow();
  });

  it("lee la KEK del entorno y rechaza largos inválidos", () => {
    const k = generarDek().toString("base64");
    expect(kekDelEntorno({ OPAI_SECRETS_KEY: k }).actual?.length).toBe(32);
    expect(kekDelEntorno({}).actual).toBeNull();
    expect(() => kekDelEntorno({ OPAI_SECRETS_KEY: "corta" })).toThrow();
  });

  it("enmascara mostrando solo los últimos 4", () => {
    expect(enmascarar(sufijoDe("re_abcdefgh1234"))).toBe("••••••••1234");
  });
});
