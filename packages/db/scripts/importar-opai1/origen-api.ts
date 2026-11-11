// Lector HTTP del exportador opai1-export/v1 (Brief B2). Zod en el borde; paginación estable.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import type { DatosOpai1 } from "./origen";
import type { LectorOrigen } from "./origen-lectores";
import { validarDatos } from "./origen-lectores";
import {
  acumuladoVacio,
  agregarFila,
  NOMBRES_RECURSOS_V1,
  type Acumulado,
} from "./origen-api-contrato";
import { normalizarDatosExport } from "./origen-api-normalizar";

const paginaExport = z.object({
  version: z.literal("opai1-export/v1"),
  generadoEn: z.string(),
  recurso: z.string(),
  cursor: z.string().nullable(),
  siguiente: z.string().nullable(),
  filas: z.array(z.unknown()),
});

function armarDatos(acumulado: Acumulado): DatosOpai1 {
  return normalizarDatosExport(validarDatos(acumulado));
}

const TIMEOUT_MS = 30_000;
const MAX_PAGINAS = 2_000;

/** Todas las filas deben venir de una sola empresa de 1.0 (y de la esperada, si se indica). */
export function verificarEmpresaOrigen(vistas: ReadonlySet<string>, esperada?: string): void {
  if (vistas.size > 1) throw new Error("El exportador devolvió filas de más de una empresa de 1.0");
  const [unica] = [...vistas];
  if (esperada && unica && unica !== esperada) {
    throw new Error("La empresa de 1.0 del exportador no es la esperada (OPAI1_EXPORT_TENANT)");
  }
}

async function fetchPagina(url: string, key: string, cursor: string | null) {
  const u = new URL(url);
  if (cursor) u.searchParams.set("cursor", cursor);
  const res = await fetch(u, {
    headers: { Authorization: `Bearer ${key}` },
    // El exportador no redirige: seguir una redirección llevaría la llave a otro destino.
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Exportador OPAI 1.0 respondió ${res.status}`);
  return paginaExport.parse(await res.json());
}

/**
 * Lector del exportador de 1.0. Sin `credenciales` usa las variables de entorno del ensayo local; la
 * capacidad `comercial.importar_1_0` le pasa la llave del almacén cifrado de la empresa.
 */
export function lectorApiOpai1(
  baseUrl = process.env.OPAI1_EXPORT_URL,
  credenciales?: { key: string },
): LectorOrigen {
  return {
    descripcion: "opai1",
    async leer() {
      const url = baseUrl?.trim();
      const key = (credenciales?.key ?? process.env.OPAI1_EXPORT_KEY)?.trim();
      if (!url || !key) {
        throw new Error(
          "Faltan OPAI1_EXPORT_URL y OPAI1_EXPORT_KEY. Usa --origen fixtures:<ruta>.",
        );
      }
      const acumulado = acumuladoVacio();
      const empresas = new Set<string>();
      for (const recurso of NOMBRES_RECURSOS_V1) {
        let cursor: string | null = null;
        const cursores = new Set<string>();
        for (let n = 1; ; n++) {
          if (n > MAX_PAGINAS) throw new Error(`Exportador OPAI 1.0: más de ${MAX_PAGINAS} páginas en ${recurso}`);
          const pagina = await fetchPagina(`${url.replace(/\/$/, "")}/${recurso}`, key, cursor);
          for (const fila of pagina.filas) {
            const t = (fila as { tenantId?: unknown } | null)?.tenantId;
            if (typeof t === "string") empresas.add(t);
            agregarFila(acumulado, recurso, fila);
          }
          cursor = pagina.siguiente;
          if (!cursor) break;
          if (cursores.has(cursor)) throw new Error(`Exportador OPAI 1.0: cursor repetido en ${recurso}`);
          cursores.add(cursor);
        }
      }
      verificarEmpresaOrigen(empresas, process.env.OPAI1_EXPORT_TENANT?.trim());
      return armarDatos(acumulado);
    },
  };
}

export function lectorContratoFixtures(dir: string): LectorOrigen {
  return {
    descripcion: "fixtures-export",
    async leer() {
      const acumulado = acumuladoVacio();
      for (const recurso of NOMBRES_RECURSOS_V1) {
        let archivos: string[];
        try {
          archivos = readdirSync(join(dir, recurso))
            .filter((f) => f.endsWith(".json"))
            .sort();
        } catch {
          continue;
        }
        for (const f of archivos) {
          const pagina = paginaExport.parse(
            JSON.parse(readFileSync(join(dir, recurso, f), "utf8")),
          );
          for (const fila of pagina.filas) agregarFila(acumulado, recurso, fila);
        }
      }
      return armarDatos(acumulado);
    },
  };
}
