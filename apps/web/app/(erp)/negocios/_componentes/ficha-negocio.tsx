import type { ReactNode } from "react";

import { Badge, DetailScreen, type EstadoPantalla } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { pesos } from "@/lib/fechas";

import { acciones, Cierre } from "./acciones-negocio";
import type { NegocioDetalle } from "./datos";
import { CambiarEtapa } from "./tablero/cambiar-etapa";
import type { EtapaTablero } from "./tablero/use-mover";

const TONO = { abierto: "info", ganado: "success", perdido: "danger" } as const;
const ESTADO = { abierto: "Abierto", ganado: "Ganado", perdido: "Perdido" } as const;

export type TabNegocio = "resumen" | "cotizaciones" | "documentos" | "actividad";

/** Ficha de un negocio: estado sobre el título, cuenta y etapa; pestañas por ruta (ADR-041). */
export function FichaNegocio(p: {
  state: EstadoPantalla;
  negocio: NegocioDetalle | null;
  tab: TabNegocio;
  /** Con `comercial:negocios.manage`: Ganar/Perder/Reabrir y «Más acciones». */
  gestiona?: boolean;
  cpq?: { leer: boolean; crear: boolean };
  /** Etapas para «Cambiar etapa» (solo si gestiona y el negocio está abierto). */
  etapas?: EtapaTablero[] | null;
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
                  {p.etapas?.length ? (
                    <CambiarEtapa
                      negocioId={n.id}
                      titulo={n.titulo}
                      etapaActual={n.etapaId}
                      etapaNombre={n.etapaNombre}
                      etapas={p.etapas}
                    />
                  ) : (
                    <span className="t-caption">{n.etapaNombre}</span>
                  )}
                </>
              ),
              subtitulo: (
                <>
                  {n.cuentaNombre}
                  {monto != null ? ` · ${pesos(monto)}/mes` : ""}
                  {` · ${n.probabilidad}%`}
                  {/* Teléfono, y la vista dividida angosta (lg a xl), Ganar/Perder o Reabrir a lo
                      ancho bajo el título, como el export: al lado del título lo dejaban en una
                      palabra por línea (CAR-33). */}
                  {p.gestiona && n.estado !== "ganado" && !n.archivadoEn ? (
                    <span className="mt-3 flex gap-2 md:hidden lg:max-xl:flex [&>*]:flex-1">
                      <Cierre n={n} base={base} />
                    </span>
                  ) : null}
                </>
              ),
              acciones:
                p.gestiona || p.cpq?.crear ? (
                  <>
                    {p.cpq?.crear && n.estado === "abierto" && !n.archivadoEn ? (
                      <EnlaceBoton href={`/cotizaciones/nueva?negocio=${n.id}`}>
                        Nueva cotización
                      </EnlaceBoton>
                    ) : null}
                    <span className="flex gap-2 max-md:hidden lg:max-xl:hidden">
                      {p.gestiona ? <Cierre n={n} base={base} /> : null}
                    </span>
                    {p.gestiona ? (
                      <AccionesEntidad etiqueta="Más acciones" acciones={acciones(n)} />
                    ) : null}
                  </>
                ) : undefined,
            }
          : {})}
        tabActiva={p.tab}
        Link={LinkNext}
        tabs={[
          { id: "resumen", etiqueta: "Resumen", href: base },
          ...(p.cpq?.leer
            ? [{ id: "cotizaciones", etiqueta: "Cotizaciones", href: `${base}/cotizaciones` }]
            : []),
          { id: "documentos", etiqueta: "Documentos", href: `${base}/documentos` },
          { id: "actividad", etiqueta: "Actividad", href: `${base}/actividad` },
        ]}
      >
        {p.children}
      </DetailScreen>
    </>
  );
}
