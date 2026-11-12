import { notFound } from "next/navigation";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { exigirDatos } from "@/lib/carga";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { DetalleDeCotizacion } from "../_componentes/detalle-cotizacion";
import type { DetalleCotizacion } from "../_componentes/tipos";

export const metadata = { title: tituloPagina("cliente", "Cotización") };

/** Detalle de una cotización enviada; una ajena, sin enviar o fuera de su propuesta vigente responde «no encontrada». */
export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PaginaPortal
      portal="cliente"
      titulo="Cotización"
      ruta={`/cliente/cotizaciones/${id}`}
      cargando="lista"
      cargar={async () => {
        const r = await ejecutarComoUsuario<DetalleCotizacion>("cliente", "cpq.portal_cotizaciones.get", { cotizacionId: id });
        if (!r.ok && r.error.code === "NOT_FOUND") notFound();
        return exigirDatos(r);
      }}
    >
      {(c) => <DetalleDeCotizacion c={c} />}
    </PaginaPortal>
  );
}
