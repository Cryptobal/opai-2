// Lector HTTP del exportador opai1-export/v1 (Brief B2). Zod en el borde; paginación estable.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import type { DatosOpai1 } from "./origen";
import type { LectorOrigen } from "./origen-lectores";
import { validarDatos } from "./origen-lectores";
import { normalizarDatosExport } from "./origen-api-normalizar";

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
  "cpqQuotes",
  "activities",
  "users",
];

function armarDatos(acumulado: Record<string, unknown[]>): DatosOpai1 {
  return normalizarDatosExport(validarDatos(acumulado));
}

async function fetchPagina(url: string, key: string, cursor: string | null) {
  const u = new URL(url);
  if (cursor) u.searchParams.set("cursor", cursor);
  const res = await fetch(u, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Exportador OPAI 1.0 respondió ${res.status}`);
  return paginaExport.parse(await res.json());
}

export function lectorApiOpai1(baseUrl = process.env.OPAI1_EXPORT_URL): LectorOrigen {
  return {
    descripcion: "opai1",
    async leer() {
      const url = baseUrl?.trim();
      const key = process.env.OPAI1_EXPORT_KEY?.trim();
      if (!url || !key) {
        throw new Error(
          "Faltan OPAI1_EXPORT_URL y OPAI1_EXPORT_KEY. Usa --origen fixtures:<ruta>.",
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
      return armarDatos(acumulado);
    },
  };
}

export function lectorContratoFixtures(dir: string): LectorOrigen {
  return {
    descripcion: "fixtures-export",
    async leer() {
      const acumulado: Record<string, unknown[]> = Object.fromEntries(RECURSOS.map((r) => [r, []]));
      for (const recurso of RECURSOS) {
        let archivos: string[];
        try {
          archivos = readdirSync(join(dir, recurso))
            .filter((f) => f.endsWith(".json"))
            .sort();
        } catch {
          continue;
        }
        for (const f of archivos) {
          const pagina = paginaExport.parse(JSON.parse(readFileSync(join(dir, recurso, f), "utf8")));
          acumulado[recurso]?.push(...pagina.filas);
        }
      }
      return armarDatos(acumulado);
    },
  };
}
