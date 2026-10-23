import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { Superadmin } from "../_componentes/formato";
import { ListaTrabajos } from "../_componentes/lista-trabajos";
import type { Trabajo } from "../tenants/[id]/tipos";

export const metadata = { title: "Trabajos" };

const ESTADOS = [
  { valor: "problemas", etiqueta: "Con problemas" },
  { valor: "pendiente", etiqueta: "Pendientes" },
  { valor: "en_curso", etiqueta: "En curso" },
  { valor: "fallido", etiqueta: "Fallidos" },
  { valor: "hecho", etiqueta: "Hechos" },
  { valor: "cancelado", etiqueta: "Cancelados" },
];

/** Plataforma → Trabajos (51): la cola de todas las empresas; la fila abre el detalle con reintento. */
export default function Trabajos({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="platform"
      titulo="Trabajos"
      ruta="/platform/trabajos"
      insignia={<Superadmin />}
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const estado = p["estado"];
        const [r, tenants] = await Promise.all([
          ejecutarComoUsuario<Trabajo[]>("platform", "platform.trabajos.list", {
            limite: 100,
            ...(p["empresa"] ? { tenantId: p["empresa"] } : {}),
            ...(estado === "problemas" ? { conProblemas: true } : estado ? { estado } : {}),
          }),
          ejecutarComoUsuario<{ id: string; nombre: string }[]>(
            "platform",
            "platform.tenants.list",
          ),
        ]);
        return {
          state: estadoPantalla(r),
          items: r.ok ? r.data : [],
          empresas: tenants.ok
            ? tenants.data.map((t) => ({ valor: t.id, etiqueta: t.nombre }))
            : [],
        };
      }}
    >
      {(d) => (
        <ListaTrabajos
          state={d.state}
          items={d.items}
          filtros={
            <ChipsFiltro
              filtros={[
                { param: "estado", etiqueta: "Estado", opciones: ESTADOS },
                { param: "empresa", etiqueta: "Empresa", opciones: d.empresas },
              ]}
            />
          }
        />
      )}
    </PaginaPortal>
  );
}
