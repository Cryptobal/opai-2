import type { ReactNode } from "react";

import { Badge, DetailScreen, type EstadoPantalla } from "@opai/ds";

import { BandaAprobacion } from "@/app/_components/aprobaciones/banda-aprobacion";
import { LinkNext } from "@/app/_components/link-next";
import { AccionesCabeceraFicha } from "@/app/_components/maestros/acciones-ficha";
import type { AccionEntidad } from "@/app/_components/maestros/acciones-entidad";
import { ESTADO_CUENTA, estadoDe } from "@/app/_components/maestros/estados";
import { fecha, rut } from "@/lib/fechas";
import { conFiltros, type Parametros } from "@/lib/parametros";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

const SIGUIENTES: Record<string, string[]> = {
  prospecto: ["cliente_activo"],
  cliente_activo: ["cliente_inactivo"],
  cliente_inactivo: ["cliente_activo"],
};

function accionesCuenta(c: CuentaDetalle): AccionEntidad[] {
  return [
    ...(SIGUIENTES[c.estado] ?? []).map((estado, i) => ({
      id: `estado-${estado}`,
      ...(i === 0 ? { grupo: "Cambiar estado" } : {}),
      etiqueta: estadoDe(ESTADO_CUENTA, estado).etiqueta,
      capacidad: {
        id: "core.cuentas.set_estado",
        input: { id: c.id, estado },
        exito: "Estado actualizado",
      },
    })),
    { id: "fusionar", etiqueta: "Fusionar con…", parametro: { clave: "fusionar", valor: "1" } },
    {
      id: "archivar",
      etiqueta: "Archivar",
      peligro: true,
      capacidad: { id: "core.cuentas.archive", input: { id: c.id }, exito: "Cuenta archivada" },
      confirmar: {
        titulo: `Archivar ${c.nombre}`,
        descripcion: "Deja de aparecer en las listas; sus datos y documentos se conservan.",
        boton: "Archivar",
        peligro: true,
      },
    },
  ];
}

export type TabCuenta =
  "resumen" | "contactos" | "portal" | "instalaciones" | "negocios" | "documentos" | "actividad";

/** Ficha de una cuenta (03/04): estado, nombre, razón social y RUT; tabs por ruta. */
export function FichaCuenta(p: {
  state: EstadoPantalla;
  cuenta: CuentaDetalle | null;
  tab: TabCuenta;
  /** Pestaña aportada por Comercial (ADR-041.5): solo con el módulo activo y permiso. */
  negocios?: boolean;
  /** Pestaña Portal Cliente (CAR-802): módulo activo y permiso de leer accesos. */
  portal?: boolean;
  /** Filtros de la lista: las pestañas los conservan para que la lista de la izquierda no vuelva a «todos». */
  filtros?: Parametros;
  children: ReactNode;
}) {
  const c = p.cuenta;
  const e = c ? estadoDe(ESTADO_CUENTA, c.estado) : null;
  const base = `/cuentas/${c?.id ?? ""}`;
  const ir = (ruta: string) => conFiltros(ruta, p.filtros);
  return (
    <>
      {c ? <BandaAprobacion entidad={{ tipo: "cuenta", id: c.id }} /> : null}
      <DetailScreen
        state={c ? p.state : p.state === "ready" ? "error" : p.state}
        titulo={c?.nombre ?? "Cuenta"}
        {...(c && e
          ? {
              estado: (
                <>
                  <Badge tono={e.tono}>{e.etiqueta}</Badge>
                  {c.clienteDesde ? (
                    <span className="t-caption">cliente desde {fecha(c.clienteDesde)}</span>
                  ) : null}
                </>
              ),
              subtitulo: (
                <>
                  {c.razonSocial ?? c.nombre}
                  {c.rut ? (
                    <>
                      {" "}
                      · <span className="t-mono">{rut(c.rut)}</span>
                    </>
                  ) : c.giro ? (
                    ` · ${c.giro}`
                  ) : null}
                </>
              ),
              acciones: (
                <AccionesCabeceraFicha
                  etiqueta="Acciones de la cuenta"
                  editarHref="?editar=1"
                  acciones={accionesCuenta(c)}
                  agente={{
                    contexto: { tipo: "cuenta", id: c.id },
                    nombre: c.nombre,
                    articulo: "esta cuenta",
                  }}
                />
              ),
            }
          : {})}
        tabActiva={p.tab}
        Link={LinkNext}
        tabs={[
          { id: "resumen", etiqueta: "Resumen", href: ir(base) },
          {
            id: "contactos",
            etiqueta: "Contactos",
            href: ir(`${base}/contactos`),
          },
          ...(p.portal ? [{ id: "portal", etiqueta: "Portal", href: ir(`${base}/portal`) }] : []),
          {
            id: "instalaciones",
            etiqueta: "Instalaciones",
            contador: c?.instalaciones.length ?? 0,
            href: ir(`${base}/instalaciones`),
          },
          ...(p.negocios
            ? [{ id: "negocios", etiqueta: "Negocios", href: ir(`${base}/negocios`) }]
            : []),
          {
            id: "documentos",
            etiqueta: "Documentos",
            contador: c?.documentos ?? 0,
            href: ir(`${base}/documentos`),
          },
          { id: "actividad", etiqueta: "Actividad", href: ir(`${base}/actividad`) },
        ]}
      >
        {p.children}
      </DetailScreen>
    </>
  );
}
