import type { ReactNode } from "react";

import { Badge, type EstadoPantalla, ListScreen } from "@opai/ds";

import { etiquetaCapacidad } from "@/app/(erp)/configuracion/auditoria/_componentes/capacidad";
import { fechaHora } from "@/lib/formato";

/** Fila de `platform.auditoria.list` (CAR-323). */
export type EventoPlataforma = {
  seq: number;
  actorType: string;
  capability: string;
  tenantObjetivoId: string | null;
  payload: unknown;
  antes: unknown;
  despues: unknown;
  creadoEn: string;
};

/** Valor de antes/después en palabras: texto, número o «clave: valor» de un objeto plano. */
export function legible(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(legible).join(", ");
  if (typeof v === "object")
    return Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${k}: ${legible(x)}`)
      .join(" · ");
  return "—";
}

const ACTOR: Record<string, string> = { user: "Persona", agent: "Agente", system: "Sistema" };
const esLectura = (e: EventoPlataforma) =>
  typeof e.payload === "object" && e.payload !== null && "lectura" in e.payload;

function Cambio({ e }: { e: EventoPlataforma }) {
  if (esLectura(e)) return <span className="text-fg-muted">Consulta</span>;
  if (e.antes === null && e.despues === null) return <span className="text-fg-muted">—</span>;
  return (
    <span>
      {legible(e.antes)} → <strong>{legible(e.despues)}</strong>
    </span>
  );
}

type Props = {
  state: EstadoPantalla;
  items: EventoPlataforma[];
  empresas: Map<string, string>;
  filtros?: ReactNode;
  conEmpresa?: boolean;
};

/** Auditoría de Plataforma (CAR-323): quién hizo qué, sobre qué empresa y con qué antes y después. */
export function ListaAuditoria({ state, items, empresas, filtros, conEmpresa = true }: Props) {
  const empresa = (e: EventoPlataforma) =>
    e.tenantObjetivoId ? (empresas.get(e.tenantObjetivoId) ?? "Otra empresa") : "Plataforma";
  return (
    <ListScreen<EventoPlataforma>
      state={state}
      titulo="Auditoría"
      soloTelefono
      {...(filtros ? { filtros } : {})}
      items={items}
      clave={(e) => String(e.seq)}
      textos={{
        vacio: { titulo: "Sin registros", descripcion: "No hay acciones con estos filtros." },
      }}
      tarjeta={(e) => (
        <>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-base text-fg">{etiquetaCapacidad(e.capability)}</span>
            <span className="t-caption truncate">
              {conEmpresa ? `${empresa(e)} · ` : ""}
              {fechaHora(e.creadoEn)}
            </span>
            <span className="t-caption truncate">
              <Cambio e={e} />
            </span>
          </span>
          <Badge>{ACTOR[e.actorType] ?? e.actorType}</Badge>
        </>
      )}
      columnas={[
        { id: "fecha", etiqueta: "Fecha", render: (e) => fechaHora(e.creadoEn) },
        { id: "accion", etiqueta: "Acción", render: (e) => etiquetaCapacidad(e.capability) },
        ...(conEmpresa ? [{ id: "empresa", etiqueta: "Empresa", render: empresa }] : []),
        { id: "actor", etiqueta: "Quién", render: (e) => ACTOR[e.actorType] ?? e.actorType },
        {
          id: "cambio",
          etiqueta: "Antes → después",
          className: "max-w-96 truncate",
          render: (e) => <Cambio e={e} />,
        },
      ]}
    />
  );
}
