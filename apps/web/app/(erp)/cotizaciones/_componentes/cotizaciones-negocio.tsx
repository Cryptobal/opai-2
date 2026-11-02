import { cargarCotizaciones } from "./datos";
import { ListaCotizacionesPantalla } from "./lista-cotizaciones-pantalla";

/** La ficha ya autorizó el negocio; la lista CPQ vuelve a verificar módulo y permiso. */
export async function CotizacionesNegocio({
  id,
  abierto,
  cursor,
}: {
  id: string;
  abierto: boolean;
  cursor?: string;
}) {
  const datos = await cargarCotizaciones(cursor, id);
  return (
    <ListaCotizacionesPantalla
      datos={datos}
      negocioId={id}
      abierto={abierto}
      base={`/negocios/${id}/cotizaciones`}
    />
  );
}
