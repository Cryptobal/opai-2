// Lector HTTP del exportador opai1-export/v1 (Brief B2). Zod en el borde; paginación estable.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import { type DatosOpai1, type LectorOrigen, validarDatos } from "./origen";

const paginaExport = z.object({
  version: z.literal("opai1-export/v1"),
  generadoEn: z.string(),
  recurso: z.string(),
  cursor: z.string().nullable(),
  siguiente: z.string().nullable(),
  filas: z.array(z.unknown()),
});

const RECURSOS: (keyof DatosOpai1)[] = [
  "accounts",
  "contacts",
  "installations",
  "pipelineStages",
  "deals",
  "dealStageHistory",
  "dealContacts",
  "recurringInvoiceSchedules",
  "users",
];

async function fetchPagina(url: string, key: string, cursor: string | null) {
  const u = new URL(url);
  if (cursor) u.searchParams.set("cursor", cursor);
  const res = await fetch(u, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Exportador OPAI 1.0 respondió ${res.status}`);
  const crudo: unknown = await res.json();
  return paginaExport.parse(crudo);
}

export function lectorApiOpai1(baseUrl = process.env.OPAI1_EXPORT_URL): LectorOrigen {
  return {
    descripcion: "opai1",
    async leer() {
      const url = baseUrl?.trim();
      const key = process.env.OPAI1_EXPORT_KEY?.trim();
      if (!url || !key) {
        throw new Error(
          "Faltan OPAI1_EXPORT_URL y OPAI1_EXPORT_KEY en la sesión. Usa --origen fixtures:<ruta>.",
        );
      }
      const acumulado: Record<string, unknown[]> = Object.fromEntries(RECURSOS.map((r) => [r, []]));
      for (const recurso of RECURSOS) {
        let cursor: string | null = null;
        for (;;) {
          const pagina = await fetchPagina(`${url.replace(/\/$/, "")}/${recurso}`, key, cursor);
          acumulado[recurso]?.push(...pagina.filas);
          cursor = pagina.siguiente;
          if (!cursor) break;
        }
      }
      return validarDatos(acumulado);
    },
  };
}

/** Une páginas JSON ficticias del contrato (tests). */
export function lectorContratoFixtures(dir: string): LectorOrigen {
  return {
    descripcion: "fixtures-export",
    async leer() {
      const acumulado: Record<string, unknown[]> = Object.fromEntries(RECURSOS.map((r) => [r, []]));
      for (const recurso of RECURSOS) {
        const carpeta = join(dir, recurso);
        let archivos: string[] = [];
        try {
          archivos = readdirSync(carpeta)
            .filter((f) => f.endsWith(".json"))
            .sort();
        } catch {
          continue;
        }
        for (const f of archivos) {
          const pagina = paginaExport.parse(JSON.parse(readFileSync(join(carpeta, f), "utf8")));
          acumulado[recurso]?.push(...pagina.filas);
        }
      }
      return validarDatos(acumulado);
    },
  };
}
