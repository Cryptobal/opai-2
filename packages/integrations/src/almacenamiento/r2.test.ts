import { afterEach, describe, expect, it, vi } from "vitest";

import { almacenamientoDelEntorno, almacenamientoR2 } from "./r2";

const config = {
  accountId: "acc",
  accessKeyId: "AK",
  secretAccessKey: "SK",
  bucket: "opai-2-test",
};

describe("almacenamiento R2", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("firma URLs de subida y descarga con vencimiento y sin exponer la clave secreta", async () => {
    const r2 = almacenamientoR2(config);
    const subida = new URL(await r2.urlSubida("t/1/d/2/v1/contrato.pdf", "application/pdf"));
    expect(subida.host).toBe("acc.r2.cloudflarestorage.com");
    expect(subida.pathname).toBe("/opai-2-test/t/1/d/2/v1/contrato.pdf");
    expect(subida.searchParams.get("X-Amz-Expires")).toBe("600");
    expect(subida.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
    expect(subida.toString()).not.toContain("SK");
    const bajada = new URL(await r2.urlDescarga("t/1/d/2/v1/contrato.pdf", "Contrato ñ.pdf"));
    expect(bajada.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(bajada.searchParams.get("response-content-disposition")).toContain(
      "Contrato%20%C3%B1.pdf",
    );
  });

  it("head devuelve tamaño y tipo, o null si no existe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (req: Request) =>
        req.url.includes("existe")
          ? new Response(null, {
              status: 200,
              headers: { "content-length": "1234", "content-type": "application/pdf" },
            })
          : new Response(null, { status: 404 }),
      ),
    );
    const r2 = almacenamientoR2(config);
    expect(await r2.head("existe.pdf")).toEqual({ tamano: 1234, mime: "application/pdf" });
    expect(await r2.head("no.pdf")).toBeNull();
  });

  it("sin credenciales, falla con un mensaje claro", async () => {
    const a = almacenamientoDelEntorno({});
    expect(a.disponible).toBe(false);
    await expect(a.urlSubida("x", "y")).rejects.toThrow(/no configurado/);
  });
});
