import type { cargarContacto } from "./datos";
import { FichaContacto } from "./ficha-contacto";

/** Panel derecho de un contacto: carga sus datos dentro de su Suspense. */
export async function DetalleContacto({ datos }: { datos: ReturnType<typeof cargarContacto> }) {
  const ficha = await datos;
  return <FichaContacto state={ficha.state} contacto={ficha.contacto} />;
}
