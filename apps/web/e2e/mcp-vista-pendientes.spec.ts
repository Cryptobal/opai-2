import { expect, test } from "@playwright/test";

import { htmlPendientes } from "../lib/mcp-vistas/pendientes";
import { capturar } from "./preview";

// CAR-287: la vista «Pendientes» dentro de un cliente MCP Apps simulado (como Claude): se inicia con
// `ui/initialize`, dibuja el resultado de la herramienta, pide «Actualizar» por `tools/call` y abre
// cada pendiente en OPAI con `ui/open-link`. Datos ficticios; no toca la base.
const RESULTADO = (titulo: string) => ({
  content: [
    {
      type: "text",
      text: JSON.stringify({
        ok: true,
        data: [
          {
            tipo: "aprobaciones",
            titulo,
            detalle: "1 de riesgo alto · la más antigua vence en 5 h",
            tono: "warning",
            href: "/configuracion/aprobaciones",
            accion: "Revisar",
          },
        ],
      }),
    },
  ],
});

const HOST = (vista: string, resultado: object, actualizado: object) => `<!doctype html><html><body>
<iframe id="v" title="vista" style="width:100%;height:600px;border:0"></iframe>
<script>
const v = document.getElementById("v");
window.registro = [];
window.addEventListener("message", (e) => {
  const m = e.data; if (!m || m.jsonrpc !== "2.0") return;
  window.registro.push(m.method || "respuesta");
  const responder = (result) => v.contentWindow.postMessage({ jsonrpc: "2.0", id: m.id, result }, "*");
  if (m.method === "ui/initialize")
    responder({ protocolVersion: "2026-01-26", hostInfo: { name: "prueba", version: "1" }, hostCapabilities: {},
      hostContext: { theme: "light" } });
  if (m.method === "ui/notifications/initialized")
    v.contentWindow.postMessage({ jsonrpc: "2.0", method: "ui/notifications/tool-result", params: ${JSON.stringify(resultado)} }, "*");
  if (m.method === "tools/call") { window.llamada = m.params; responder(${JSON.stringify(actualizado)}); }
  if (m.method === "ui/open-link") { window.enlace = m.params.url; responder({}); }
});
v.srcdoc = ${JSON.stringify(vista).replaceAll("</", "<\\/")};
</script></body></html>`;

test("@preview vista de pendientes de OPAI dentro de un cliente MCP Apps", async ({
  page,
}, info) => {
  const errores: string[] = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.setContent(
    HOST(
      htmlPendientes("https://test.opai.cl"),
      RESULTADO("2 aprobaciones de agentes"),
      RESULTADO("3 aprobaciones de agentes"),
    ),
  );
  const vista = page.frameLocator("#v");
  await expect(vista.getByText("2 aprobaciones de agentes")).toBeVisible();
  await capturar(page, info, "mcp-vista-pendientes");
  await vista.getByRole("button", { name: "Actualizar" }).click();
  await expect(vista.getByText("3 aprobaciones de agentes")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { llamada: unknown }).llamada)).toEqual({
    name: "core_inicio_pendientes",
    arguments: {},
  });
  await vista.getByRole("button", { name: "Revisar en OPAI" }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { enlace?: string }).enlace))
    .toBe("https://test.opai.cl/configuracion/aprobaciones");
  expect(errores).toEqual([]);
});
