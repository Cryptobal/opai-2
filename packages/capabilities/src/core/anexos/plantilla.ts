import { escaparHtml, layoutCorreo, type MarcaCorreo } from "@opai/domain";

const TITULO_MOTIVO: Record<string, string> = {
  capa: "capa de sueldo",
  monto: "monto de sueldo",
  instalacion: "instalación o puesto",
  rol: "rol de turno",
};

export type FilaAnexoDoc = { concepto: string; antes: string; despues: string };

export type DatosAnexoDoc = {
  persona: { nombres: string; apellidos: string; rut: string };
  motivoCambio: string;
  fecha: string;
  filas: readonly FilaAnexoDoc[];
};

/**
 * Plantilla base del sistema (R12, D15): encabezado con la marca del tenant, partes, qué cambia y
 * desde cuándo, con texto de ejemplo hasta que Carlos fije el texto legal definitivo (§16.b del
 * brief); el editor por tenant es del Brief 09. Termina en «Aprobado y guardado en Documentos», sin
 * firma (D15).
 */
export function renderizarAnexoHtml(marca: MarcaCorreo, datos: DatosAnexoDoc): string {
  const nombrePersona = `${datos.persona.nombres} ${datos.persona.apellidos}`;
  const titulo = TITULO_MOTIVO[datos.motivoCambio] ?? datos.motivoCambio;
  const filas = datos.filas
    .map(
      (f) =>
        `<tr><td style="padding:4px 12px 4px 0">${escaparHtml(f.concepto)}</td><td style="padding:4px 12px">${escaparHtml(f.antes)}</td><td style="padding:4px">${escaparHtml(f.despues)}</td></tr>`,
    )
    .join("");
  const tabla = filas
    ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px"><thead><tr style="text-align:left;border-bottom:1px solid #ccc"><th style="padding:4px 12px 4px 0">Concepto</th><th style="padding:4px 12px">Antes</th><th style="padding:4px">Después</th></tr></thead><tbody>${filas}</tbody></table>`
    : "";
  const cuerpo = `
    <h1 style="font-size:18px;margin:0 0 16px">Anexo de contrato de trabajo</h1>
    <p style="margin:0 0 8px"><strong>Empleador:</strong> ${escaparHtml(marca.nombre)}</p>
    <p style="margin:0 0 16px"><strong>Trabajador:</strong> ${escaparHtml(nombrePersona)} (RUT ${escaparHtml(datos.persona.rut)})</p>
    <p style="margin:0 0 8px">Por el presente anexo, las partes acuerdan modificar la ${escaparHtml(titulo)} del contrato de trabajo, a contar del ${escaparHtml(datos.fecha)}, en los términos que se indican a continuación.</p>
    ${tabla}
    <p style="margin:16px 0 0;font-size:12px;opacity:.7">Texto de ejemplo (D15): el texto legal definitivo de la plantilla base lo fija Carlos; el editor por tenant llega con el Brief 09.</p>
  `;
  return layoutCorreo(marca, cuerpo);
}
