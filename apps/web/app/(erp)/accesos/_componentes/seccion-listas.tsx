import type { ReactNode } from "react";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { type EntradaLista, PanelListas } from "./panel-listas";

type FilaLista = {
  id: string;
  alcance: EntradaLista["alcance"];
  agregadaPor: string | null;
  tipo: "autorizada" | "bloqueada";
  mascara: string;
  nombre: string | null;
  motivo: string | null;
  tiposRegistro: string[];
  vigenteDesde: string | null;
  vigenteHasta: string | null;
  dias: number[];
  desdeMin: number | null;
  hastaMin: number | null;
  usoUnico: boolean;
};

async function filasListas(instalacionId: string, tipo: "autorizada" | "bloqueada") {
  return ejecutarComoUsuario<FilaLista[]>("erp", "acceso.listas.listar", { instalacionId, tipo });
}

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
  const r = await filasListas(instalacionId, tipo);
  const porId = new Map<string, string>();
  if (r.ok && r.data.some((e) => e.agregadaPor)) {
    const u = await ejecutarComoUsuario<{ userId: string; nombre: string }[]>(
      "erp",
      "core.users.list",
      {},
    );
    if (u.ok) for (const x of u.data) porId.set(x.userId, x.nombre);
  }
  const entradas: EntradaLista[] = r.ok
    ? r.data.map((e) => ({
        ...e,
        tipo: e.tipo,
        autorNombre: e.agregadaPor ? (porId.get(e.agregadaPor) ?? null) : null,
      }))
    : [];
  return (
    <div className="flex flex-col gap-3">
      {segmento}
      <PanelListas
        state={estadoPantalla(r)}
        instalacionId={instalacionId}
        tipo={tipo}
        entradas={entradas}
        href={(t) => `${base}?sub=listas&lista=${t}`}
      />
    </div>
  );
}
