import type { ReactNode } from "react";

import { Badge, DetailScreen, type EstadoPantalla } from "@opai/ds";

import { BandaAprobacion } from "@/app/_components/aprobaciones/banda-aprobacion";
import { LinkNext } from "@/app/_components/link-next";
import { type AccionEntidad, AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { ESTADO_CUENTA, estadoDe } from "@/app/_components/maestros/estados";
import { fecha, rut } from "@/lib/fechas";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

const SIGUIENTES: Record<string, string[]> = {
  prospecto: ["cliente_activo"],
  cliente_activo: ["cliente_inactivo"],
  cliente_inactivo: ["cliente_activo"],
};

export function accionesCuenta(c: CuentaDetalle): AccionEntidad[] {
  return [
    { id: "editar", etiqueta: "Editar", parametro: { clave: "editar", valor: "1" } },
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
  "resumen" | "contactos" | "instalaciones" | "negocios" | "documentos" | "actividad";

/** Ficha de una cuenta (03/04): estado, nombre, razón social y RUT; tabs por ruta. */
export function FichaCuenta(p: {
  state: EstadoPantalla;
  cuenta: CuentaDetalle | null;
  tab: TabCuenta;
  /** Pestaña aportada por Comercial (ADR-041.5): solo con el módulo activo y permiso. */
  negocios?: boolean;
  children: ReactNode;
}) {
  const c = p.cuenta;
  const e = c ? estadoDe(ESTADO_CUENTA, c.estado) : null;
  const base = `/cuentas/${c?.id ?? ""}`;
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
                <AccionesEntidad etiqueta="Acciones de la cuenta" acciones={accionesCuenta(c)} />
              ),
            }
          : {})}
        tabActiva={p.tab}
        Link={LinkNext}
        tabs={[
          { id: "resumen", etiqueta: "Resumen", href: base },
          {
            id: "contactos",
            etiqueta: "Contactos",
            contador: c?.contactos.length ?? 0,
            href: `${base}/contactos`,
          },
          {
            id: "instalaciones",
            etiqueta: "Instalaciones",
            contador: c?.instalaciones.length ?? 0,
            href: `${base}/instalaciones`,
          },
          ...(p.negocios
            ? [{ id: "negocios", etiqueta: "Negocios", href: `${base}/negocios` }]
            : []),
          {
            id: "documentos",
            etiqueta: "Documentos",
            contador: c?.documentos ?? 0,
            href: `${base}/documentos`,
          },
          { id: "actividad", etiqueta: "Actividad", href: `${base}/actividad` },
        ]}
      >
        {p.children}
      </DetailScreen>
    </>
  );
}
