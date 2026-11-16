import { accesoPlataforma, type Prisma } from "@opai/db";

import { listarModulos, obtenerModulo } from "../module";
import { plataformaEnDb } from "../plataforma-db";
import type { Plataforma } from "../types";

const EPOCA = "1970-01-01T00:00:00.000Z";
const WHERE = { modulo_clave: { modulo: "modulos", clave: "vistos" } };
const ACTIVOS = new Set(["activo", "trial", "solo_lectura"]);

type Vistos = Record<string, string>;
type Empresa = { id: string; activarModulosNuevosDesde: Date | null };

function idsDelCatalogo(): string[] {
  return listarModulos()
    .map((m) => m.id)
    .filter((id) => id !== "core");
}

function comoVistos(valor: unknown): Vistos | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  const out: Vistos = {};
  for (const [k, v] of Object.entries(valor)) if (typeof v === "string") out[k] = v;
  return out;
}

async function guardarVistos(p: Plataforma, vistos: Vistos, version: number) {
  const valor = JSON.parse(JSON.stringify(vistos)) as Prisma.InputJsonValue;
  await p.globales.guardarAjuste({
    where: WHERE,
    create: { modulo: "modulos", clave: "vistos", valor },
    update: { valor, version },
  });
}

/** Dependencias primero. Un ciclo se deja fuera: el siguiente pase lo reintenta. */
function ordenar(ids: string[]): string[] {
  const pendientes = new Set(ids);
  const salida: string[] = [];
  while (pendientes.size) {
    const listo = [...pendientes].find((id) =>
      (obtenerModulo(id)?.dependencias ?? []).every((d) => !pendientes.has(d)),
    );
    if (!listo) break;
    pendientes.delete(listo);
    salida.push(listo);
  }
  return salida;
}

async function activarModulo(p: Plataforma, id: string, tenants: Empresa[]) {
  const manifest = obtenerModulo(id);
  if (!manifest) return { activados: 0, completo: true };
  let activados = 0;
  let completo = true;
  for (const t of tenants) {
    const filas = await p.empresa(t.id).modulos();
    const estado = new Map(filas.map((f) => [f.moduloId, f.estado]));
    if (estado.has(id)) continue;
    const falta = manifest.dependencias.some(
      (d) => d !== "core" && !ACTIVOS.has(estado.get(d) ?? ""),
    );
    if (falta) {
      completo = false;
      continue;
    }
    await p.empresa(t.id).fijarModulo(id, "activo");
    await p.empresa(t.id).sembrarModulo(id);
    await p.globales.auditarPlataforma({
      actorTipo: "system",
      actorId: null,
      viaUserId: null,
      capability: "platform.modules.set",
      tenantObjetivoId: t.id,
      origenTenantId: null,
      entityType: "tenant_module",
      entityId: id,
      payload: { moduloId: id, estado: "activo", origen: "modulos_nuevos" },
      antes: null,
      despues: "activo",
    });
    activados += 1;
  }
  return { activados, completo };
}

/**
 * La primera vez anota el catálogo actual con época y no activa nada.
 * Después, cada id nuevo queda activo en las empresas cuya marca es anterior o igual.
 * Una fila ya existente (aunque esté suspendida) no se pisa. Si falta una dependencia, se reintenta.
 */
export async function aplicarModulosNuevos(p: Plataforma): Promise<{ activados: number }> {
  const ids = idsDelCatalogo();
  const previo = await p.globales.ajustePorClave(WHERE);
  const vistos = comoVistos(previo?.valor);
  if (!vistos) {
    await guardarVistos(p, Object.fromEntries(ids.map((id) => [id, EPOCA])), 1);
    return { activados: 0 };
  }
  const ahora = new Date().toISOString();
  const nuevos = ordenar(ids.filter((id) => !(id in vistos)));
  if (!nuevos.length) return { activados: 0 };
  const tenants = (await p.globales.tenantsConModulosNuevos()).filter(
    (t) =>
      t.activarModulosNuevosDesde != null && t.activarModulosNuevosDesde.toISOString() <= ahora,
  );
  let activados = 0;
  const siguientes = { ...vistos };
  for (const id of nuevos) {
    const r = await activarModulo(p, id, tenants);
    activados += r.activados;
    if (r.completo) siguientes[id] = ahora;
  }
  await guardarVistos(p, siguientes, (previo?.version ?? 0) + 1);
  return { activados };
}

/** Cron: catálogo real y empresas con la opción encendida. */
export function aplicarModulosNuevosRegistrados(): Promise<{ activados: number }> {
  return aplicarModulosNuevos(plataformaEnDb(accesoPlataforma));
}
