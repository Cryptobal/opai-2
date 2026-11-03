import type { SearchParams } from "@/lib/parametros";
import { puedeGestionarNegocios } from "@/lib/pestanas-modulos";

import { PaginaNegocio } from "../../_componentes/pagina-negocio";
import { cargarSeguimientoDelNegocio } from "../../_seguimiento/datos";
import { SeguimientoNegocio } from "../../_seguimiento/seguimiento-negocio";

export const metadata = { title: "Seguimiento del negocio" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Negocio · Seguimiento: plan automático en días hábiles, pasos y respuesta del cliente (CAR-67). */
export default function SeguimientoDelNegocio(props: Props) {
  return (
    <PaginaNegocio {...props} tab="seguimiento">
      {async (n) => {
        const [d, gestiona] = await Promise.all([cargarSeguimientoDelNegocio(n.id), puedeGestionarNegocios()]);
        return <SeguimientoNegocio negocioId={n.id} seguimiento={d.seguimiento} planes={d.planes} gestiona={gestiona} abierto={n.estado === "abierto" && !n.archivadoEn} />;
      }}
    </PaginaNegocio>
  );
}
