import { escaparDato, parrafo } from "./html-fragmentos";

/** Marcador que inserta las secciones activas del armador (ver `html-secciones.ts`). */
const MARCADOR_SECCIONES = "{{secciones}}";

export type MarcaBasePropuesta = {
  colorPrimario: string | null;
  colorSecundario: string | null;
  nombre: string;
  piePagina: string | null;
};

const colorHex = (c: string | null, fallback: string) =>
  c && /^#[0-9a-f]{3,8}$/i.test(c) ? c : fallback;

const filaMeta = (etiq: string, valor: string) =>
  `<div class="meta-fila"><span class="meta-etiq">${escaparDato(etiq)}</span><span class="meta-valor">${escaparDato(valor)}</span></div>`;

const iconoDoc = () =>
  '<svg class="ico" viewBox="0 0 24 24" width="32" height="32" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6 2h8l6 6v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V9h5.5"/></svg>';

/**
 * Plantilla base de OPAI (nivel agencia): portada, estilos con la marca del tenant y `{{secciones}}`.
 * Los datos críticos van como texto, no como marcadores, para que un dato ausente no impida el documento.
 */
export function htmlBasePropuesta(d: {
  titulo: string;
  negocio?: string | null;
  cliente?: string | null;
  validaHasta?: string | null;
  codigo?: string | null;
  fecha?: string | null;
  marca: MarcaBasePropuesta;
}): string {
  const prim = colorHex(d.marca.colorPrimario, "#18181b");
  const sec = colorHex(d.marca.colorSecundario, "#f4f4f5");
  const meta = [
    d.cliente ? filaMeta("Cliente", d.cliente) : "",
    d.codigo ? filaMeta("Cotización", d.codigo) : "",
    d.fecha ? filaMeta("Fecha", d.fecha) : "",
    d.validaHasta ? filaMeta("Vigencia", `Hasta el ${d.validaHasta}`) : "",
  ].join("");
  const pie = d.marca.piePagina?.trim() || d.marca.nombre;
  return [
    `<style>`,
    `:root{--marca-prim:${prim};--marca-sec:${sec}}`,
    `.portada{min-height:220mm;display:flex;flex-direction:column;justify-content:space-between;padding:24px;border:1px solid var(--marca-sec)}`,
    `.portada-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:3px solid var(--marca-prim);padding-bottom:16px}`,
    `.marca{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--marca-prim)}`,
    `.ico{color:var(--marca-prim)}`,
    `.titulo-portada{color:var(--marca-prim);margin:24px 0 8px}`,
    `.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 24px;margin-top:20px}`,
    `.meta-fila{display:flex;flex-direction:column;gap:2px}`,
    `.meta-etiq{font-size:11px;text-transform:uppercase;color:#71717a}`,
    `.meta-valor{font-size:13px;font-weight:600}`,
    `.cierre{margin-top:32px;padding:16px;border-top:2px solid var(--marca-sec);text-align:center;font-size:11px;color:#52525b}`,
  `</style>`,
    '<section class="portada" aria-label="Portada">',
    '<header class="portada-cab">',
    `<span class="marca">${escaparDato(d.marca.nombre)}</span>`,
    iconoDoc(),
    "</header>",
    `<h1 class="titulo-portada">${escaparDato(d.titulo)}</h1>`,
    d.negocio ? parrafo(d.negocio) : "",
    meta ? `<div class="meta">${meta}</div>` : "",
    '<p style="font-size:11px;color:#71717a;margin-top:24px">El logo de su empresa aparece en el encabezado de cada página del PDF.</p>',
    "</section>",
    MARCADOR_SECCIONES,
    `<footer class="cierre">${escaparDato(pie)}</footer>`,
  ].join("");
}