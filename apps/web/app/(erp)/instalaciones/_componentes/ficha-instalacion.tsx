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
import { pestanasInstalacion } from "./ficha-instalacion-pestanas";

export type TabInstalacion =
  | "resumen"
  | "puestos"
  | "sueldo"
  | "negocios"
  | "rondas"
  | "turnos-extra"
  | "accesos"
  | "personas"
  | "dispositivos"
  | "documentos"
  | "actividad";

/** Ficha de instalación (07/08): estado y vigencia, nombre, cuenta; pestañas de módulo según ADR-041.5. */
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
  turnosExtra?: boolean;
  /** Pestaña «Accesos» (CAR-475): Control de acceso activo y permiso de lectura. */
  accesos?: boolean;
  /** Pestaña de dotación (CAR-596): Pauta activa y permiso de lectura. */
  personas?: boolean;
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
        tabs={pestanasInstalacion({
          base,
          parametros: p.parametros,
          activos,
          documentos: i?.documentos ?? 0,
          ...(p.negocios !== undefined ? { negocios: p.negocios } : {}),
          ...(p.rondas !== undefined ? { rondas: p.rondas } : {}),
          ...(p.turnosExtra !== undefined ? { turnosExtra: p.turnosExtra } : {}),
          ...(p.accesos !== undefined ? { accesos: p.accesos } : {}),
          ...(p.personas !== undefined ? { personas: p.personas } : {}),
          persona: p.persona,
        })}
      >
        {p.children}
      </DetailScreen>
    </>
  );
}
