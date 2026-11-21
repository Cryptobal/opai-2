import { z } from "zod";

import {
  PERMISOS_PLATAFORMA,
  dependenciaFaltante,
  entradaCatalogo,
  entradasComplementoCatalogo,
  esComplementoCatalogo,
  padreComplementoCatalogo,
} from "@opai/domain";

import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { listarModulos, obtenerModulo } from "../module";
import { requierePlataforma } from "./comun";
import { emailSchema, uuidSchema } from "./esquemas";
import { invitacionCreadaSchema } from "./invitations";
import { invitarAdministrador } from "./platform-escritura";

// «solo_lectura» cuenta como activo para las dependencias: sus datos se ven y se leen (CAR-188).
const ACTIVOS = new Set(["activo", "trial", "solo_lectura"]);

export const platformModulesSet = defineCapability({
  id: "platform.modules.set",
  descripcion:
    "Plataforma: activa, pone en trial, en solo lectura (se ve y se lee, no se escribe) o suspende un módulo de una empresa. Valida dependencias del manifest en ambos sentidos. Cambia lo que la empresa puede hacer y lo que se le cobra: un agente con key de plataforma queda en aprobación humana.",
  permiso: PERMISOS_PLATAFORMA.modulesManage,
  sinTenant: true,
  input: z.object({
    tenantId: uuidSchema,
    moduloId: z.string().min(1),
    estado: z.enum(["activo", "trial", "solo_lectura", "suspendido"]),
  }),
  output: z.object({ moduloId: z.string(), estado: z.string(), anterior: z.string().nullable() }),
  // Irreversible para agentes (CAR-188, hoja de Plataforma §2.9): suspender o dejar en solo lectura
  // un módulo corta lo que un cliente puede hacer; un agente con key de plataforma pide aprobación.
  efecto: "irreversible",
  dryRun: true,
  tenantObjetivo: (input) => input.tenantId,
  cambio: (s) => ({ antes: s.anterior, despues: s.estado }),
  async handler(ctx, input, { dryRun }) {
    if (input.moduloId === "core") throw reglaDeNegocio("El núcleo siempre está activo.");
    const manifest = obtenerModulo(input.moduloId);
    const complemento = !manifest && esComplementoCatalogo(input.moduloId);
    const entrada = complemento ? entradaCatalogo(input.moduloId) : null;
    if (!manifest && !entrada) throw noEncontrado(`El módulo "${input.moduloId}"`);
    const e = requierePlataforma(ctx).empresa(input.tenantId);
    const filas = await e.modulos();
    const estado = new Map(filas.map((f) => [f.moduloId, f.estado]));
    const contratadas = idsActivos(estado);

    if (ACTIVOS.has(input.estado)) {
      if (manifest) {
        const faltan = manifest.dependencias.filter((d) => !ACTIVOS.has(estado.get(d) ?? ""));
        if (faltan.length) throw reglaDeNegocio(`Activa antes: ${faltan.join(", ")}.`);
      } else if (entrada) {
        const falta = dependenciaFaltante(input.moduloId, contratadas);
        if (falta) throw reglaDeNegocio(falta);
      }
    } else {
      const dependientes = listarModulos()
        .filter(
          (m) => m.dependencias.includes(input.moduloId) && ACTIVOS.has(estado.get(m.id) ?? ""),
        )
        .map((m) => m.nombre);
      if (dependientes.length)
        throw reglaDeNegocio(`Lo usan módulos activos: ${dependientes.join(", ")}.`);
    }
    const anterior = estado.get(input.moduloId) ?? null;
    if (!dryRun) {
      await e.fijarModulo(input.moduloId, input.estado);
      if (manifest && ACTIVOS.has(input.estado)) await e.sembrarModulo(input.moduloId);
      if (manifest && !ACTIVOS.has(input.estado)) {
        for (const c of complementosActivosDelPadre(input.moduloId, estado)) {
          await e.fijarModulo(c, "suspendido");
        }
      }
    }
    return { moduloId: input.moduloId, estado: input.estado, anterior };
  },
});

function idsActivos(estado: Map<string, string>) {
  const out = new Set<string>();
  for (const [id, est] of estado) if (ACTIVOS.has(est)) out.add(id);
  return out;
}

function complementosActivosDelPadre(padreId: string, estado: Map<string, string>) {
  return entradasComplementoCatalogo()
    .filter((c) => padreComplementoCatalogo(c.id) === padreId && ACTIVOS.has(estado.get(c.id) ?? ""))
    .map((c) => c.id);
}

export const platformAdminsInvite = defineCapability({
  id: "platform.admins.invite",
  descripcion:
    "Plataforma: invita a un owner o admin a una empresa (por ejemplo, su primer administrador).",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({
    tenantId: uuidSchema,
    email: emailSchema,
    rol: z.enum(["owner", "admin"]).default("owner"),
  }),
  output: invitacionCreadaSchema,
  // Irreversible (ADR-055): invitar un owner abre todos los datos de la empresa; un agente con key
  // de plataforma queda en aprobación humana salvo autonomía directa dada por plataforma.
  efecto: "irreversible",
  dryRun: true,
  tenantObjetivo: (input) => input.tenantId,
  async handler(ctx, input, { dryRun }) {
    const tenant = await requierePlataforma(ctx).globales.tenantPorId(input.tenantId);
    if (!tenant) throw noEncontrado("La empresa");
    return invitarAdministrador(ctx, tenant, input.email, input.rol, dryRun);
  },
});
