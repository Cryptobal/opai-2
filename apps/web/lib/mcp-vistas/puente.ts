/**
 * Puente mínimo de una vista MCP App (CAR-287, spec MCP Apps 2026-01-26): JSON-RPC 2.0 por
 * `postMessage` con el cliente (Claude). La vista no llama a OPAI directo: pide herramientas al
 * cliente (`tools/call`), que las ejecuta con la persona conectada. Texto de script, sin dependencias.
 */
export const PUENTE = String.raw`
const esperando = new Map();
let siguiente = 0;
const enviar = (m) => window.parent.postMessage(m, "*");
const pedir = (method, params) =>
  new Promise((ok, mal) => {
    const id = ++siguiente;
    esperando.set(id, { ok, mal });
    enviar({ jsonrpc: "2.0", id, method, params });
  });
const avisar = (method, params) => enviar({ jsonrpc: "2.0", method, params });
const oyentes = {};
window.addEventListener("message", (e) => {
  if (e.source !== window.parent) return;
  const m = e.data;
  if (!m || m.jsonrpc !== "2.0") return;
  if (m.id !== undefined && !m.method) {
    const p = esperando.get(m.id);
    if (!p) return;
    esperando.delete(m.id);
    return m.error ? p.mal(m.error) : p.ok(m.result);
  }
  if (m.method === "ui/resource-teardown" && m.id !== undefined)
    return enviar({ jsonrpc: "2.0", id: m.id, result: {} });
  const f = oyentes[m.method];
  if (f) f(m.params || {});
});
function aplicarContexto(c) {
  if (!c) return;
  const raiz = document.documentElement;
  if (c.theme) raiz.dataset.tema = c.theme;
  const vars = (c.styles && c.styles.variables) || {};
  for (const k of Object.keys(vars)) if (vars[k]) raiz.style.setProperty(k, vars[k]);
}
oyentes["ui/notifications/host-context-changed"] = aplicarContexto;
function informarTamano() {
  avisar("ui/notifications/size-changed", { height: document.documentElement.scrollHeight });
}
new ResizeObserver(informarTamano).observe(document.body);
async function iniciar() {
  const r = await pedir("ui/initialize", {
    appInfo: { name: "OPAI", version: "1" },
    appCapabilities: {},
    protocolVersion: "2026-01-26",
  });
  aplicarContexto(r && r.hostContext);
  avisar("ui/notifications/initialized", {});
}
/** Datos de una respuesta de herramienta de OPAI: { ok, data } en el primer bloque de texto. */
function datosDe(resultado) {
  const t = resultado && resultado.content && resultado.content.find((c) => c.type === "text");
  try {
    const r = JSON.parse(t ? t.text : "{}");
    return r && r.ok ? { ok: true, data: r.data } : { ok: false, error: r && r.error };
  } catch {
    return { ok: false };
  }
}
`;
