import type { ReactNode } from "react";

import { Badge, type EstadoPantalla, ListScreen } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { etiquetaCapacidad } from "@/app/(erp)/configuracion/auditoria/_componentes/capacidad";
import { haceCuanto } from "@/lib/fechas";

import type { Trabajo } from "../tenants/[id]/tipos";
import { HojaTrabajo } from "./diferidas";

const ESTADO = {
  pendiente: { etiqueta: "Pendiente", tono: "neutro" },
  en_curso: { etiqueta: "En curso", tono: "info" },
  hecho: { etiqueta: "Hecho", tono: "success" },
  fallido: { etiqueta: "Fallido", tono: "danger" },
  cancelado: { etiqueta: "Cancelado", tono: "neutro" },
} as const;

function EstadoTrabajo({ t }: { t: Trabajo }) {
  if ((t.estado === "pendiente" || t.estado === "en_curso") && t.intentos > 0)
    return (
      <Badge tono="warning">
        Reintentando · {t.intentos} de {t.maxIntentos}
      </Badge>
    );
  const e = ESTADO[t.estado as keyof typeof ESTADO] ?? {
    etiqueta: t.estado,
    tono: "neutro" as const,
  };
  return <Badge tono={e.tono}>{e.etiqueta}</Badge>;
}

type Props = { state: EstadoPantalla; items: Trabajo[]; filtros?: ReactNode; conEmpresa?: boolean };

/** Trabajos (51): tipo, empresa, estado e intentos, última actividad; la fila abre el detalle. */
export function ListaTrabajos({ state, items, filtros, conEmpresa = true }: Props) {
  return (
    <>
      <ListScreen<Trabajo>
        state={state}
        titulo="Trabajos"
        soloTelefono
        {...(filtros ? { filtros } : {})}
        items={items}
        clave={(t) => t.id}
        href={(t) => `?ver=${t.tenantId}:${t.id}`}
        Link={LinkNext}
        textos={{
          vacio: { titulo: "Sin trabajos", descripcion: "Nada en cola con estos filtros." },
        }}
        tarjeta={(t) => (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-base text-fg">{etiquetaCapacidad(t.tipo)}</span>
              <span className="t-caption truncate">
                {conEmpresa ? `${t.slug} · ` : ""}
                {t.actualizadoEn ? haceCuanto(t.actualizadoEn) : "—"}
              </span>
            </span>
            <EstadoTrabajo t={t} />
          </>
        )}
        columnas={[
          { id: "tipo", etiqueta: "Trabajo", render: (t) => etiquetaCapacidad(t.tipo) },
          ...(conEmpresa
            ? [
                {
                  id: "empresa",
                  etiqueta: "Empresa",
                  className: "t-mono",
                  render: (t: Trabajo) => t.slug,
                },
              ]
            : []),
          { id: "estado", etiqueta: "Estado", render: (t) => <EstadoTrabajo t={t} /> },
          {
            id: "ultima",
            etiqueta: "Última",
            render: (t) => (t.actualizadoEn ? haceCuanto(t.actualizadoEn) : "—"),
          },
          {
            id: "error",
            etiqueta: "Último error",
            className: "max-w-64 truncate text-fg-muted",
            render: (t) => t.ultimoError ?? "—",
          },
        ]}
      />
      <HojaTrabajo trabajos={items} />
    </>
  );
}
