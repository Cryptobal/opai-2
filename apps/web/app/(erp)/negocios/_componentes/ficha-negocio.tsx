import type { ReactNode } from "react";

import { Badge, DetailScreen, type EstadoPantalla } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { type AccionEntidad, AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { pesos } from "@/lib/fechas";

import type { NegocioDetalle } from "./datos";

const TONO = { abierto: "info", ganado: "success", perdido: "danger" } as const;
const ESTADO = { abierto: "Abierto", ganado: "Ganado", perdido: "Perdido" } as const;

export type TabNegocio = "resumen" | "cotizaciones" | "documentos" | "actividad";

function acciones(n: NegocioDetalle): AccionEntidad[] {
  return [
    { id: "editar", etiqueta: "Editar", parametro: { clave: "editar", valor: "1" } },
    {
      id: "archivar",
      etiqueta: n.estado === "abierto" ? "Archivar" : "Archivar negocio",
      peligro: true,
      capacidad: { id: "comercial.negocios.archivar", input: { id: n.id, archivar: true }, exito: "Negocio archivado" },
      confirmar: {
        titulo: `Archivar ${n.titulo}`,
        descripcion: "Deja de aparecer en las listas por defecto; se conserva el historial.",
        boton: "Archivar",
        peligro: true,
      },
    },
  ];
}

/** Ficha de un negocio: estado sobre el título, cuenta y etapa; pestañas por ruta (ADR-041). */
export function FichaNegocio(p: {
  state: EstadoPantalla;
  negocio: NegocioDetalle | null;
  tab: TabNegocio;
  children: ReactNode;
}) {
  const n = p.negocio;
  const base = `/negocios/${n?.id ?? ""}`;
  const monto = n ? (n.valorMensual ?? n.montoEstimadoMensual) : null;
  return (
    <>
      <DetailScreen
        state={n ? p.state : p.state === "ready" ? "error" : p.state}
        titulo={n?.titulo ?? "Negocio"}
        {...(n
          ? {
              estado: (
                <>
                  <Badge tono={TONO[n.estado]}>{ESTADO[n.estado]}</Badge>
                  <span className="t-caption">{n.etapaNombre}</span>
                </>
              ),
              subtitulo: (
                <>
                  {n.cuentaNombre}
                  {monto != null ? ` · ${pesos(monto)}/mes` : ""}
                  {` · ${n.probabilidad}%`}
                </>
              ),
              acciones: <AccionesEntidad etiqueta="Acciones del negocio" acciones={acciones(n)} />,
            }
          : {})}
        tabActiva={p.tab}
        Link={LinkNext}
        tabs={[
          { id: "resumen", etiqueta: "Resumen", href: base },
          { id: "cotizaciones", etiqueta: "Cotizaciones", href: `${base}/cotizaciones` },
          { id: "documentos", etiqueta: "Documentos", href: `${base}/documentos` },
          { id: "actividad", etiqueta: "Actividad", href: `${base}/actividad` },
        ]}
      >
        {p.children}
      </DetailScreen>
    </>
  );
}
