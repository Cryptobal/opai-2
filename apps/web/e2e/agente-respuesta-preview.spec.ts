import { expect, test } from "@playwright/test";

import { capturar } from "./preview";

// CAR-523: lista corta / pedido de tarjetas → fichas con título, estado, datos y Abrir.
const MUESTRA_FICHAS = `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{margin:0;font:16px/1.45 system-ui,sans-serif;background:#f4f4f5;color:#18181b}
  .panel{max-width:28rem;margin:1.5rem auto;padding:1rem;background:#fff;border:1px solid #e4e4e7;border-radius:12px}
  .msg{padding:.75rem;border-radius:8px;background:#fafafa}
  a{color:#2563eb}
  .card{margin-top:.75rem;border:1px solid #e4e4e7;border-radius:12px;padding:.75rem}
  .card .row{display:flex;gap:.5rem;align-items:flex-start}
  .card .meta{flex:1;min-width:0} .card .t{font-weight:600} .card .d{font-size:.875rem;color:#71717a;margin:0}
  .badge{display:inline-block;font-size:.75rem;padding:.1rem .5rem;border-radius:999px;background:#f4f4f5;color:#52525b}
  .btn{border:1px solid #d4d4d8;border-radius:6px;padding:.35rem .75rem;background:#fff;text-decoration:none;color:#18181b;font-size:.875rem;flex-shrink:0}
  .respaldo{margin-top:.75rem;font-size:.875rem;color:#3f3f46}
</style></head><body><main class="panel" aria-label="Hilo del agente">
  <div class="msg">
    <div class="card">
      <div class="row">
        <div class="meta">
          <div class="t">Acme SpA</div>
          <span class="badge">activa</span>
          <p class="d">76.123.456-7</p>
          <p class="d">Cliente</p>
        </div>
        <a class="btn" href="/cuentas/11111111-1111-1111-1111-111111111111">Abrir</a>
      </div>
    </div>
    <div class="card">
      <div class="row">
        <div class="meta">
          <div class="t">Beta Ltda</div>
          <span class="badge">activa</span>
          <p class="d">76.999.888-1</p>
        </div>
        <a class="btn" href="/cuentas/22222222-2222-2222-2222-222222222222">Abrir</a>
      </div>
    </div>
    <p class="respaldo">Aquí tienes 2 cuentas.</p>
  </div>
</main></body></html>`;

// Fixture de main (CAR-446 / CAR-525): enlaces y tabla en respuesta del agente.
const MUESTRA_TABLA = `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{margin:0;font:16px/1.45 system-ui,sans-serif;background:#f4f4f5;color:#18181b}
  .panel{max-width:28rem;margin:1.5rem auto;padding:1rem;background:#fff;border:1px solid #e4e4e7;border-radius:12px}
  .msg{padding:.75rem;border-radius:8px;background:#fafafa}
  a{color:#2563eb} ul{margin:.5rem 0;padding-left:1.25rem}
  table{width:100%;border-collapse:collapse;margin:.5rem 0;font-size:.875rem}
  th,td{border-bottom:1px solid #e4e4e7;padding:.4rem .5rem;text-align:left}
  .card{margin-top:.75rem;border:1px solid #e4e4e7;border-radius:8px;padding:.75rem;display:flex;gap:.5rem;align-items:center}
  .card .meta{flex:1;min-width:0} .card .t{font-weight:600} .card .d{font-size:.875rem;color:#71717a}
  .btn{border:1px solid #d4d4d8;border-radius:6px;padding:.35rem .75rem;background:#fff;text-decoration:none;color:#18181b;font-size:.875rem}
</style></head><body><main class="panel" aria-label="Hilo del agente">
  <div class="msg">
    <p>La cuenta <a href="/cuentas/11111111-1111-1111-1111-111111111111">Acme SpA</a> tiene:</p>
    <ul><li><a href="/cotizaciones/22222222-2222-2222-2222-222222222222">Cotización 12</a></li>
    <li><a href="/cotizaciones/33333333-3333-3333-3333-333333333333">Cotización 15</a></li></ul>
    <p><strong>Facturas de la semana pasada</strong> (2 al 8 de noviembre):</p>
    <table aria-label="Tabla"><thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Monto</th><th>Estado</th></tr></thead>
    <tbody><tr><td><a href="/finanzas/ventas/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa">100</a></td><td>2026-11-03</td><td>Acme SpA</td><td>$1.190.000</td><td>aceptado</td></tr>
    <tr><td><a href="/finanzas/ventas/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb">101</a></td><td>2026-11-05</td><td>Beta Ltda</td><td>$500.000</td><td>pendiente</td></tr></tbody></table>
    <p><strong>Resumen</strong> de lo pedido.</p>
  </div>
</main></body></html>`;

test.describe("@preview agente: fichas en la respuesta", () => {
  test("muestra fichas con estado, datos y Abrir; sin viñetas", async ({ page }, info) => {
    await page.setContent(MUESTRA_FICHAS);
    await expect(page.getByText("Acme SpA")).toBeVisible();
    await expect(page.getByText("activa").first()).toBeVisible();
    await expect(page.getByText("76.123.456-7")).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir" }).first()).toBeVisible();
    await expect(page.locator("ul")).toHaveCount(0);
    await expect(page.locator('a[href^="http"]')).toHaveCount(0);
    await capturar(page, info, "agente-respuesta-fichas");
  });
});

test.describe("@preview agente: enlaces y tabla en la respuesta", () => {
  test("muestra lista con enlaces y tabla de facturas", async ({ page }, info) => {
    await page.setContent(MUESTRA_TABLA);
    await expect(page.getByRole("link", { name: "Cotización 12" })).toBeVisible();
    await expect(page.getByText("Acme SpA").first()).toBeVisible();
    await expect(page.getByRole("table", { name: "Tabla" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "100" })).toBeVisible();
    await expect(page.getByText("semana pasada")).toBeVisible();
    await expect(page.locator('a[href^="http"]')).toHaveCount(0);
    await capturar(page, info, "agente-respuesta-tabla");
  });
});