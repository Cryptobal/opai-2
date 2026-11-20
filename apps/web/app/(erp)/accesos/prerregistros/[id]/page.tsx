import { notFound } from "next/navigation";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { puedePrerregistrar } from "@/lib/pestanas-modulos";

import { cargarPrerregistro, uuid } from "../_componentes/datos";
import { DetallePrerregistro } from "../_componentes/detalle-prerregistro";

export const metadata = { title: "Prerregistro" };

/** Ficha de un prerregistro de visita (CAR-478). */
export default function PrerregistroFicha({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Accesos"
      ruta="/accesos"
      cargando="detalle"
      volver={{ href: "/accesos/prerregistros", etiqueta: "Prerregistros" }}
      cargar={async () => {
        const id = uuid((await params).id);
        if (!id) notFound();
        const [r, crea] = await Promise.all([cargarPrerregistro(id), puedePrerregistrar()]);
        if (!r.ok && r.error.code === "NOT_FOUND") notFound();
        return { r, crea };
      }}
    >
      {(d) => (
        <DetallePrerregistro
          p={d.r.ok ? d.r.data : null}
          state={estadoPantalla(d.r)}
          crea={d.crea}
        />
      )}
    </PaginaPortal>
  );
}
