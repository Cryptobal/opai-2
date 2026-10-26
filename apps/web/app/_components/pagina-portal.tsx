import { redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { Forbidden, Loading, type VarianteLoading } from "@opai/ds";

import { medirFase } from "@/lib/metricas-navegacion";
import { requerirIdentidad, tieneAccesoAPortal } from "@/lib/servidor";

import { datosShell } from "./datos-shell";
import { MarcadorMetricas } from "./marcador-metricas";
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
  // Fase `datos` del `Server-Timing` (ADR-045): datos de la página. La barra lateral ya no carga
  // contadores (decisión 15 de Carlos del 24-oct); la navegación sale solo de la identidad.
  const datos = await medirFase("datos", () =>
    acceso && cargar ? cargar() : Promise.resolve(undefined as T),
  );
  const extra = acceso && cargar && opciones ? opciones(datos) : {};
  return (
    <Shell
      datos={datosShell(identidad, portal)}
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
      {/* En su propio Suspense: `MarcadorMetricas` lee `headers()` (async), y sin un límite propio su
          suspensión sube hasta el Suspense del portal (`CargaPortal`) y arrastra todo el contenido —la
          lista incluida— fuera del primer flush del HTML. Aislado, la lista se envía de inmediato y el
          marcador llega aparte (es un `<script>` invisible, no afecta a lo que ve el usuario). */}
      <Suspense fallback={null}>
        <MarcadorMetricas />
      </Suspense>
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
