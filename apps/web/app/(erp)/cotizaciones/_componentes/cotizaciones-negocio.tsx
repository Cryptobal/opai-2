import { cargarCotizaciones } from "./datos";
import { ListaCotizaciones } from "./lista-cotizaciones";

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
    <ListaCotizaciones
      datos={datos}
      negocioId={id}
      abierto={abierto}
      base={`/negocios/${id}/cotizaciones`}
    />
  );
}
