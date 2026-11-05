import { datosSiHayPermiso } from "@/lib/carga";
import type { Contadores } from "@/lib/navegacion";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import { type Grupo, GRUPOS, grupoPorId } from "./grupos";
import { seccionModulo } from "./seccion-modulo";
import { SECCIONES, type Seccion } from "./secciones";

type Modulo = { id: string; nombre: string; estado: string | null };

export type GrupoConEntradas = { grupo: Grupo; entradas: Seccion[] };

/**
 * Entradas visibles agrupadas en los 6 grupos cerrados, en el orden de `grupos.ts`. Un grupo sin
 * entradas visibles no aparece (REGLA §3.7): la portada no pinta su tarjeta y su lista responde
 * «Sin permiso». No lee nada nuevo: parte de las secciones que ya trae `cargarIndice`.
 */
export function agruparVisibles(secciones: readonly Seccion[]): GrupoConEntradas[] {
  return GRUPOS.map((grupo) => ({
    grupo,
    entradas: secciones.filter((s) => s.grupo === grupo.id),
  })).filter((g) => g.entradas.length > 0);
}

/**
 * Grupo al que pertenece una sección (para las migas «Configuración › <Grupo>» y el «atrás» de
 * teléfono de cada entrada). Los módulos con ajustes (`modulo-<id>`) viven en el grupo `modulos`.
 */
export function grupoDeSeccion(id: string): Grupo | undefined {
  if (id === "modulo-agente") return grupoPorId("agentes");
  if (id.startsWith("modulo-")) return grupoPorId("modulos");
  const s = SECCIONES.find((x) => x.id === id);
  return s ? grupoPorId(s.grupo) : undefined;
}

/** Índice visible para el usuario: ámbitos según sus permisos efectivos y módulos con ajustes propios. */
export async function cargarIndice() {
  const identidad = await requerirIdentidad("/configuracion");
  const rol = identidad.actual?.rol;
  // Permisos efectivos (ADR-022): rol personalizado y excepciones, no solo el rol base (QA 1.1).
  const puede = puedeDeIdentidad(identidad);
  const [mods, esquema, n] = await Promise.all([
    ejecutarComoUsuario<Modulo[]>("erp", "core.modules.list"),
    ejecutarComoUsuario<{ modulo: string }[]>("erp", "core.config.schema", {}),
    ejecutarComoUsuario<Contadores>("erp", "core.resumen.contadores", {
      campos: ["aprobacionesPendientes"],
    }),
  ]);
  const conAjustes = new Set(datosSiHayPermiso(esquema, []).map((c) => c.modulo));
  const activos = datosSiHayPermiso(mods, []).filter(
    (m) => m.estado === "activo" || m.estado === "trial" || m.estado === "solo_lectura",
  );
  const idsActivos = new Set(activos.map((m) => m.id));
  const modulos = activos
    .filter((m) => conAjustes.has(m.id))
    .map((m) =>
      m.id === "agente"
        ? {
            ...seccionModulo(m.id, m.nombre),
            grupo: "agentes" as const,
            titulo: "Agente interno",
            descripcion: "El asistente de OPAI dentro del ERP: modelo, límites y sugerencias",
            href: "/configuracion/grupo/agentes/agente-interno",
          }
        : seccionModulo(m.id, m.nombre),
    );
  // Las entradas de un módulo (CAR-182: Facturación electrónica y Folios) piden el módulo activo.
  const secciones: Seccion[] = [...SECCIONES, ...modulos].filter(
    (x) => puede(x.permiso) && (x.modulo === undefined || idsActivos.has(x.modulo)),
  );
  return {
    secciones,
    aprobaciones: n.ok ? (n.data.aprobacionesPendientes ?? 0) : 0,
    nombre: identidad.usuario.nombre,
    empresa: identidad.actual?.tenant.nombre ?? "",
    rol: rol ?? null,
    // Acceso efectivo para que las páginas calculen sus `puede*` (ADR-022) sin volver a leerlo.
    acceso: identidad.acceso,
  };
}

export type Indice = Awaited<ReturnType<typeof cargarIndice>>;
