import { exigirDatos } from "@/lib/carga";
import { estadoPantalla } from "@/lib/formato";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import type { Incidente, Solicitud } from "./tipos";

export type EstadoDpa = {
  versionVigente: string;
  publicada: boolean;
  aceptadaVigente: boolean;
  pendiente: boolean;
  ultima: Aceptacion | null;
  historial: Aceptacion[];
  dpo: { nombre: string | null; correo: string | null; telefono: string | null };
};
type Aceptacion = {
  version: string;
  aceptadoPorNombre: string | null;
  aceptadoPorCorreo: string | null;
  aceptadoEn: string;
};
export type TextoDpa = { versionVigente: string; texto: string | null; sha256: string | null };
export type Actividad = {
  id: number;
  actividad: string;
  base: string;
  retencion: string | null;
  retencionPendiente: boolean;
  destinatarios: string[];
};

/** Resumen: estado del DPA y del DPO, texto vigente del DPA y el RAT (3 consultas en paralelo). */
export async function cargarResumen() {
  const [estado, texto, rat] = await Promise.all([
    ejecutarComoUsuario<EstadoDpa>("erp", "core.cumplimiento.estado", {}),
    ejecutarComoUsuario<TextoDpa>("erp", "core.cumplimiento.dpa_texto", {}),
    ejecutarComoUsuario<{ basesPropuestas: boolean; actividades: Actividad[] }>(
      "erp",
      "core.cumplimiento.rat",
      {},
    ),
  ]);
  return {
    // Las tres comparten `cumplimiento:read`: si falla una, la página no muestra datos a medias (CAR-50).
    state: estadoPantalla(estado, texto, rat),
    estado: estado.ok ? estado.data : null,
    texto: texto.ok ? texto.data : null,
    rat: rat.ok ? rat.data : null,
  };
}

/** Bandeja de solicitudes (filtro por estado y tipo; cursor) y la elegida con `?ver=`. */
export async function cargarSolicitudes(p: Parametros) {
  const [r, yo] = await Promise.all([
    ejecutarComoUsuario<{ items: Solicitud[]; siguiente: string | null }>(
      "erp",
      "core.cumplimiento.solicitudes_listar",
      {
        limite: 50,
        ...(p["estado"] ? { estado: p["estado"] } : {}),
        ...(p["tipo"] ? { tipo: p["tipo"] } : {}),
        ...(p["cursor"] ? { cursor: p["cursor"] } : {}),
      },
    ),
    identidadActual(),
  ]);
  const items = r.ok ? r.data.items : [];
  // La elegida puede no estar en la página actual: se pide aparte (lectura auditada, NÚCLEO-H).
  let actual = items.find((s) => s.id === p["ver"]) ?? null;
  if (!actual && p["ver"]) {
    const una = await ejecutarComoUsuario<Solicitud>("erp", "core.cumplimiento.solicitud_obtener", {
      id: p["ver"],
    });
    // Un id viejo en `?ver=` (NOT_FOUND) deja la bandeja sin elegida; otro fallo va a `ErrorCarga` (CAR-50).
    actual = una.ok ? una.data : una.error.code === "NOT_FOUND" ? null : exigirDatos(una);
  }
  return {
    state: estadoPantalla(r),
    items,
    siguiente: r.ok ? r.data.siguiente : null,
    actual,
    yo: yo?.usuario.id ?? null,
  };
}

/** Registro de incidentes y avisos de brecha, con el elegido por `?ver=<casoId>`. */
export async function cargarIncidentes(p: Parametros) {
  const r = await ejecutarComoUsuario<{ items: Incidente[] }>(
    "erp",
    "core.cumplimiento.incidentes_listar",
    { limite: 100 },
  );
  const items = r.ok ? r.data.items : [];
  return {
    state: estadoPantalla(r),
    items,
    actual: items.find((i) => i.casoId === p["ver"]) ?? null,
  };
}
