import { LinkNext } from "@/app/_components/link-next";

import { AgregarEntrada } from "./agregar-entrada";
import type { PortalListas } from "./borrador-entrada";

export function AccionListas({
  portal,
  instalacionId,
  tipo,
}: {
  portal: PortalListas;
  instalacionId: string;
  tipo: "autorizada" | "bloqueada";
}) {
  const agregar = <AgregarEntrada instalacionId={instalacionId} tipo={tipo} portal={portal} />;
  if (portal !== "erp") return agregar;
  return (
    <span className="flex flex-wrap items-center gap-3">
      <LinkNext
        href="/configuracion/importar?importador=acceso_listas"
        className="t-body-sm font-medium underline"
      >
        Importar desde Excel
      </LinkNext>
      {agregar}
    </span>
  );
}