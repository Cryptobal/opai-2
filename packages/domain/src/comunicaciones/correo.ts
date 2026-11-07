import { escaparHtml, renderizar } from "../plantillas";
import type { EventoComunicable, PlantillaBase } from "./tipos";

/** Marca del tenant para el correo (ADR-028). Colores como dato del perfil, nunca en código. */
export type MarcaCorreo = {
  nombre: string;
  logoUrl?: string | null;
  colorPrimario?: string | null;
  pieLegal?: string | null;
};

const COLOR = /^#[0-9a-fA-F]{6}$/;

/** Texto plano → HTML seguro: escapa, enlaza URLs y respeta párrafos y saltos. */
export function textoAHtml(texto: string): string {
  return texto
    .split(/\n{2,}/)
    .map((p) =>
      escaparHtml(p)
        .replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}">${u}</a>`)
        .replace(/\n/g, "<br>"),
    )
    .map((p) => `<p style="margin:0 0 16px">${p}</p>`)
    .join("");
}

/** Layout mínimo del núcleo: logo, contenido y pie legal; acento con el color de la marca. */
export function layoutCorreo(marca: MarcaCorreo, cuerpoHtml: string): string {
  const acento =
    marca.colorPrimario && COLOR.test(marca.colorPrimario) ? marca.colorPrimario : null;
  const borde = acento ? `border-top:4px solid ${acento};` : "";
  const logo = marca.logoUrl
    ? `<img src="${escaparHtml(marca.logoUrl)}" alt="${escaparHtml(marca.nombre)}" height="32" style="display:block;margin:0 0 24px">`
    : `<p style="margin:0 0 24px;font-weight:600">${escaparHtml(marca.nombre)}</p>`;
  const pie = marca.pieLegal
    ? `<p style="margin:24px 0 0;font-size:12px;opacity:.7">${escaparHtml(marca.pieLegal)}</p>`
    : "";
  return `<!doctype html><html lang="es"><body style="margin:0;padding:24px;font-family:system-ui,sans-serif;line-height:1.5"><div style="max-width:560px;margin:0 auto;padding:24px;${borde}">${logo}${cuerpoHtml}${pie}</div></body></html>`;
}

/** Renderiza asunto, texto y HTML de un correo con las variables del evento. */
export function renderizarCorreo(
  e: EventoComunicable,
  plantilla: PlantillaBase,
  datos: Record<string, unknown>,
  marca: MarcaCorreo,
) {
  const rutas = e.variables.map((v) => v.ruta);
  const asunto = renderizar(plantilla.asunto, datos, rutas);
  // Una variable vacía (p. ej. un mensaje no escrito) no deja párrafos en blanco de más.
  const texto = renderizar(plantilla.cuerpo, datos, rutas).replace(/\n{3,}/g, "\n\n");
  return { asunto, texto, html: layoutCorreo(marca, textoAHtml(texto)) };
}
