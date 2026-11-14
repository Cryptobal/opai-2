import { PERMISOS_CORE } from "@opai/domain";
import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { EditarCampos } from "./editar-campos";
import { capacidadesDe, mostrarValor, type CampoFicha, type EntidadCampos } from "./tipos";

const PERMISOS: Record<EntidadCampos, { ver: string; editar: string }> = {
  cuenta: { ver: PERMISOS_CORE.cuentasRead, editar: PERMISOS_CORE.cuentasManage },
  contacto: { ver: PERMISOS_CORE.cuentasRead, editar: PERMISOS_CORE.cuentasManage },
  negocio: { ver: "comercial:negocios.read", editar: "comercial:negocios.manage" },
};

/**
 * Tarjeta «Campos propios» de una ficha (CAR-27): los campos personalizados que definió la empresa en
 * Configuración. Si la empresa no definió ninguno para esta entidad, no se muestra.
 */
export async function CamposFicha(p: { tipo: EntidadCampos; id: string }) {
  const identidad = await identidadActual();
  const puede = identidad ? puedeDeIdentidad(identidad) : () => false;
  if (!puede(PERMISOS[p.tipo].ver)) return null;
  const cap = capacidadesDe(p.tipo, p.id);
  const r = await ejecutarComoUsuario<{ campos: CampoFicha[] }>("erp", cap.get, cap.entrada);
  if (!r.ok || r.data.campos.length === 0) return null;
  const campos = r.data.campos;
  return (
    <SeccionTarjeta
      titulo="Campos propios"
      accion={
        puede(PERMISOS[p.tipo].editar) ? (
          <EditarCampos tipo={p.tipo} id={p.id} campos={campos} />
        ) : undefined
      }
    >
      <ParesGrid items={campos.map((c) => ({ etiqueta: c.etiqueta, valor: mostrarValor(c) }))} />
    </SeccionTarjeta>
  );
}
