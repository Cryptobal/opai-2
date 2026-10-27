import type { PanelSueldo } from "@opai/capabilities";
import type { ReactNode } from "react";

import { Badge, DetailScreen, Enlace, type EstadoPantalla } from "@opai/ds";

import { BandaAprobacion } from "@/app/_components/aprobaciones/banda-aprobacion";
import { LinkNext } from "@/app/_components/link-next";
import { type AccionEntidad, AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { ESTADO_INSTALACION, estadoDe } from "@/app/_components/maestros/estados";
import { fecha } from "@/lib/fechas";
import type { Parametros } from "@/lib/parametros";
import type { InstalacionDetalle } from "@/lib/tipos-maestros";

import { conFiltrosInstalaciones } from "./filtros-instalaciones";

export type TabInstalacion = "resumen" | "puestos" | "sueldo" | "documentos" | "actividad";

function acciones(i: InstalacionDetalle): AccionEntidad[] {
  const otro = i.estado === "activa" ? "inactiva" : "activa";
  return [
    { id: "editar", etiqueta: "Editar", parametro: { clave: "editar", valor: "1" } },
    {
      id: "estado",
      etiqueta: otro === "activa" ? "Activar" : "Desactivar",
      capacidad: {
        id: "core.instalaciones.set_estado",
        input: { id: i.id, estado: otro },
        exito: "Estado actualizado",
      },
    },
    {
      id: "archivar",
      etiqueta: "Archivar",
      peligro: true,
      capacidad: {
        id: "core.instalaciones.archive",
        input: { id: i.id },
        exito: "Instalación archivada",
      },
      confirmar: {
        titulo: `Archivar ${i.nombre}`,
        descripcion: "Exige que no tenga puestos activos. Sus datos y documentos se conservan.",
        boton: "Archivar",
        peligro: true,
      },
    },
  ];
}

/** Ficha de instalación (07/08): estado y vigencia, nombre, cuenta; tabs con "Personas" deshabilitada. */
export function FichaInstalacion(p: {
  aprobaciones?: PanelSueldo["aprobaciones"];
  state: EstadoPantalla;
  instalacion: InstalacionDetalle | null;
  tab: TabInstalacion;
  persona: string;
  parametros: Parametros;
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
                <AccionesEntidad etiqueta="Acciones de la instalación" acciones={acciones(i)} />
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
          {
            id: "personas",
            etiqueta: p.persona,
            href: base,
            deshabilitada: "Disponible con Operaciones",
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
