import { PaginaPortal } from "@/app/_components/pagina-portal";

import { cargarHoy } from "./_hoy/datos";
import { HoyEnFinanzas } from "./_hoy/hoy";

export const metadata = { title: "Hoy en Finanzas" };

/** Portada de Finanzas: qué emitir, cobrar y conciliar hoy (BRIEF-29, diseño Finanzas v3 pantalla 1). */
export default function FinanzasPage() {
  return (
    <PaginaPortal portal="erp" titulo="Hoy en Finanzas" ruta="/finanzas" cargar={cargarHoy}>
      {(d) => <HoyEnFinanzas state={d.state} resumen={d.resumen} />}
    </PaginaPortal>
  );
}
