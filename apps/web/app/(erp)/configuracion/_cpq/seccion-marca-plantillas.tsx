import { Badge, Estado } from "@opai/ds";

import { BotonCopiar } from "@/app/_components/boton-copiar";
import { LinkNext } from "@/app/_components/link-next";
import type { BloquePlantilla } from "@/lib/cpq-bloques-propuesta";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { FormPlantillaDocumentoDiferido } from "./form-plantilla-documento-diferido";
import { FormPlantillaPropuestaDiferido } from "./form-plantilla-propuesta-diferido";
import { SeccionPlantillasHtml } from "./seccion-plantillas-html";
import { SeccionTextosTipo } from "./seccion-textos-tipo";

async function cargarPlantilla() {
  const r = await ejecutarComoUsuario<{
    version: number;
    base: string;
    bloques: { id: string; activo: boolean }[];
    basesDisponibles: string[];
  }>("erp", "cpq.plantillas_documento.get", {});
  return r.ok ? r.data : null;
}

async function cargarPlantillaPropuesta() {
  const r = await ejecutarComoUsuario<{
    version: number;
    base: string;
    nombreVisible: string;
    aperturaMaxima: string;
    bloques: BloquePlantilla[];
    basesDisponibles: string[];
  }>("erp", "cpq.plantillas_propuesta.get", {});
  return r.ok ? r.data : null;
}

async function cargarPrompt() {
  const r = await ejecutarComoUsuario<{ texto: string }>("erp", "cpq.propuestas_tecnica.prompt_exportable", {});
  return r.ok ? r.data.texto : null;
}

/** Marca documental CPQ y plantilla de cotización (CAR-135 addendum). Logos/colores en /configuracion/marca. */
export async function SeccionMarcaPlantillasCpq() {
  const [plantilla, plantillaPropuesta, prompt] = await Promise.all([
    cargarPlantilla(),
    cargarPlantillaPropuesta(),
    cargarPrompt(),
  ]);
  const state = plantilla && plantillaPropuesta ? ("ready" as const) : ("error" as const);
  return (
    <Estado state={state} variante="formulario">
      {plantilla && plantillaPropuesta ? (
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <p className="t-label">Marca en documentos</p>
            <p className="t-caption text-fg-muted">
              Logos, colores, tipografía, pie y condiciones en{" "}
              <LinkNext href="/configuracion/marca" className="text-accent">
                Configuración › Marca
              </LinkNext>
              . Aquí solo eliges la plantilla y los bloques del PDF.
            </p>
          </div>
          <div className="space-y-2 border-t border-border pt-6">
            <p className="t-label">Plantilla de cotización</p>
            <p className="t-caption text-fg-muted">
              Elige una base sobria y activa bloques; el diseño aprobado se aplicará sobre este layout
              sin rehacer la lógica.
            </p>
            <Badge tono="info">Versión plantilla v{plantilla.version}</Badge>
          </div>
          <FormPlantillaDocumentoDiferido plantilla={plantilla} />
          <div className="space-y-2 border-t border-border pt-6">
            <p className="t-label">Plantilla de propuesta técnica</p>
            <p className="t-caption text-fg-muted">
              Base por defecto, apertura máxima del resumen económico y bloques fijos/opcionales del armador.
            </p>
            <Badge tono="info">Versión plantilla v{plantillaPropuesta.version}</Badge>
          </div>
          <FormPlantillaPropuestaDiferido plantilla={plantillaPropuesta} />
          <SeccionTextosTipo />
          {prompt ? (
            <div className="space-y-2 border-t border-border pt-6">
              <p className="t-label">Diseño de la propuesta con IA</p>
              <p className="t-caption text-fg-muted">
                Copia el prompt y pégalo en Claude u otra IA. Lleva los colores, la tipografía y el logo de tu marca,
                y los marcadores {"{{…}}"} del catálogo. La IA te devuelve un HTML para subir como plantilla.
              </p>
              <BotonCopiar texto={prompt} etiqueta="Copiar prompt" />
            </div>
          ) : null}
          <SeccionPlantillasHtml />
        </div>
      ) : null}
    </Estado>
  );
}
