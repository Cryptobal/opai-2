import type { cargarSolicitud } from "./datos";
import { FichaSolicitud } from "./ficha-solicitud";

/** Panel derecho de una solicitud: carga sus datos dentro de su Suspense. */
export async function DetalleSolicitud({
  datos,
  gestiona,
}: {
  datos: ReturnType<typeof cargarSolicitud>;
  gestiona: boolean;
}) {
  const { state, ficha } = await datos;
  return <FichaSolicitud state={state} ficha={ficha} gestiona={gestiona} />;
}
