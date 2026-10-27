import { afterEach, describe, expect, it, vi } from "vitest";

import { imagenMarcaPrevia } from "@/lib/imagen-marca-previa";

const url = `https://${"a".repeat(32)}.r2.cloudflarestorage.com/bucket/logo?firma=ficticia`;
afterEach(() => vi.unstubAllGlobals());

describe("logo de vista previa servido desde el origen propio", () => {
  it("devuelve bytes, no redirige a R2, y aísla también un SVG abierto como documento", async () => {
    const fetch = vi.fn(async () => new Response("<svg/>", { headers: { "content-length": "6" } }));
    vi.stubGlobal("fetch", fetch);
    const r = await imagenMarcaPrevia(url, "image/svg+xml", 6);
    expect(r.status).toBe(200);
    expect(await r.text()).toBe("<svg/>");
    expect(r.headers.get("location")).toBeNull();
    expect(r.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(fetch).toHaveBeenCalledWith(
      new URL(url),
      expect.objectContaining({ redirect: "error", cache: "no-store" }),
    );
  });
  it("no consulta hosts arbitrarios/internos ni acepta credenciales, HTTP o imágenes enormes", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    for (const destino of [
      "http://localhost/",
      "https://example.test/",
      "https://a.r2.cloudflarestorage.com/",
      url.replace("https://", "http://"),
      url.replace("https://", "https://usuario:clave@"),
    ])
      expect((await imagenMarcaPrevia(destino, "image/png", 6)).status).toBe(404);
    expect((await imagenMarcaPrevia(url, "image/png", 10 * 1024 * 1024 + 1)).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rechaza cambios de tamaño, errores, redirecciones y MIME que no sea imagen", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("más bytes")),
    );
    expect((await imagenMarcaPrevia(url, "image/png", 2)).status).toBe(404);
    expect((await imagenMarcaPrevia(url, "text/html", 2)).status).toBe(404);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("Redirección o red no disponible");
      }),
    );
    expect((await imagenMarcaPrevia(url, "image/png", 2)).status).toBe(404);
  });
});
