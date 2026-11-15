import type { ReactNode } from "react";

import { marcoDeLaPeticion } from "@/lib/marco-servidor";
import { identidadDeLaVista } from "@/lib/ver-como";
import type { VerComo } from "@/lib/ver-como-token";

import { CargaPortal } from "../carga-portal";
import { datosShell } from "../datos-shell";
import { MarcoPortal } from "../marco-portal";
import { BannerVerComo } from "./banner-ver-como";
import { SoloLecturaVerComo } from "./solo-lectura";

/**
 * Portal en «ver como» (CAR-528): la banda fija y, en Trabajador y Cliente, el shell con la navegación
 * de la persona vista, sin cambiar de empresa ni de portal y con un menú que solo sale de la vista.
 * Terreno no lleva shell: el equipo no lo tiene.
 */
export async function MarcoVerComo({
  vista,
  portal,
  children,
}: {
  vista: VerComo;
  portal: string;
  children: ReactNode;
}) {
  const identidad = portal === "terreno" ? null : await identidadDeLaVista(vista);
  const datos = identidad ? datosShell(identidad, portal) : null;
  const contenido = <SoloLecturaVerComo>{children}</SoloLecturaVerComo>;
  return (
    <>
      <BannerVerComo portal={vista.portal} nombre={vista.nombre} />
      {datos ? (
        <MarcoPortal
          marco={await marcoDeLaPeticion(portal, datos.acceso)}
          datos={{
            ...datos,
            vista: true,
            empresas: [],
            portales: datos.portales.filter((p) => p.id === portal),
          }}
        >
          <CargaPortal>{contenido}</CargaPortal>
        </MarcoPortal>
      ) : (
        contenido
      )}
    </>
  );
}
