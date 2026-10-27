import { afterEach, describe, expect, it, vi } from "vitest";

const permitir = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/lib/rate-limit", () => ({ permitir, ipDe: () => "ficticio" }));
import { POST } from "@/app/api/csp-report/route";
import { MAX_CSP_BYTES, resumirReportes } from "@/lib/csp-reportes";
import { cabecerasConNonce } from "@/lib/nonce";
import { aislarCorreo } from "@/lib/correo-srcdoc";

afterEach(() => {
  vi.restoreAllMocks();
  permitir.mockReset().mockResolvedValue(true);
});
const req = (body: string, tipo = "application/csp-report") =>
  new Request("https://test.opai.cl/api/csp-report", {
    method: "POST",
    headers: { "content-type": tipo },
    body,
  });
const legado = {
  "csp-report": {
    "effective-directive": "img-src",
    "blocked-uri": "https://privado.example/rut?token=secreto",
    "document-uri": "https://test.opai.cl/personas/privado",
    "script-sample": "NO COPIAR",
  },
};

describe("reportes CSP públicos y acotados", () => {
  it("acepta legado y Reporting API, pero registra solo categorías, sin contenido personal", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await POST(req(JSON.stringify(legado)))).status).toBe(204);
    expect(
      (
        await POST(
          req(
            JSON.stringify([
              {
                type: "csp-violation",
                body: {
                  effectiveDirective: "script-src-elem",
                  blockedURL: "inline",
                  statusCode: 200,
                  originalPolicy: "NO COPIAR NONCE",
                  sample: "NO COPIAR",
                },
              },
            ]),
            "application/reports+json",
          ),
        )
      ).status,
    ).toBe(204);
    expect(log.mock.calls).toEqual([
      ["[csp] violaciones", [{ directiva: "img-src", destino: "externo", estado: 0 }]],
      ["[csp] violaciones", [{ directiva: "script-src-elem", destino: "inline", estado: 200 }]],
    ]);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/NO COPIAR|privado|secreto|token|rut/);
  });
  it("limita por IP y global, falla cerrado y no registra el cuerpo denegado", async () => {
    const log = vi.spyOn(console, "warn").mockImplementation(() => {});
    permitir.mockResolvedValueOnce(false);
    const r = await POST(req(JSON.stringify(legado)));
    expect(r.status).toBe(429);
    expect(r.headers.get("retry-after")).toBe("60");
    expect(log).not.toHaveBeenCalled();
    expect(permitir).toHaveBeenCalledWith("csp:ficticio", 30, 60_000, { fallarCerrado: true });
    permitir.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect((await POST(req(JSON.stringify(legado)))).status).toBe(429);
    expect(permitir).toHaveBeenCalledWith("csp:global", 300, 60_000, { fallarCerrado: true });
  });
  it("rechaza tamaño real/declarado, JSON inválido, esquema y lote excesivo", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await POST(req("x".repeat(MAX_CSP_BYTES + 1)))).status).toBe(413);
    const grande = req("{}");
    grande.headers.set("content-length", String(MAX_CSP_BYTES + 1));
    expect((await POST(grande)).status).toBe(413);
    expect((await POST(req("{"))).status).toBe(400);
    expect((await POST(req("{}"))).status).toBe(400);
    expect((await POST(req("{}", "text/plain"))).status).toBe(415);
    expect(
      (
        await POST(
          req(
            JSON.stringify(
              Array.from({ length: 11 }, () => ({
                type: "csp-violation",
                body: { effectiveDirective: "img-src" },
              })),
            ),
          ),
        )
      ).status,
    ).toBe(400);
  });
  it("clasifica destinos sin devolver la URL ni confiar en directivas libres", () => {
    for (const [uri, esperado] of [
      ["data:image/png,secreto", "data"],
      ["blob:https://test.opai.cl/id", "blob"],
      ["https://test.opai.cl/secreto", "self"],
      ["", "otro"],
    ]) {
      expect(
        resumirReportes(
          { "csp-report": { "effective-directive": "img-src", "blocked-uri": uri } },
          "https://test.opai.cl",
        ),
      ).toEqual([{ directiva: "img-src", destino: esperado, estado: 0 }]);
    }
    expect(
      resumirReportes(
        { "csp-report": { "effective-directive": "dato-personal" } },
        "https://test.opai.cl",
      ),
    ).toBeNull();
  });
});

describe("nonce y vista previa", () => {
  it("sobrescribe nonce/CSP enviados por cliente, rota por request y solo anuncia Report-Only", () => {
    const a = cabecerasConNonce(
      new Headers({ "x-opai-nonce": "falsificado", "content-security-policy": "peligrosa" }),
    );
    const b = cabecerasConNonce(new Headers());
    const nonce = a.headers.get("x-opai-nonce");
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(nonce).not.toBe(b.headers.get("x-opai-nonce"));
    expect(a.headers.get("content-security-policy-report-only")).toContain(`'nonce-${nonce}'`);
    expect(a.csp).not.toContain("'nonce-");
    expect(a.headers.has("content-security-policy")).toBe(false);
    expect(a.csp).toContain("'unsafe-inline'");
  });
  it("srcdoc conserva estilos y logo propio, nunca permite imágenes de otros hosts", () => {
    const html = aislarCorreo(
      '<!doctype html><html lang="es"><body><img src="/api/marca/prueba/logoPrincipal"></body></html>',
      "https://test.opai.cl",
    );
    expect(html).toContain("img-src https://test.opai.cl/api/marca/ data:");
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("base-uri 'none'");
    expect(html).not.toContain("https://*");
    expect(html.indexOf("Content-Security-Policy")).toBeLessThan(html.indexOf("<body>"));
    expect(() => aislarCorreo("", "javascript:alert(1)")).toThrow();
  });
});
