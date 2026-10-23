import { redirect } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { Forbidden, Loading } from "@opai/ds";

import { NAV_PLATAFORMA, navegacionErp, navegacionPortal } from "@/lib/navegacion";
import { ejecutarComoUsuario, requerirIdentidad, tieneAccesoAPortal } from "@/lib/servidor";
import type { Identidad } from "@/lib/actor";
import { esRol } from "@opai/domain";

import { ETIQUETA_ROL, PORTALES, portalesVisibles } from "./portales";
import { type DatosShell, type OpcionesPagina, Shell } from "./shell";

type Props = OpcionesPagina & { portal: string; ruta: string; children: ReactNode };

function datosShell(identidad: Identidad, portal: string, noLeidas: number): DatosShell {
  const { usuario, actual, membresias } = identidad;
  const rol = actual && esRol(actual.rol) ? actual.rol : null;
  const inicio = PORTALES.find((p) => p.id === portal)?.href ?? "/";
  const nav =
    portal === "erp"
      ? navegacionErp(rol, identidad.modulosActivos)
      : portal === "platform"
        ? NAV_PLATAFORMA
        : navegacionPortal(inicio);
  const plataforma = usuario.platformRole !== null;
  return {
    portal,
    noLeidas,
    nav,
    portales: portalesVisibles(actual?.portales ?? [], plataforma),
    tenant:
      portal === "platform" ? { nombre: "OPAI" } : actual ? { nombre: actual.tenant.nombre } : null,
    usuario: {
      nombre: usuario.nombre,
      email: usuario.email,
      rol:
        portal === "platform" ? "Plataforma" : (ETIQUETA_ROL[actual?.rol ?? ""] ?? "Sin empresa"),
    },
    empresas: membresias
      .filter((m) => m.estado === "activa" && m.tenant.estado !== "suspendido")
      .map((m) => ({
        id: m.tenantId,
        nombre: m.tenant.nombre,
        actual: m.tenantId === actual?.tenantId,
      })),
  };
}

async function Contenido({ portal, ruta, children, ...pagina }: Props) {
  const identidad = await requerirIdentidad(ruta);
  const acceso = tieneAccesoAPortal(identidad, portal);
  // Usuario de plataforma sin empresa: su inicio es Plataforma.
  if (!acceso && portal === "erp" && !identidad.actual && identidad.usuario.platformRole) {
    redirect("/platform");
  }
  const sinEmpresa = !identidad.actual && portal !== "platform";
  const avisos =
    acceso && identidad.actual
      ? await ejecutarComoUsuario<{ noLeidas: number }>(portal, "core.notificaciones.list", {
          limite: 1,
        })
      : null;
  const noLeidas = avisos?.ok ? avisos.data.noLeidas : 0;
  return (
    <Shell datos={datosShell(identidad, portal, noLeidas)} {...pagina}>
      {acceso ? (
        children
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
 * El Suspense permite leer la sesión (cookies) con Cache Components.
 */
export function PaginaPortal(props: Props) {
  return (
    <Suspense fallback={<Loading variante="lista" className="p-4 md:p-6" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
