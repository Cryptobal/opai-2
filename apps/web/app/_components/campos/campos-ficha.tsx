import dynamic from "next/dynamic";

import { PERMISOS_CORE } from "@opai/domain";
import { ParesGrid, SeccionTarjeta } from "@opai/ds";

import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { entradaDe, mostrarValor, type CampoFicha, type EntidadCampos } from "./tipos";

// El editor (hoja y controles) se carga aparte del primer JS de la ficha (ADR-037).
const EditarCampos = dynamic(() => import("./editar-campos").then((m) => m.EditarCampos));

const PERMISOS: Record<EntidadCampos, { ver: string; editar: string }> = {
  cuenta: { ver: PERMISOS_CORE.cuentasRead, editar: PERMISOS_CORE.cuentasManage },
  contacto: { ver: PERMISOS_CORE.cuentasRead, editar: PERMISOS_CORE.cuentasManage },
  negocio: { ver: "comercial:negocios.read", editar: "comercial:negocios.manage" },
};

/**
 * Tarjeta «Campos de <empresa>» de una ficha (CAR-27, `DESIGN-PROMPT-crm-pr3.md` §3): los campos personalizados que definió la empresa en
 * Configuración. Si la empresa no definió ninguno para esta entidad, no se muestra.
 */
export async function CamposFicha(p: { tipo: EntidadCampos; id: string }) {
  const identidad = await identidadActual();
  const puede = identidad ? puedeDeIdentidad(identidad) : () => false;
  if (!puede(PERMISOS[p.tipo].ver)) return null;
  type R = { campos: CampoFicha[] };
  const entrada = entradaDe(p.tipo, p.id);
  const r =
    p.tipo === "negocio"
      ? await ejecutarComoUsuario<R>("erp", "comercial.negocio_campos.get", entrada)
      : await ejecutarComoUsuario<R>("erp", "core.valores_personalizados.get", entrada);
  if (!r.ok || r.data.campos.length === 0) return null;
  const campos = r.data.campos;
  return (
    <SeccionTarjeta
      titulo={`Campos de ${identidad?.actual?.tenant.nombre ?? "la empresa"}`}
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
