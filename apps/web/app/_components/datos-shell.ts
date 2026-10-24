import { esRol, esVertical, vocabulario } from "@opai/domain";

import type { Identidad } from "@/lib/actor";
import { type Contadores, NAV_PLATAFORMA, navegacionErp, navegacionPortal } from "@/lib/navegacion";

import { ETIQUETA_ROL, PORTALES, portalesVisibles, subtituloMarcaPortal } from "./portales";
import type { DatosShell } from "./shell";

/** Datos del shell (navegación con contadores, portales, empresa y usuario) de una identidad. */
export function datosShell(
  identidad: Identidad,
  portal: string,
  contadores: Contadores,
): DatosShell {
  const { usuario, actual, membresias } = identidad;
  const rol = actual && esRol(actual.rol) ? actual.rol : null;
  const vertical = actual?.tenant.vertical ?? "";
  const inicio = PORTALES.find((p) => p.id === portal)?.href ?? "/";
  const nav =
    portal === "erp"
      ? navegacionErp(
          rol,
          identidad.modulosActivos,
          contadores,
          vocabulario(esVertical(vertical) ? vertical : "seguridad"),
        )
      : portal === "platform"
        ? NAV_PLATAFORMA
        : navegacionPortal(inicio, portal);
  const plataforma = usuario.platformRole !== null;
  return {
    portal,
    subtituloMarca: subtituloMarcaPortal(portal),
    noLeidas: contadores.notificacionesNoLeidas ?? 0,
    generado: Date.now(),
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
