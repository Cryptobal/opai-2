import { ESTILOS } from "./estilos";
import { PUENTE } from "./puente";

/** Vista de ficha de cuenta dentro de Claude (CAR-287, parte 2). */
export const URI_FICHA_CUENTA = "ui://opai/ficha-cuenta.html";

const ETIQUETA_ESTADO: Record<string, string> = {
  prospecto: "Prospecto",
  cliente_activo: "Cliente activo",
  cliente_inactivo: "Cliente inactivo",
};

const SCRIPT = `
const ETIQUETA_ESTADO = ${JSON.stringify(ETIQUETA_ESTADO)};
const ficha = document.getElementById("ficha");
const estado = document.getElementById("estado");
const abrir = document.getElementById("abrir");
function pintar(resultado) {
  const r = datosDe(resultado);
  ficha.replaceChildren();
  if (!r.ok || !r.data || !r.data.id) {
    estado.textContent = "No pudimos leer la cuenta. Vuelve a intentarlo.";
    abrir.hidden = true;
    return informarTamano();
  }
  const c = r.data;
  estado.textContent = "";
  abrir.hidden = false;
  abrir.onclick = () => abrirOpai("/cuentas/" + c.id);
  const titulo = document.createElement("h2");
  titulo.className = "titulo";
  titulo.textContent = c.nombre || "Cuenta";
  const dl = document.createElement("dl");
  dl.className = "datos";
  const fila = (etq, val) => {
    if (!val) return;
    const dt = document.createElement("dt");
    dt.textContent = etq;
    const dd = document.createElement("dd");
    dd.textContent = val;
    dl.append(dt, dd);
  };
  fila("Estado", ETIQUETA_ESTADO[c.estado] || c.estado);
  fila("RUT", c.rut);
  fila("Giro", c.giro);
  fila("Comuna", c.comuna);
  const nRep = (c.representantes && c.representantes.length) || 0;
  const nCon = (c.contactos && c.contactos.length) || 0;
  const nIns = (c.instalaciones && c.instalaciones.length) || 0;
  fila("Resumen", [nRep + " representantes", nCon + " contactos", nIns + " instalaciones"].join(" · "));
  ficha.append(titulo, dl);
  informarTamano();
}
function abrirOpai(path) {
  let url;
  try {
    url = new URL(path, BASE);
  } catch {
    url = null;
  }
  if (!url || url.origin !== new URL(BASE).origin) {
    estado.textContent = "No pudimos abrir la cuenta.";
    return;
  }
  pedir("ui/open-link", { url: url.toString() }).catch(() => {
    estado.textContent = "No pudimos abrir OPAI. Ábrelo desde el navegador.";
  });
}
oyentes["ui/notifications/tool-result"] = pintar;
oyentes["ui/notifications/tool-cancelled"] = () => {
  estado.textContent = "Se canceló la consulta.";
  abrir.hidden = true;
};
iniciar(() => {
  estado.textContent = "No pudimos conectar con Claude. Vuelve a abrir la vista.";
});
`;

const ESTILOS_FICHA = `
.ficha { margin-top: 8px; }
.ficha .titulo { font-size: var(--font-heading-sm-size, 17px); margin: 0 0 8px; font-weight: var(--font-weight-semibold, 600); }
.datos { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: var(--font-text-sm-size, 13px); }
.datos dt { color: var(--color-text-secondary, GrayText); margin: 0; }
.datos dd { margin: 0; }
#abrir { width: 100%; margin-top: 12px; }
`;

export function htmlFichaCuenta(base: string): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cuenta · OPAI</title><style>${ESTILOS}${ESTILOS_FICHA}</style></head>
<body>
<h1>Cuenta</h1>
<p id="estado" class="sub" role="status">Cargando…</p>
<div id="ficha" class="ficha" aria-live="polite"></div>
<button type="button" id="abrir" hidden>Abrir en OPAI</button>
<div class="pie"><span class="sub">OPAI</span></div>
<script>const BASE = ${JSON.stringify(base)};${PUENTE}${SCRIPT}</script>
</body></html>`;
}