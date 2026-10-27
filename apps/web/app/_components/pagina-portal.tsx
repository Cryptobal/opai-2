import { redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { Forbidden, Loading, type VarianteLoading } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { epocaDeIdentidad, marcaGenerado } from "@/lib/epoca-sesion";
import { medirFase } from "@/lib/metricas-navegacion";
import { requerirIdentidad, tieneAccesoAPortal } from "@/lib/servidor";

import { type OpcionesPagina } from "./cabecera-contexto";
import { CabeceraPagina } from "./cabecera-pagina";
import { MarcadorMetricas } from "./marcador-metricas";

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
  const puedeElegir = identidad.membresias.some(
    (m) => m.estado === "activa" && m.tenant.estado !== "suspendido",
  );
  // Fase `datos` del `Server-Timing` (ADR-045): solo los datos de la página; el shell y su navegación
  // viven en el layout del portal (`PortalLayout`) y no se recargan por navegación.
  const datos = await medirFase("datos", () =>
    acceso && cargar ? cargar() : Promise.resolve(undefined as T),
  );
  const extra = acceso && cargar && opciones ? opciones(datos) : {};
  // El esqueleto acompaña al contenido (lo intercambia el CSS en navegaciones lentas, ver `EstadoEnlace`);
  // el resto de las opciones son la cabecera que la página fija en el shell persistente del layout.
  const { esqueleto, ...cabecera } = { ...pagina, ...extra };
  return (
    <>
      <CabeceraPagina
        {...(acceso ? cabecera : { titulo: "Sin permisos" })}
        generado={marcaGenerado()}
        epoca={epocaDeIdentidad(identidad)}
      />
      <div data-contenido className="contents">
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
            {...(sinEmpresa && puedeElegir
              ? {
                  accion: (
                    <EnlaceBoton href="/elegir-empresa" variante="secondary">
                      Elegir empresa
                    </EnlaceBoton>
                  ),
                }
              : {})}
          />
        )}
      </div>
      <div data-esqueleto>{esqueleto ?? <Loading variante={cargando} />}</div>
      {/* En su propio Suspense: `MarcadorMetricas` lee `headers()` (async), y sin un límite propio su
          suspensión sube hasta el Suspense del portal (`CargaPortal`) y arrastra todo el contenido —la
          lista incluida— fuera del primer flush del HTML. Aislado, la lista se envía de inmediato y el
          marcador llega aparte (es un `<script>` invisible, no afecta a lo que ve el usuario). */}
      <Suspense fallback={null}>
        <MarcadorMetricas />
      </Suspense>
    </>
  );
}

/**
 * Página de un portal: exige sesión y acceso al portal en servidor, carga sus datos y fija su
 * cabecera (título, acciones, "Atrás") en el shell persistente del layout (ADR-045). El shell y el
 * Suspense viven en el layout del portal (`PortalLayout`): al navegar, React conserva el shell y la
 * página anterior hasta que la nueva está lista, en vez de volver a montar la barra lateral.
 */
export function PaginaPortal<T = undefined>(props: Props<T>) {
  return <Contenido {...props} />;
}
