import { Plus } from "lucide-react";

import { Badge, Estado, FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { pesos } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { puedeGestionarNegocios } from "@/lib/pestanas-modulos";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { NegocioFila } from "./datos";

const TONO = { abierto: "info", ganado: "success", perdido: "danger" } as const;
const ESTADO = { abierto: "Abierto", ganado: "Ganado", perdido: "Perdido" } as const;

/** Lista de negocios de una cuenta o de una instalación, para su pestaña Negocios (ADR-041). */
export async function NegociosDeEntidad(p: { cuentaId?: string; instalacionId?: string }) {
  const [r, gestiona] = await Promise.all([
    ejecutarComoUsuario<{ items: NegocioFila[] }>("erp", "comercial.negocios.list", {
      limite: 100,
      ...(p.cuentaId ? { cuentaId: p.cuentaId } : {}),
      ...(p.instalacionId ? { instalacionId: p.instalacionId } : {}),
    }),
    puedeGestionarNegocios(),
  ]);
  const items = r.ok ? r.data.items : [];
  // Sin permiso (supervisor, módulo inactivo) o error: el estado del DS, nunca «Sin negocios».
  const state = r.ok && !items.length ? "empty" : estadoPantalla(r);
  // Desde la ficha de una cuenta: «Nuevo negocio» abre la hoja del tablero con la cuenta elegida.
  const nuevo =
    p.cuentaId && gestiona ? (
      <div className="mb-3 flex justify-end">
        <EnlaceBoton
          href={`/negocios?nuevo=1&cuenta=${p.cuentaId}`}
          variante="secondary"
          icono={Plus}
        >
          Nuevo negocio
        </EnlaceBoton>
      </div>
    ) : null;
  return (
    <>
      {r.ok ? nuevo : null}
      <Estado
        state={state}
        variante="lista"
        textos={{
          vacio: {
            titulo: "Sin negocios",
            descripcion: "Las oportunidades de venta vinculadas aparecerán aquí.",
          },
        }}
      >
        <div className="overflow-hidden rounded-lg border border-border bg-surface [&>*:last-child]:border-b-0">
          {items.map((n) => {
            const monto = n.valorMensual ?? n.montoEstimadoMensual;
            return (
              <FilaSeleccionable
                key={n.id}
                href={`/negocios/${n.id}`}
                Link={LinkNext}
                titulo={n.titulo}
                secundario={`${n.etapaNombre}${monto != null ? ` · ${pesos(monto)}/mes` : ""}`}
                fin={<Badge tono={TONO[n.estado]}>{ESTADO[n.estado]}</Badge>}
              />
            );
          })}
        </div>
      </Estado>
    </>
  );
}
