import type { ReactNode } from "react";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { type EntradaLista, PanelListas } from "./panel-listas";

/** Listas autorizada y bloqueada de la instalación (solo para quien gestiona listas). */
export async function SeccionListas({
  instalacionId,
  base,
  lista,
  segmento,
}: {
  instalacionId: string;
  base: string;
  lista: string | undefined;
  segmento: ReactNode;
}) {
  const tipo = lista === "bloqueada" ? "bloqueada" : "autorizada";
  const r = await ejecutarComoUsuario<EntradaLista[]>("erp", "acceso.listas.listar", {
    instalacionId,
    tipo,
  });
  return (
    <div className="flex flex-col gap-3">
      {segmento}
      <PanelListas
        state={estadoPantalla(r)}
        instalacionId={instalacionId}
        tipo={tipo}
        entradas={r.ok ? r.data : []}
        href={(t) => `${base}?sub=listas&lista=${t}`}
      />
    </div>
  );
}
