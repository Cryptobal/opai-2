import { esRol, esVertical, vocabulario } from "@opai/domain";

import type { Identidad } from "@/lib/actor";
import { epocaDe } from "@/lib/epoca-sesion";
import { NAV_PLATAFORMA, navegacionErp, navegacionPortal } from "@/lib/navegacion";

import type { DatosShell } from "./marco-shell";
import { ETIQUETA_ROL, PORTALES, portalesVisibles, subtituloMarcaPortal } from "./portales";

/** Datos del shell (navegación, portales, empresa y usuario) de una identidad. Sin contadores: la
 * barra lateral ya no los lleva (ADR-045). El contador de la campana lo carga la propia campana. */
export function datosShell(identidad: Identidad, portal: string): DatosShell {
  const { usuario, actual, membresias } = identidad;
  const rol = actual && esRol(actual.rol) ? actual.rol : null;
  const vertical = actual?.tenant.vertical ?? "";
  const inicio = PORTALES.find((p) => p.id === portal)?.href ?? "/";
  const nav =
    portal === "erp"
      ? navegacionErp(
          rol,
          identidad.modulosActivos,
          vocabulario(esVertical(vertical) ? vertical : "seguridad"),
        )
      : portal === "platform"
        ? NAV_PLATAFORMA
        : navegacionPortal(inicio, portal);
  const plataforma = usuario.platformRole !== null;
  return {
    portal,
    subtituloMarca: subtituloMarcaPortal(portal),
    epoca: epocaDe(usuario.id, actual?.tenantId ?? null),
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
