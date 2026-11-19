import { PaginaPortal } from "@/app/_components/pagina-portal";

import { cargarFichaCotizacion } from "../../_componentes/datos";
import { DisenadorPropuesta } from "./_componentes/disenador-propuesta";

/** «Armar propuesta técnica» abre este diseñador. Los botones de la ficha los define CAR-544. */
export default async function PropuestaTecnicaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PaginaPortal
      portal="erp"
      titulo="Propuesta técnica"
      ruta={`/cotizaciones/${id}/propuesta-tecnica`}
      cargar={() => cargarFichaCotizacion(id)}
    >
      {(datos) => {
        const cot = datos.ficha?.cotizacion;
        if (!cot) return null;
        return (
          <DisenadorPropuesta
            cotizacionId={id}
            negocioId={cot.negocioId}
            codigo={cot.codigo}
            gestionar={datos.gestionar}
          />
        );
      }}
    </PaginaPortal>
  );
}
