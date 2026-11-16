import { expect, test } from "@playwright/test";

import { capturar } from "./preview";

// CAR-446: el hilo del agente muestra markdown, enlaces internos y tarjetas «Abrir».
// Datos ficticios en HTML estático (mismo patrón que mcp-vista-pendientes); sin LLM ni Gard.
const MUESTRA = `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{margin:0;font:16px/1.45 system-ui,sans-serif;background:#f4f4f5;color:#18181b}
  .panel{max-width:28rem;margin:1.5rem auto;padding:1rem;background:#fff;border:1px solid #e4e4e7;border-radius:12px}
  .msg{padding:.75rem;border-radius:8px;background:#fafafa}
  a{color:#2563eb} ul{margin:.5rem 0;padding-left:1.25rem}
  .card{margin-top:.75rem;border:1px solid #e4e4e7;border-radius:8px;padding:.75rem;display:flex;gap:.5rem;align-items:center}
  .card .meta{flex:1;min-width:0} .card .t{font-weight:600} .card .d{font-size:.875rem;color:#71717a}
  .btn{border:1px solid #d4d4d8;border-radius:6px;padding:.35rem .75rem;background:#fff;text-decoration:none;color:#18181b;font-size:.875rem}
</style></head><body><main class="panel" aria-label="Hilo del agente">
  <div class="msg">
    <p>La cuenta <a href="/cuentas/11111111-1111-1111-1111-111111111111">Acme SpA</a> tiene:</p>
    <ul><li><a href="/cotizaciones/22222222-2222-2222-2222-222222222222">Cotización 12</a></li>
    <li><a href="/cotizaciones/33333333-3333-3333-3333-333333333333">Cotización 15</a></li></ul>
    <p><strong>Resumen</strong> de lo pedido.</p>
    <div class="card">
      <div class="meta"><div class="t">Acme SpA</div><div class="d">Cliente activo</div></div>
      <a class="btn" href="/cuentas/11111111-1111-1111-1111-111111111111">Abrir</a>
    </div>
  </div>
</main></body></html>`;

test.describe("@preview agente: enlaces y tarjetas en la respuesta", () => {
  test("muestra lista con enlaces y tarjeta Abrir", async ({ page }, info) => {
    await page.setContent(MUESTRA);
    await expect(page.getByRole("link", { name: "Cotización 12" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir" })).toBeVisible();
    await expect(page.getByText("Acme SpA").first()).toBeVisible();
    await expect(page.locator('a[href^="http"]')).toHaveCount(0);
    await capturar(page, info, "agente-respuesta-enlaces");
  });
});
