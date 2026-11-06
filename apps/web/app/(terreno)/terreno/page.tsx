import { UserCheck } from "lucide-react";

import { Empty, FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";

export const metadata = { title: "Terreno" };

/** Inicio de Terreno: el resto del portal llega con sus briefs; mientras tanto, la marcación de asistencia. */
export default function Pagina() {
  return (
    <PaginaPortal portal="terreno" titulo="Terreno" ruta="/terreno">
      <h2 className="t-title mb-4 text-fg md:hidden">Terreno</h2>
      <div className="mb-4 border-y border-border bg-surface md:rounded-lg md:border">
        <FilaSeleccionable
          href="/terreno/marcar"
          Link={LinkNext}
          titulo="Marcar asistencia"
          secundario="Con tu rostro o con tu RUT y PIN"
          inicio={<UserCheck aria-hidden className="size-5 flex-none text-fg-muted" />}
        />
      </div>
      <Empty titulo="Terreno: en construcción" descripcion="El resto de Terreno se habilita en la fase de portales." />
    </PaginaPortal>
  );
}
