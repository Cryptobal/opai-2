import { ejecutarComoUsuario } from "@/lib/servidor";

import { type PlantillaHtmlFila, ListaPlantillasHtml } from "./lista-plantillas-html";
import { SubirPlantillaHtml } from "./subir-plantilla-html";

/** Plantillas HTML de la propuesta (CAR-532): subir y revisar, y elegir la que está en uso. */
export async function SeccionPlantillasHtml() {
  const r = await ejecutarComoUsuario<{ plantillas: PlantillaHtmlFila[] }>("erp", "cpq.propuestas_html.list", {});
  if (!r.ok) return null;
  return (
    <div className="space-y-3 border-t border-border pt-6">
      <p className="t-label">Plantillas HTML de la propuesta</p>
      <p className="t-caption text-fg-muted">
        Sube el HTML, revisa los errores y la vista previa, y elige cuál usar. Se quita todo lo que pueda ejecutar código o
        llamar a internet.
      </p>
      <SubirPlantillaHtml />
      <ListaPlantillasHtml plantillas={r.data.plantillas} />
    </div>
  );
}
