import { formatearClp } from "@opai/domain";
import { Estado } from "@opai/ds";

import type { SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { PaginaPersona } from "../../_componentes/pagina-persona";

export const metadata = { title: "Turnos extra de la persona" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

type Turno = {
  id: string;
  fecha: string;
  montoClp: number;
  estado: string;
  puestoId: string;
};

export default function Page(props: Props) {
  return (
    <PaginaPersona {...props} tab="turnos-extra">
      {async (persona) => {
        const r = await ejecutarComoUsuario<{ items: Turno[] }>("erp", "pauta.turnos_extra.listar", {
          personaId: persona.id,
          limite: 50,
        });
        const items = r.ok ? r.data.items : [];
        return (
          <div className="p-4 md:p-0">
            <Estado
              state={items.length ? "ready" : "empty"}
              variante="lista"
              textos={{ vacio: { titulo: "Sin turnos extra", descripcion: "Los reemplazos y refuerzos pagados de esta persona aparecerán aquí." } }}
            >
              <ul className="flex flex-col gap-2">
                {items.map((t) => (
                  <li key={t.id} className="t-body-sm flex justify-between gap-2 border-b border-border-subtle py-2">
                    <span>{t.fecha} · {t.estado}</span>
                    <span>{formatearClp(t.montoClp)}</span>
                  </li>
                ))}
              </ul>
            </Estado>
          </div>
        );
      }}
    </PaginaPersona>
  );
}