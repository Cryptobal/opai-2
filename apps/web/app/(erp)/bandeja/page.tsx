import { Suspense } from "react";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { Bandeja } from "../_componentes/bandeja";
import { EsqueletoTarjeta } from "../_componentes/esqueletos-inicio";
import { TareasBandeja } from "../_componentes/tareas-bandeja";

export const metadata = { title: "Bandeja" };

/** Bandeja: avisos, aprobaciones y tareas asignadas vencidas o de hoy (NAVEGACION §2; CAR-160). */
export default function PaginaBandeja() {
  return (
    <PaginaPortal portal="erp" titulo="Bandeja" ruta="/bandeja">
      <div className="flex flex-col gap-4">
        <Bandeja />
        <div className="empty:hidden">
          <Suspense fallback={<EsqueletoTarjeta filas={2} />}>
            <TareasBandeja />
          </Suspense>
        </div>
      </div>
    </PaginaPortal>
  );
}
