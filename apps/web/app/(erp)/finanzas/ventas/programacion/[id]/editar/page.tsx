import { PaginaPortal } from "@/app/_components/pagina-portal";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { cargarCuentasProgramacion } from "../../_componentes/cargar-cuentas";
import { desdeDetalle } from "../../_componentes/conversion";
import { FormularioProgramacion } from "../../_componentes/formulario-programacion";
import type { DetalleProgramacion } from "../../_componentes/tipos";

export const metadata = { title: "Editar programación" };

async function cargar(id: string) {
  const base = await cargarCuentasProgramacion(`/finanzas/ventas/programacion/${id}/editar`);
  if (base.state !== "ready") return { ...base, item: null };
  const r = await ejecutarComoUsuario<DetalleProgramacion>(
    "erp",
    "finanzas.ventas_programacion.obtener",
    {
      programacionId: id,
    },
  );
  return { ...base, state: r.ok ? base.state : ("error" as const), item: r.ok ? r.data : null };
}

/** Editar una programación recurrente; los borradores ya generados no cambian (BRIEF-26). */
export default async function EditarProgramacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PaginaPortal
      portal="erp"
      titulo="Editar programación"
      ruta="/finanzas/ventas/programacion"
      cargando="formulario"
      cargar={() => cargar(id)}
      opciones={() => ({
        titulo: "Editar programación",
        volver: { href: `/finanzas/ventas/programacion/${id}`, etiqueta: "Programación" },
      })}
    >
      {(d) =>
        d.state === "ready" && d.item ? (
          <FormularioProgramacion
            cuentas={d.cuentas}
            inicial={desdeDetalle(d.item)}
            programacionId={id}
          />
        ) : null
      }
    </PaginaPortal>
  );
}
