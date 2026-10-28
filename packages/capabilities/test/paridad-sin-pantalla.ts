/**
 * Capacidades `soloPersonas` que todavía no tienen camino humano en `apps/web` (gate I-13 de la
 * auditoría del Núcleo, CAR-52). Por MCP y API key están bloqueadas por diseño, así que sin pantalla
 * nadie las puede ejecutar en el producto: cada una lleva el encargo que la construye y desde cuándo
 * espera. `paridad-camino-humano.test.ts` exige que toda `soloPersonas` tenga pantalla o esté aquí, y
 * que esta lista no guarde entradas obsoletas (al construir la pantalla, se borra la fila).
 */
export type SinPantalla = { encargo: string; desde: string; motivo: string };

const B3 = "Alcance del supervisor (B3): la pantalla de instalaciones a cargo es el bloque 9 del Brief 07c.";
const B4 = "Ley 21.719 (B4): Configuración → Privacidad y datos personales, Brief 07d.";

export const SOLO_PERSONAS_SIN_PANTALLA: Readonly<Record<string, SinPantalla>> = {
  "core.supervisores.asignar": { encargo: "CAR-38", desde: "2026-10-28", motivo: B3 },
  "core.supervisores.quitar": { encargo: "CAR-38", desde: "2026-10-28", motivo: B3 },
  "core.cumplimiento.dpa_aceptar": { encargo: "CAR-39", desde: "2026-10-28", motivo: B4 },
  "core.cumplimiento.dpo_set": { encargo: "CAR-39", desde: "2026-10-28", motivo: B4 },
  "core.cumplimiento.consentimiento_registrar": {
    encargo: "CAR-39",
    desde: "2026-10-28",
    motivo: B4,
  },
  "core.cumplimiento.consentimiento_revocar": {
    encargo: "CAR-39",
    desde: "2026-10-28",
    motivo: B4,
  },
  "core.cumplimiento.solicitud_crear": { encargo: "CAR-39", desde: "2026-10-28", motivo: B4 },
  "core.cumplimiento.solicitud_avanzar": { encargo: "CAR-39", desde: "2026-10-28", motivo: B4 },
  "core.cumplimiento.solicitud_resolver": { encargo: "CAR-39", desde: "2026-10-28", motivo: B4 },
  "core.cumplimiento.solicitud_exportar": { encargo: "CAR-39", desde: "2026-10-28", motivo: B4 },
  "core.cumplimiento.incidente_registrar": { encargo: "CAR-39", desde: "2026-10-28", motivo: B4 },
  "core.cumplimiento.incidente_avanzar": { encargo: "CAR-39", desde: "2026-10-28", motivo: B4 },
  "core.cumplimiento.incidente_notificar": { encargo: "CAR-39", desde: "2026-10-28", motivo: B4 },
  "core.cumplimiento.titular_anonimizar": { encargo: "CAR-39", desde: "2026-10-28", motivo: B4 },
};
