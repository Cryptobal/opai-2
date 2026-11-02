import { PaginaPortal } from "@/app/_components/pagina-portal";

import { PaginaArmadorPropuesta } from "./_componentes/pagina-armador";

export default async function PropuestaTecnicaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PaginaPortal portal="erp" titulo="Propuesta técnica" ruta={`/cotizaciones/${id}/propuesta-tecnica`} cargar={async () => ({ state: "ready" as const })}>
      {() => <PaginaArmadorPropuesta cotizacionId={id} />}
    </PaginaPortal>
  );
}
