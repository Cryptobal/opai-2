import type { cargarAccionesAgente, cargarSolicitud } from "./datos";
import { FichaSolicitud } from "./ficha-solicitud";

/** Panel derecho de una solicitud: carga sus datos dentro de su Suspense. */
export async function DetalleSolicitud({
  datos,
  accionesAgente,
  gestiona,
}: {
  datos: ReturnType<typeof cargarSolicitud>;
  accionesAgente: ReturnType<typeof cargarAccionesAgente>;
  gestiona: boolean;
}) {
  const [{ state, ficha }, acciones] = await Promise.all([datos, accionesAgente]);
  return (
    <FichaSolicitud state={state} ficha={ficha} accionesAgente={acciones} gestiona={gestiona} />
  );
}
