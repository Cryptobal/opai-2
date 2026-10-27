import { expect, type Page, test } from "@playwright/test";

import { E2E_PASSWORD as password, entrar } from "./sesion";

// Núcleo P1 (CSP y HSTS): ninguna ruta principal debe reportar una violación de CSP y toda respuesta
// debe llevar las cabeceras de seguridad. La CSP viaja en Report-Only, así que el navegador igual
// dispara `securitypolicyviolation` (disposition "report") si algo no calza: así validamos que la
// política no romperá nada al pasar a modo estricto con nonce tras el #45.

type Violacion = { directiva: string; bloqueado: string; ruta: string };

// `exposeFunction` cuelga esta función del `window` del navegador; el escucha de `addInitScript` la
// llama. Se declara aquí para no castear `window` en el init script.
declare global {
  interface Window {
    __cspViolacion?: (v: Violacion) => void;
  }
}

test.use({ actionTimeout: 30_000 });
test.setTimeout(180_000);

/** Registra el escucha de violaciones en cada documento (se re-ejecuta en cada navegación). */
async function escuchar(page: Page, violaciones: Violacion[]) {
  await page.exposeFunction("__cspViolacion", (v: Violacion) => violaciones.push(v));
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      window.__cspViolacion?.({
        directiva: e.violatedDirective,
        bloqueado: e.blockedURI,
        ruta: location.pathname,
      });
    });
  });
}

test.describe("cabeceras de seguridad (núcleo P1)", () => {
  test.skip(!password, "Falta SEED_OWNER_PASSWORD o E2E_PASSWORD");

  test("las respuestas llevan CSP, Permissions-Policy y HSTS (en producción)", async ({ page }) => {
    const resp = await page.goto("/login");
    const h = resp?.headers() ?? {};
    expect(h["content-security-policy-report-only"]).toContain("default-src 'self'");
    expect(h["content-security-policy-report-only"]).toContain(
      "report-uri /api/csp-report; report-to csp",
    );
    expect(h["reporting-endpoints"]).toBe('csp="/api/csp-report"');
    expect(h["content-security-policy"]).toBeUndefined();
    expect(h["permissions-policy"]).toBe("camera=(self), geolocation=(self), microphone=()");
    expect(h["x-frame-options"]).toBe("DENY");
    // HSTS solo en producción (los navegadores la ignoran sobre HTTP). Si está, debe ser exacta y sin
    // includeSubDomains/preload; no hay inventario HTTPS verificado de todos los subdominios.
    const hsts = h["strict-transport-security"];
    if (hsts) expect(hsts).toBe("max-age=63072000");
  });

  test("ninguna ruta principal reporta violaciones de CSP", async ({ page }) => {
    const violaciones: Violacion[] = [];
    await escuchar(page, violaciones);
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await entrar(page);
    // /ds solo existe fuera de producción; en un build de producción responde 404 (sin violaciones).
    for (const ruta of ["/", "/supervisor", "/ds"]) {
      await page.goto(ruta);
      await page.waitForLoadState("networkidle");
    }
    expect(violaciones, JSON.stringify(violaciones, null, 2)).toEqual([]);
  });

  test("nonce de tema/SW coincide entre scripts, rota y no acepta el enviado por cliente", async ({
    page,
  }) => {
    await page.setExtraHTTPHeaders({ "x-opai-nonce": "falsificado" });
    const nonces: string[] = [];
    for (let n = 0; n < 2; n++) {
      const r = await page.goto("/login");
      const nonce = await page
        .locator("#opai-tema")
        .evaluate((s) => (s as HTMLScriptElement).nonce);
      const sw = await page
        .locator("#opai-registro-sw")
        .evaluate((s) => (s as HTMLScriptElement).nonce);
      expect(nonce).toBeTruthy();
      expect(nonce).not.toBe("falsificado");
      expect(sw).toBe(nonce);
      // PPR conserva scripts estáticos sin nonce: no se anuncia una CSP estricta que aún no cumple.
      expect(r?.headers()["content-security-policy-report-only"]).toContain("'unsafe-inline'");
      expect(r?.headers()["content-security-policy"]).toBeUndefined();
      nonces.push(nonce ?? "");
    }
    expect(nonces[0]).not.toBe(nonces[1]);
  });

  test("el endpoint propio acepta reportes sin autenticar y limita el cuerpo", async ({
    request,
  }) => {
    const r = await request.post("/api/csp-report", {
      headers: { "content-type": "application/csp-report" },
      data: { "csp-report": { "effective-directive": "img-src", "blocked-uri": "inline" } },
    });
    expect(r.status()).toBe(204);
    const grande = await request.post("/api/csp-report", {
      headers: { "content-type": "application/csp-report" },
      data: "x".repeat(16_385),
    });
    expect(grande.status()).toBe(413);
  });
});
