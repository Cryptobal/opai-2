import { esRol, esVertical, vocabulario } from "@opai/domain";

import type { Identidad } from "@/lib/actor";
import { tieneAccesoAPortal } from "@/lib/acceso-portal";
import { epocaDe } from "@/lib/epoca-sesion";
import { NAV_PLATAFORMA, navegacionErp, navegacionPortal } from "@/lib/navegacion";

import type { DatosShell } from "./marco-shell";
import { conPortalActual, ETIQUETA_ROL, PORTALES, portalesVisibles } from "./portales";

/** Datos del shell (navegación, portales, empresa y usuario) de una identidad. Sin contadores: la
 * barra lateral ya no los lleva (ADR-045). El contador de la campana lo carga la propia campana. */
export function datosShell(identidad: Identidad, portal: string): DatosShell {
  const { usuario, actual, membresias } = identidad;
  const rol = actual && esRol(actual.rol) ? actual.rol : null;
  const vertical = actual?.tenant.vertical ?? "";
  const inicio = PORTALES.find((p) => p.id === portal)?.href ?? "/";
  const visibles = portalesVisibles(actual?.portales ?? [], tieneAccesoAPortal(identidad, "platform"));
  // Acceso efectivo al portal actual, calculado igual que `tieneAccesoAPortal` del servidor
  // (plataforma por `platformRole`, los demás por la membresía). Lo usa el shell para no ofrecer
  // búsqueda, ⌘K ni Preferencias sin acceso (`marco-shell.tsx`), y aquí para la navegación.
  const acceso = tieneAccesoAPortal(identidad, portal);
  // Sin acceso al portal el shell se monta igual (`portal-layout.tsx`), pero sin navegación: solo el
  // selector de portal y empresa, el menú de usuario y el aviso «Sin permisos» de la página.
  const nav = !acceso
    ? []
    : portal === "erp"
      ? navegacionErp(
          rol,
          identidad.modulosActivos,
          vocabulario(esVertical(vertical) ? vertical : "seguridad"),
        )
      : portal === "platform"
        ? NAV_PLATAFORMA
        : navegacionPortal(inicio, portal);
  return {
    portal,
    acceso,
    epoca: epocaDe(usuario.id, actual?.tenantId ?? null),
    nav,
    // Sin acceso, el portal actual no está en `visibles`; `conPortalActual` lo antepone para que el
    // selector lo nombre (ADR-050, #54), aunque la navegación vaya vacía (H1).
    portales: conPortalActual(visibles, portal),
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
