import { notFound } from "next/navigation";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import { AccionesProgramacion } from "../_componentes/acciones-programacion";
import {
  Historial,
  Lineas,
  type PeriodoPrevio,
  Proximos,
  Resumen,
} from "../_componentes/ficha-secciones";
import type { DetalleProgramacion } from "../_componentes/tipos";

async function cargar(id: string) {
  const identidad = await requerirIdentidad(`/finanzas/ventas/programacion/${id}`);
  const [r, p] = await Promise.all([
    ejecutarComoUsuario<DetalleProgramacion>("erp", "finanzas.ventas_programacion.obtener", {
      programacionId: id,
    }),
    ejecutarComoUsuario<{ periodos: PeriodoPrevio[] }>(
      "erp",
      "finanzas.ventas_programacion.vista_previa",
      {
        programacionId: id,
        cantidad: 6,
      },
    ),
  ]);
  return {
    state: estadoPantalla(r),
    item: r.ok ? r.data : null,
    periodos: p.ok ? p.data.periodos : [],
    puedeEditar: puedeDeIdentidad(identidad)("finanzas:ventas.manage"),
  };
}

export const metadata = { title: "Programación recurrente" };

/** Ficha de una programación recurrente (BRIEF-26 · CAR-159). */
export default async function ProgramacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PaginaPortal
      portal="erp"
      titulo="Programación recurrente"
      ruta="/finanzas/ventas/programacion"
      cargar={() => cargar(id)}
      opciones={() => ({
        titulo: "Programación recurrente",
        volver: { href: "/finanzas/ventas/programacion", etiqueta: "Programación" },
      })}
    >
      {(d) => {
        if (d.state === "ready" && !d.item) notFound();
        if (d.state !== "ready" || !d.item) return null;
        const item = d.item;
        return (
          <div className="flex flex-col gap-4">
            <Resumen
              item={item}
              acciones={
                d.puedeEditar ? <AccionesProgramacion id={item.id} activa={item.activa} /> : null
              }
            />
            {item.activa ? <Proximos periodos={d.periodos} /> : null}
            <Lineas item={item} />
            <Historial item={item} />
          </div>
        );
      }}
    </PaginaPortal>
  );
}
