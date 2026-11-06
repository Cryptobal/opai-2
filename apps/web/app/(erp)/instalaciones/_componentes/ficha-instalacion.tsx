import type { PanelSueldo } from "@opai/capabilities";
import type { ReactNode } from "react";

import { Badge, DetailScreen, Enlace, type EstadoPantalla } from "@opai/ds";

import { BandaAprobacion } from "@/app/_components/aprobaciones/banda-aprobacion";
import { LinkNext } from "@/app/_components/link-next";
import { AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { ESTADO_INSTALACION, estadoDe } from "@/app/_components/maestros/estados";
import { fecha } from "@/lib/fechas";
import type { Parametros } from "@/lib/parametros";
import type { InstalacionDetalle } from "@/lib/tipos-maestros";

import { accionesInstalacion } from "./acciones-instalacion";
import { conFiltrosInstalaciones } from "./filtros-instalaciones";

export type TabInstalacion =
  "resumen" | "puestos" | "sueldo" | "negocios" | "rondas" | "dispositivos" | "documentos" | "actividad";

/** Ficha de instalación (07/08): estado y vigencia, nombre, cuenta; tabs con "Personas" deshabilitada. */
export function FichaInstalacion(p: {
  aprobaciones?: PanelSueldo["aprobaciones"];
  state: EstadoPantalla;
  instalacion: InstalacionDetalle | null;
  tab: TabInstalacion;
  persona: string;
  parametros: Parametros;
  /** Pestaña aportada por Comercial (ADR-041.5): solo con el módulo activo y permiso. */
  negocios?: boolean;
  /** Pestaña aportada por Rondas (Brief 14): solo con el módulo activo y permiso de lectura. */
  rondas?: boolean;
  children: ReactNode;
}) {
  const i = p.instalacion;
  const e = i ? estadoDe(ESTADO_INSTALACION, i.estado) : null;
  const base = `/instalaciones/${i?.id ?? ""}`;
  const activos = i?.puestos.filter((x) => x.estado === "activo").length ?? 0;
  return (
    <>
      {i ? (
        <BandaAprobacion
          {...(p.aprobaciones ? { aprobaciones: p.aprobaciones } : {})}
          entidad={{ tipo: "instalacion", id: i.id }}
        />
      ) : null}
      <DetailScreen
        state={i ? p.state : p.state === "ready" ? "error" : p.state}
        titulo={i?.nombre ?? "Instalación"}
        {...(i && e
          ? {
              estado: (
                <>
                  <Badge tono={e.tono}>{e.etiqueta}</Badge>
                  {i.vigenteDesde ? (
                    <span className="t-caption">desde {fecha(i.vigenteDesde)}</span>
                  ) : null}
                </>
              ),
              subtitulo: (
                <Enlace Link={LinkNext} href={`/cuentas/${i.cuentaId}`} className="underline">
                  {i.cuenta ?? "Cuenta"}
                </Enlace>
              ),
              acciones: (
                <AccionesEntidad
                  etiqueta="Acciones de la instalación"
                  acciones={accionesInstalacion(i)}
                  agente={{
                    contexto: { tipo: "instalacion", id: i.id },
                    nombre: i.nombre,
                    articulo: "esta instalación",
                  }}
                />
              ),
            }
          : {})}
        tabActiva={p.tab}
        Link={LinkNext}
        tabs={[
          { id: "resumen", etiqueta: "Resumen", href: conFiltrosInstalaciones(base, p.parametros) },
          {
            id: "puestos",
            etiqueta: "Puestos",
            contador: activos,
            href: conFiltrosInstalaciones(`${base}/puestos`, p.parametros),
          },
          {
            id: "sueldo",
            etiqueta: "Sueldo",
            href: conFiltrosInstalaciones(`${base}/sueldo`, p.parametros),
          },
          ...(p.negocios
            ? [
                {
                  id: "negocios",
                  etiqueta: "Negocios",
                  href: conFiltrosInstalaciones(`${base}/negocios`, p.parametros),
                },
              ]
            : []),
          ...(p.rondas
            ? [
                {
                  id: "rondas",
                  etiqueta: "Rondas",
                  href: conFiltrosInstalaciones(`${base}/rondas`, p.parametros),
                },
              ]
            : []),
          {
            id: "personas",
            etiqueta: p.persona,
            href: base,
            deshabilitada: "Disponible con Operaciones",
          },
          {
            id: "dispositivos",
            etiqueta: "Dispositivos",
            href: conFiltrosInstalaciones(`${base}/dispositivos`, p.parametros),
          },
          {
            id: "documentos",
            etiqueta: "Documentos",
            contador: i?.documentos ?? 0,
            href: conFiltrosInstalaciones(`${base}/documentos`, p.parametros),
          },
          {
            id: "actividad",
            etiqueta: "Actividad",
            href: conFiltrosInstalaciones(`${base}/actividad`, p.parametros),
          },
        ]}
      >
        {p.children}
      </DetailScreen>
    </>
  );
}
