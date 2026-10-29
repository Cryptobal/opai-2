/**
 * Capacidades `soloPersonas` que todavía no tienen camino humano en `apps/web` (gate I-13 de la
 * auditoría del Núcleo, CAR-52). Por MCP y API key están bloqueadas por diseño, así que sin pantalla
 * nadie las puede ejecutar en el producto: cada una lleva el encargo que la construye y desde cuándo
 * espera. `paridad-camino-humano.test.ts` exige que toda `soloPersonas` tenga pantalla o esté aquí, y
 * que esta lista no guarde entradas obsoletas (al construir la pantalla, se borra la fila).
 */
export type SinPantalla = { encargo: string; desde: string; motivo: string };

export const SOLO_PERSONAS_SIN_PANTALLA: Readonly<Record<string, SinPantalla>> = {};
