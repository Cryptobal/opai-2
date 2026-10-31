import { Workflow } from "lucide-react";

import { Badge, DetailScreen, type EstadoPantalla } from "@opai/ds";

import { AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { fecha } from "@/lib/fechas";

import { accionesSolicitud, nombreDe } from "./acciones-solicitud";
import type { SolicitudDato } from "./datos";
import { CANAL, ESTADO } from "./etiquetas";
import { CuerpoSolicitud } from "./cuerpo-solicitud";
import { HojaConvertir } from "./hojas-solicitud";

type Ficha = { solicitud: SolicitudDato; posiblesDuplicadas: SolicitudDato[] };

/** Detalle de una solicitud (diseño 02/03): texto original como contenido externo y datos detectados. */
export function FichaSolicitud(p: {
  state: EstadoPantalla;
  ficha: Ficha | null;
  gestiona: boolean;
}) {
  const f = p.ficha;
  const s = f?.solicitud;
  const base = `/solicitudes/${s?.id ?? ""}`;
  const abierta = s?.estado === "nueva" || s?.estado === "en_revision";
  return (
    <DetailScreen
      state={f ? p.state : p.state === "ready" ? "error" : p.state}
      titulo={s ? nombreDe(s) : "Solicitud"}
      {...(s
        ? {
            estado: (
              <Badge tono={ESTADO[s.estado].tono} punto={false}>
                {ESTADO[s.estado].etiqueta}
              </Badge>
            ),
            subtitulo: `${CANAL[s.canal].etiqueta} · ${fecha(s.creadaEn)}`,
            acciones: p.gestiona ? (
              <>
                {abierta ? (
                  <EnlaceBoton href={`${base}?convertir=1`} icono={Workflow}>
                    Procesar y convertir
                  </EnlaceBoton>
                ) : null}
                <AccionesEntidad
                  etiqueta="Más acciones"
                  acciones={accionesSolicitud(s, f?.posiblesDuplicadas ?? [])}
                />
              </>
            ) : undefined,
          }
        : {})}
    >
      {s && f ? (
        <div className="flex flex-col gap-4">
          <CuerpoSolicitud s={s} posibles={f.posiblesDuplicadas} />
          {p.gestiona && abierta ? <HojaConvertir s={s} /> : null}
        </div>
      ) : null}
    </DetailScreen>
  );
}
