import { redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { Forbidden, Loading, type VarianteLoading } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { falloDeCarga } from "@/lib/carga";
import { epocaDeIdentidad, marcaGenerado } from "@/lib/epoca-sesion";
import { verificarMfaDe } from "@/lib/mfa";
import { medirFase } from "@/lib/metricas-navegacion";
import { esCuentaDeEmpresa } from "@/lib/acceso-portal";
import { requerirIdentidad, tieneAccesoAPortal } from "@/lib/servidor";

import { type OpcionesPagina } from "./cabecera-contexto";
import { CuentaDeEmpresaEnPortalCliente } from "./cuenta-de-empresa";
import { CabeceraPagina } from "./cabecera-pagina";
import { ErrorCarga } from "./error-carga";
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
  // Segundo factor obligatorio (NÚCLEO-F): si la cuenta debe tenerlo y aún no lo activó, va a enrolarse
  // antes de entrar a cualquier portal. Se verifica en servidor (ADR-022); el corte rápido evita leer
  // el ajuste cuando ya tiene el segundo factor. `/activar-mfa` no pasa por aquí, así que no hay ciclo.
  const pendiente = await verificarMfaDe(identidad);
  if (pendiente)
    redirect(
      `/${pendiente === "enrolar" ? "activar-mfa" : "mfa"}?next=${encodeURIComponent(ruta)}`,
    );
  const acceso = tieneAccesoAPortal(identidad, portal);
  // Usuario de plataforma sin empresa: su inicio es Plataforma.
  if (!acceso && portal === "erp" && !identidad.actual && tieneAccesoAPortal(identidad, "platform")) {
    redirect("/platform");
  }
  // Sesión de la empresa en el Portal Cliente: aviso propio, sin cargar datos ni caer en el `Forbidden`
  // desnudo de `ErrorCarga`, también si su membresía incluye «cliente» por error (CAR-192).
  const empresaEnCliente = portal === "cliente" && esCuentaDeEmpresa(identidad);
  const sinEmpresa = !identidad.actual && portal !== "platform";
  const puedeElegir = identidad.membresias.some(
    (m) => m.estado === "activa" && m.tenant.estado !== "suspendido",
  );
  // Fase `datos` del `Server-Timing` (ADR-045): solo los datos de la página; el shell y su navegación
  // viven en el layout del portal (`PortalLayout`) y no se recargan por navegación.
  // Si la carga falla, la página muestra `ErrorCarga` (error o sin permisos) dentro del shell, nunca
  // datos vacíos ni la página genérica de Next (CAR-50).
  let datos = undefined as T;
  let fallo: "forbidden" | "error" | null = null;
  try {
    datos = await medirFase("datos", () =>
      acceso && !empresaEnCliente && cargar ? cargar() : Promise.resolve(undefined as T),
    );
  } catch (e) {
    fallo = falloDeCarga(e);
  }
  const extra = acceso && !empresaEnCliente && cargar && opciones && !fallo ? opciones(datos) : {};
  // El esqueleto acompaña al contenido (lo intercambia el CSS en navegaciones lentas, ver `EstadoEnlace`);
  // el resto de las opciones son la cabecera que la página fija en el shell persistente del layout.
  const { esqueleto, insignia, ...cabecera } = { ...pagina, ...extra };
  return (
    <>
      <CabeceraPagina
        {...(acceso && !empresaEnCliente
          ? { ...cabecera, insignia }
          : { titulo: empresaEnCliente ? "Portal Cliente" : "Sin permisos" })}
        generado={marcaGenerado()}
        epoca={epocaDeIdentidad(identidad)}
      />
      <div data-contenido className="contents">
        {empresaEnCliente ? (
          <CuentaDeEmpresaEnPortalCliente rutaErp="/" />
        ) : acceso && fallo ? (
          <ErrorCarga fallo={fallo} ruta={ruta} />
        ) : acceso ? (
          typeof children === "function" ? (
            children(datos)
          ) : (
            children
          )
        ) : (
          <Forbidden
            descripcion={
              portal === "platform"
                ? "Plataforma es solo para el equipo de OPAI."
                : sinEmpresa
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
