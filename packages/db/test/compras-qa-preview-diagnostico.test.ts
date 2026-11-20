import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../src/generated/prisma/client";

import { diagnosticoComprasQa, enEtapaComprasQa } from "../scripts/compras-qa-preview-error";
import { ejecutarComprasQaPreview } from "../scripts/compras-qa-preview-ejecutar";
import { validarDestinoPreview } from "../scripts/compras-qa-preview-validar";
import { metadataPreviewQa } from "./compras-qa-preview-fixture";

vi.mock("../scripts/compras-qa-escribir", () => ({ escribirComprasQa: vi.fn() }));

describe("diagnóstico por etapa y metadata acotada", () => {
  it("consulta solo la rama aunque una lista global truncada no contenga su compute", async () => {
    const m = metadataPreviewQa();
    const ajenos = Array.from({ length: 100 }, (_, i) => ({
      ...m.endpoints.endpoints[0]!,
      id: `ep-ajeno-${i}`,
      branch_id: `br-ajena-${i}`,
    }));
    expect(() => validarDestinoPreview(m.env, m.branch, { endpoints: ajenos })).toThrow();
    const conectar = vi.fn(() => ({ $disconnect: vi.fn() }) as unknown as PrismaClient);
    const urls: string[] = [];
    const http = vi.fn(async (url: string) => {
      urls.push(url);
      const scoped = `/branches/${m.env.PREVIEW_BRANCH_ID}/endpoints`;
      return {
        ok: true,
        redirected: false,
        url,
        json: async () =>
          url.endsWith(scoped)
            ? m.endpoints
            : url.endsWith("/endpoints")
              ? { endpoints: ajenos }
              : m.branch,
      } as Response;
    });
    await ejecutarComprasQaPreview(m.env, m.evento, {
      fetch: http as unknown as typeof fetch,
      conectar,
    });
    expect(conectar).toHaveBeenCalledOnce();
    expect(urls).toEqual([
      `https://console.neon.tech/api/v2/projects/${m.env.NEON_PROJECT_ID}/branches/${m.env.PREVIEW_BRANCH_ID}`,
      `https://console.neon.tech/api/v2/projects/${m.env.NEON_PROJECT_ID}/branches/${m.env.PREVIEW_BRANCH_ID}/endpoints`,
    ]);
  });

  it("rechaza cualquier endpoint ajeno incluso junto al esperado", () => {
    const m = metadataPreviewQa();
    m.endpoints.endpoints.push({ ...m.endpoints.endpoints[0]!, branch_id: "br-ajena" });
    expect(() => validarDestinoPreview(m.env, m.branch, m.endpoints)).toThrow();
  });

  it.each([
    "CONTEXTO",
    "METADATA_RAMA",
    "METADATA_ENDPOINTS",
    "DESTINO",
    "CONSTRUIR_CLIENTE",
    "FIXTURE",
    "CERRAR_CLIENTE",
  ] as const)("expone solo la etapa %s, nunca el error de origen", async (etapa) => {
    const origen = "TEXTO-PRIVADO-FICTICIO-NO-DEBE-APARECER";
    try {
      await enEtapaComprasQa(etapa, () => {
        throw new Error(origen);
      });
    } catch (error) {
      expect(diagnosticoComprasQa(error)).toBe(
        `Setup de compras abortado [${etapa}]. Sin reparación automática.`,
      );
      expect(String(error)).not.toContain(origen);
      expect((error as Error).cause).toBeUndefined();
    }
  });
  it("enmascara errores de inicio y JSON sin etapa conocida", () => {
    expect(diagnosticoComprasQa(new Error("TEXTO-PRIVADO-FICTICIO"))).toBe(
      "Setup de compras abortado [INICIO]. Sin reparación automática.",
    );
  });
  it("identifica fallo HTTP de endpoints sin construir cliente", async () => {
    const m = metadataPreviewQa();
    const conectar = vi.fn();
    const http = vi.fn(
      async (url: string) =>
        ({
          ok: !url.endsWith("/endpoints"),
          redirected: false,
          url,
          json: async () => m.branch,
        }) as Response,
    );
    await expect(
      ejecutarComprasQaPreview(m.env, m.evento, {
        fetch: http as unknown as typeof fetch,
        conectar,
      }),
    ).rejects.toThrow("[METADATA_ENDPOINTS]");
    expect(conectar).not.toHaveBeenCalled();
  });
});
