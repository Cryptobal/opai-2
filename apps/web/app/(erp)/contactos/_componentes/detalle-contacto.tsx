import { PERMISOS_CORE } from "@opai/domain";

import { identidadActual } from "@/lib/servidor";
import { puedeDeIdentidad } from "@/lib/permisos-ui";

import type { cargarContacto } from "./datos";
import { FichaContacto } from "./ficha-contacto";

/** Panel derecho de un contacto: carga sus datos dentro de su Suspense. */
export async function DetalleContacto({ datos }: { datos: ReturnType<typeof cargarContacto> }) {
  const [ficha, identidad] = await Promise.all([datos, identidadActual()]);
  const gestionar = identidad ? puedeDeIdentidad(identidad)(PERMISOS_CORE.cuentasManage) : false;
  return <FichaContacto state={ficha.state} contacto={ficha.contacto} gestionar={gestionar} />;
}
