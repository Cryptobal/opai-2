import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Forbidden, Loading, type VarianteLoading } from "@opai/ds";

import type { Contadores } from "@/lib/navegacion";
import { ejecutarComoUsuario, requerirIdentidad, tieneAccesoAPortal } from "@/lib/servidor";

import { datosShell } from "./datos-shell";
import { type OpcionesPagina, Shell } from "./shell";

type Props<T> = OpcionesPagina & {
  portal: string;
  ruta: string;
  /** Carga los datos de la página dentro del Suspense (params, searchParams y capacidades). */
  cargar?: () => Promise<T>;
  /** Opciones del shell que dependen de los datos (título de la ficha, migas, acciones). */
  opciones?: (datos: T) => Partial<OpcionesPagina>;
  cargando?: VarianteLoading;
  children: ReactNode | ((datos: T) => ReactNode);
};

const SIN_CONTADORES: Contadores = {
  cuentas: null,
  instalaciones: null,
  personas: null,
  aprobacionesPendientes: null,
  notificacionesNoLeidas: null,
};

async function Contenido<T>({
  portal,
  ruta,
  cargar,
  opciones,
  children,
  cargando = "lista",
  ...pagina
}: Props<T>) {
  const identidad = await requerirIdentidad(ruta);
  const acceso = tieneAccesoAPortal(identidad, portal);
  // Usuario de plataforma sin empresa: su inicio es Plataforma.
  if (!acceso && portal === "erp" && !identidad.actual && identidad.usuario.platformRole) {
    redirect("/platform");
  }
  const sinEmpresa = !identidad.actual && portal !== "platform";
  const [conteo, datos] = await Promise.all([
    acceso && identidad.actual
      ? ejecutarComoUsuario<Contadores>(portal, "core.resumen.contadores", {})
      : null,
    acceso && cargar ? cargar() : (undefined as T),
  ]);
  const contadores = conteo?.ok ? conteo.data : SIN_CONTADORES;
  const extra = acceso && cargar && opciones ? opciones(datos) : {};
  return (
    <Shell
      datos={datosShell(identidad, portal, contadores)}
      esqueleto={<Loading variante={cargando} />}
      {...pagina}
      {...extra}
    >
      {acceso ? (
        typeof children === "function" ? (
          children(datos)
        ) : (
          children
        )
      ) : (
        <Forbidden
          descripcion={
            sinEmpresa
              ? "Aún no perteneces a ninguna empresa activa. Pide una invitación a su administrador."
              : "No tienes acceso a este portal en la empresa actual."
          }
        />
      )}
    </Shell>
  );
}

/**
 * Página de un portal: exige sesión y acceso al portal en servidor y monta el shell real.
 * El Suspense vive en el layout del portal (`CargaPortal`): al navegar, React conserva la
 * página anterior hasta que la nueva está lista, en vez de reemplazarla por un esqueleto.
 */
export function PaginaPortal<T = undefined>(props: Props<T>) {
  return <Contenido {...props} />;
}
