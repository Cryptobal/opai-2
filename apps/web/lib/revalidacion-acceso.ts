import { createHash } from "node:crypto";
import { prohibido } from "@opai/capabilities";

import type { Identidad } from "./actor";
import { tieneAccesoAPortal } from "./acceso-portal";
import { verificarMfaDe } from "./mfa";

const ordenadas = (valores: readonly string[]) => [...new Set(valores)].sort();

/** Solo datos de autorización; nombres, correos y orden de consultas no cambian el acceso. */
function datosHuella(i: Identidad, portal: string | null) {
  const m = i.actual;
  return {
    usuario: i.usuario.id,
    portal,
    plataforma: i.usuario.platformRole,
    membresia: m?.id,
    tenant: m?.tenantId,
    estadoTenant: m?.tenant.estado,
    estado: m?.estado,
    rol: m?.rol,
    portales: ordenadas(m?.portales ?? []),
    permisos: i.acceso.permisosRol === null ? null : ordenadas(i.acceso.permisosRol),
    excepciones: i.acceso.excepciones.map((e) => JSON.stringify([e.permiso, e.conceder])).sort(),
    instalaciones: i.acceso.instalaciones === null ? null : ordenadas(i.acceso.instalaciones),
    modulos: ordenadas(i.modulosActivos),
    soloLectura: ordenadas(i.modulosSoloLectura ?? []),
    mfaActiva: i.mfaActiva,
    mfaVerificada: i.mfaVerificada === true,
  };
}

function huella(i: Identidad, portal: string | null): string {
  return createHash("sha256")
    .update(JSON.stringify(datosHuella(i, portal)))
    .digest("hex");
}

/** Solo los nombres de los campos que cambiaron (nunca sus valores): para diagnosticar sin datos. */
function camposDistintos(a: Identidad, b: Identidad, portal: string | null): string[] {
  const x = datosHuella(a, portal);
  const y = datosHuella(b, portal);
  return (Object.keys(x) as (keyof typeof x)[]).filter(
    (k) => JSON.stringify(x[k]) !== JSON.stringify(y[k]),
  );
}

/** Falla ante cambios reales; nunca sustituye el tenant ni el contexto transaccional del caller. */
export function crearRevalidacionAcceso(
  inicial: Identidad,
  portal: string | null,
  leerActual: () => Promise<Identidad | null>,
  verificarMfa: typeof verificarMfaDe = verificarMfaDe,
): () => Promise<string> {
  const esperada = huella(inicial, portal);
  const tenantId = inicial.actual?.tenantId;
  return async () => {
    const actual = await leerActual();
    const motivo = !tenantId
      ? "sin_empresa"
      : !actual
        ? "sin_sesion"
        : actual.actual?.tenantId !== tenantId
          ? "otra_empresa"
          : actual.actual.estado !== "activa"
            ? "membresia_inactiva"
            : actual.actual.tenant.estado === "suspendido"
              ? "empresa_suspendida"
              : portal !== null && !tieneAccesoAPortal(actual, portal)
                ? "sin_portal"
                : huella(actual, portal) !== esperada
                  ? "acceso_distinto"
                  : (await verificarMfa(actual))
                    ? "segundo_factor"
                    : null;
    if (motivo) {
      // Diagnóstico categórico (CAR-333): ni ids ni valores, solo el motivo y los campos distintos.
      console.warn("[agente] revalidacion_denegada", {
        evento: "agente.revalidacion_denegada",
        motivo,
        ...(motivo === "acceso_distinto" && actual
          ? { campos: camposDistintos(inicial, actual, portal) }
          : {}),
      });
      throw prohibido("Tu acceso cambió durante la solicitud. Vuelve a abrir el agente.");
    }
    return esperada;
  };
}
