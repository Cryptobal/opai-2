import { afterEach, describe, expect, it, vi } from "vitest";

import { logoDeMarca } from "../src/finanzas/ventas-pdf-logo";
import type { Contexto } from "../src/types";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

function ctxFalso(perfil: { logoPrincipalId: string | null } | null, tipoCodigo = "marca.logo_principal"): Contexto {
  return {
    tenantId: "t-ficticio",
    db: {
      perfilEmpresa: { findUnique: async () => perfil },
      documento: { findFirst: async () => ({ estado: "disponible", mime: "image/png", tamano: 7, tipoId: "tipo", storageKey: "k", nombre: "logo.png" }) },
      documentoTipo: { findFirst: async () => ({ codigo: tipoCodigo }) },
    },
    servicios: { almacenamiento: { disponible: true, urlDescarga: async () => "https://almacen.invalid/logo.png" } },
  } as unknown as Contexto;
}

afterEach(() => vi.unstubAllGlobals());

describe("logo de la marca para el PDF del DTE (CAR-259)", () => {
  it("sin logo cargado devuelve null y el PDF sigue con la razón social", async () => {
    expect(await logoDeMarca(ctxFalso(null))).toBeNull();
    expect(await logoDeMarca(ctxFalso({ logoPrincipalId: null }))).toBeNull();
  });
  it("lee el logo principal del tenant (PNG) desde el almacenamiento", async () => {
    vi.stubGlobal("fetch", async () => new Response(PNG));
    expect(await logoDeMarca(ctxFalso({ logoPrincipalId: "d1" }))).toEqual({ bytes: PNG, formato: "png" });
  });
  it("un documento que no es de marca, o una descarga fallida, no rompen nada", async () => {
    vi.stubGlobal("fetch", async () => new Response(PNG));
    expect(await logoDeMarca(ctxFalso({ logoPrincipalId: "d1" }, "contrato"))).toBeNull();
    vi.stubGlobal("fetch", async () => new Response("no", { status: 500 }));
    expect(await logoDeMarca(ctxFalso({ logoPrincipalId: "d1" }))).toBeNull();
  });
});
