import { PERMISOS_CORE } from "@opai/domain";

import { identidadActual } from "@/lib/servidor";
import { puedeDeIdentidad } from "@/lib/permisos-ui";

import type { cargarContacto } from "./datos";
import { HojaFusionarContacto } from "./diferidas";
import { FichaContacto } from "./ficha-contacto";

/** Panel derecho de un contacto: carga sus datos dentro de su Suspense. */
export async function DetalleContacto({
  datos,
  tipo,
  q,
}: {
  datos: ReturnType<typeof cargarContacto>;
  tipo?: string | undefined;
  q?: string | undefined;
}) {
  const [ficha, identidad] = await Promise.all([datos, identidadActual()]);
  const gestionar = identidad ? puedeDeIdentidad(identidad)(PERMISOS_CORE.cuentasManage) : false;
  const c = ficha.contacto;
  return (
    <>
      <FichaContacto state={ficha.state} contacto={c} gestionar={gestionar} tipo={tipo} q={q} />
      {c && gestionar ? (
        <HojaFusionarContacto contacto={{ id: c.id, nombre: `${c.nombres} ${c.apellidos}`.trim() }} />
      ) : null}
    </>
  );
}
