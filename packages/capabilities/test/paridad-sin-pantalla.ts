/**
 * Capacidades `soloPersonas` que todavía no tienen camino humano en `apps/web` (gate I-13 de la
 * auditoría del Núcleo, CAR-52). Por MCP y API key están bloqueadas por diseño, así que sin pantalla
 * nadie las puede ejecutar en el producto: cada una lleva el encargo que la construye y desde cuándo
 * espera. `paridad-camino-humano.test.ts` exige que toda `soloPersonas` tenga pantalla o esté aquí, y
 * que esta lista no guarde entradas obsoletas (al construir la pantalla, se borra la fila).
 */
export type SinPantalla = { encargo: string; desde: string; motivo: string };

export const SOLO_PERSONAS_SIN_PANTALLA: Readonly<Record<string, SinPantalla>> = {
  "core.users.restablecer_mfa": {
    encargo: "CAR-54",
    desde: "2026-10-29",
    motivo:
      "Restablecer el MFA de un usuario desde su ficha (owner): las pantallas de MFA no tienen diseño aprobado en Claude Design (export-acceso/README.md).",
  },
  "platform.usuarios.restablecer_mfa": {
    encargo: "CAR-54",
    desde: "2026-10-29",
    motivo:
      "Restablecer el MFA desde Plataforma: los usuarios de plataforma aún no tienen pantalla y las de MFA no tienen diseño aprobado.",
  },
  "platform.usuarios.borrar": {
    encargo: "CAR-45",
    desde: "2026-10-29",
    motivo:
      "Borrar la cuenta de un usuario sin empresas desde Plataforma: los usuarios de plataforma aún no tienen pantalla con diseño aprobado.",
  },
};
