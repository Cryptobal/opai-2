import { Badge, Estado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { FormMarcaDocumento } from "./form-marca-documento";
import { FormPlantillaDocumento } from "./form-plantilla-documento";

async function cargarMarca() {
  const r = await ejecutarComoUsuario<{
    version: number;
    tipografia: string;
    piePagina: string | null;
    condicionesDefault: string | null;
  }>("erp", "cpq.marca_documento.get", {});
  return r.ok ? r.data : null;
}

async function cargarPlantilla() {
  const r = await ejecutarComoUsuario<{
    version: number;
    base: string;
    bloques: { id: string; activo: boolean }[];
    basesDisponibles: string[];
  }>("erp", "cpq.plantillas_documento.get", {});
  return r.ok ? r.data : null;
}

/** Marca documental CPQ y plantilla de cotización (CAR-135 addendum). Logos/colores en /configuracion/marca. */
export async function SeccionMarcaPlantillasCpq() {
  const [marca, plantilla] = await Promise.all([cargarMarca(), cargarPlantilla()]);
  const state = marca && plantilla ? ("ready" as const) : ("error" as const);
  return (
    <Estado state={state} variante="formulario">
      {marca && plantilla ? (
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <p className="t-label">Marca en documentos</p>
            <p className="t-caption text-fg-muted">
              Logo y colores en{" "}
              <LinkNext href="/configuracion/marca" className="text-accent">
                Configuración › Marca
              </LinkNext>
              . Aquí defines tipografía, pie y condiciones por defecto de las cotizaciones PDF.
            </p>
            <Badge tono="info">Versión marca v{marca.version}</Badge>
          </div>
          <FormMarcaDocumento marca={marca} />
          <div className="space-y-2 border-t border-border pt-6">
            <p className="t-label">Plantilla de cotización</p>
            <p className="t-caption text-fg-muted">
              Elige una base sobria y activa bloques; el diseño aprobado se aplicará sobre este layout
              sin rehacer la lógica.
            </p>
            <Badge tono="info">Versión plantilla v{plantilla.version}</Badge>
          </div>
          <FormPlantillaDocumento plantilla={plantilla} />
        </div>
      ) : null}
    </Estado>
  );
}
