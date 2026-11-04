import { PaginaPortal } from "@/app/_components/pagina-portal";

import { cargarCobranza } from "./_componentes/datos";
import { ListaCobranza } from "./_componentes/lista-cobranza";

export const metadata = { title: "Cobranza" };

/** Cobranza: facturas vencidas por tramo y deudores (BRIEF-29, diseño Finanzas v3 pantalla 5). */
export default function CobranzaPage() {
  return (
    <PaginaPortal portal="erp" titulo="Cobranza" ruta="/finanzas/cobranza" cargar={cargarCobranza}>
      {(d) => <ListaCobranza state={d.state} resumen={d.resumen} />}
    </PaginaPortal>
  );
}
