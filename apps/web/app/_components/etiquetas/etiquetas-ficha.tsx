import { PERMISOS_CORE } from "@opai/domain";
import { SeccionTarjeta } from "@opai/ds";

import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { EtiquetasEditables } from "./etiquetas-editables";
import type { EntidadEtiquetable, EtiquetaFila } from "./tipos";

/** Tarjeta «Etiquetas» de una ficha de negocio, cuenta o contacto (CAR-162, segundo PR). */
export async function EtiquetasFicha(p: { tipo: EntidadEtiquetable; id: string }) {
  const identidad = await identidadActual();
  const puede = identidad ? puedeDeIdentidad(identidad) : () => false;
  if (!puede(PERMISOS_CORE.etiquetasRead)) return null;
  const gestiona = puede(PERMISOS_CORE.etiquetasManage);
  const [asignadas, catalogo] = await Promise.all([
    ejecutarComoUsuario<EtiquetaFila[]>("erp", "core.etiquetas.de_entidad", {
      entidadTipo: p.tipo,
      entidadId: p.id,
    }),
    gestiona
      ? ejecutarComoUsuario<EtiquetaFila[]>("erp", "core.etiquetas.list", {})
      : Promise.resolve(null),
  ]);
  if (!asignadas.ok) return null;
  return (
    <SeccionTarjeta titulo="Etiquetas">
      <EtiquetasEditables
        entidad={{ tipo: p.tipo, id: p.id }}
        asignadas={asignadas.data}
        catalogo={catalogo?.ok ? catalogo.data : []}
        gestiona={gestiona}
        crea={puede(PERMISOS_CORE.etiquetasConfig)}
      />
    </SeccionTarjeta>
  );
}
