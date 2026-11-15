import { ESTILOS } from "./estilos";
import { PUENTE } from "./puente";

/** Vista «Pendientes» de OPAI dentro de Claude (CAR-287): lo que espera una decisión hoy. */
export const URI_PENDIENTES = "ui://opai/pendientes.html";

const SCRIPT = String.raw`
const lista = document.getElementById("lista");
const estado = document.getElementById("estado");
function pintar(resultado) {
  const r = datosDe(resultado);
  lista.replaceChildren();
  if (!r.ok) {
    estado.textContent = "No pudimos leer tus pendientes. Vuelve a intentarlo.";
    return informarTamano();
  }
  const items = Array.isArray(r.data) ? r.data : [];
  estado.textContent = items.length
    ? "Lo que espera una decisión hoy en la empresa."
    : "No tienes pendientes. Todo al día.";
  for (const p of items) {
    const li = document.createElement("li");
    li.dataset.tono = p.tono || "neutro";
    const texto = document.createElement("div");
    texto.className = "texto";
    const t = document.createElement("p");
    t.className = "titulo";
    t.textContent = p.titulo;
    const d = document.createElement("p");
    d.className = "sub";
    d.textContent = p.detalle;
    texto.append(t, d);
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = (p.accion || "Abrir") + " en OPAI";
    b.setAttribute("aria-label", (p.accion || "Abrir") + " en OPAI: " + p.titulo);
    b.addEventListener("click", () => abrir(p.href));
    li.append(texto, b);
    lista.append(li);
  }
  informarTamano();
}
/** Solo abre rutas de OPAI: nunca otro sitio ni esquemas como javascript:. */
function abrir(href) {
  let url;
  try {
    url = new URL(href, BASE);
  } catch {
    url = null;
  }
  if (!url || url.origin !== new URL(BASE).origin) {
    estado.textContent = "No pudimos abrir ese pendiente.";
    return;
  }
  pedir("ui/open-link", { url: url.toString() }).catch(() => {
    estado.textContent = "No pudimos abrir OPAI. Ábrelo desde el navegador.";
  });
}
oyentes["ui/notifications/tool-result"] = pintar;
oyentes["ui/notifications/tool-cancelled"] = () => {
  estado.textContent = "Se canceló la consulta. Usa Actualizar para intentarlo de nuevo.";
};
document.getElementById("actualizar").addEventListener("click", async () => {
  estado.textContent = "Actualizando…";
  try {
    pintar(await pedir("tools/call", { name: "core_inicio_pendientes", arguments: {} }));
  } catch {
    estado.textContent = "No pudimos actualizar. Vuelve a intentarlo.";
  }
});
iniciar(() => {
  estado.textContent = "No pudimos conectar con Claude. Vuelve a abrir la vista.";
});
`;

/** HTML autocontenido de la vista; `base` es la dirección de OPAI para abrir cada pendiente. */
export function htmlPendientes(base: string): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pendientes · OPAI</title><style>${ESTILOS}</style></head>
<body>
<h1>Pendientes</h1>
<p id="estado" class="sub" role="status">Cargando…</p>
<ul id="lista" aria-label="Pendientes"></ul>
<div class="pie"><span class="sub">OPAI</span><button type="button" id="actualizar">Actualizar</button></div>
<script>const BASE = ${JSON.stringify(base)};${PUENTE}${SCRIPT}</script>
</body></html>`;
}
