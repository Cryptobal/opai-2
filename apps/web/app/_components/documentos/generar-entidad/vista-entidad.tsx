import type { VistaRellenoEntidad } from "./tipos";
import { VistaGenerar } from "./vista-generar";

/** Vista previa del documento con los datos de la cuenta o la instalación. */
export function VistaEntidad({
  vista,
  fichaHref,
  documentosHref,
}: {
  vista: VistaRellenoEntidad;
  fichaHref: string;
  documentosHref: string;
}) {
  return <VistaGenerar vista={vista} fichaHref={fichaHref} documentosHref={documentosHref} />;
}
