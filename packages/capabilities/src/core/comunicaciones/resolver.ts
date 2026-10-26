import {
  type Canal,
  COMUNICABLES_NUCLEO,
  type EventoComunicable,
  type MarcaCorreo,
  type PlantillaBase,
} from "@opai/domain";
import type { TenantTx } from "@opai/db";

/** Catálogo comunicable: núcleo (los módulos declararán los suyos en su manifest, ADR-020). */
export function comunicables(): readonly EventoComunicable[] {
  return COMUNICABLES_NUCLEO;
}

export const comunicableDe = (evento: string) => comunicables().find((e) => e.evento === evento);

export type PlantillaVigente = PlantillaBase & { version: number | null };

/** Versión activa editada por el tenant o, si no hay, la plantilla por defecto (version null). */
export async function plantillaVigente(
  db: TenantTx,
  e: EventoComunicable,
  canal: Canal,
): Promise<PlantillaVigente | null> {
  const propia = await db.plantilla.findFirst({
    where: { evento: e.evento, canal, activa: true },
    orderBy: { version: "desc" },
  });
  if (propia)
    return { asunto: propia.asunto ?? "", cuerpo: propia.cuerpo, version: propia.version };
  const base = e.plantillas[canal];
  return base ? { ...base, version: null } : null;
}

/** Marca para correos desde el perfil del tenant (ADR-028); el remitente, del ajuste de comunicaciones. */
export async function marcaDe(
  db: TenantTx,
  tenantId: string,
  urlBase: string,
): Promise<MarcaCorreo> {
  const [tenant, perfil] = await Promise.all([
    db.tenant.findUnique({ where: { id: tenantId }, select: { nombre: true, slug: true } }),
    db.perfilEmpresa.findUnique({ where: { tenantId } }),
  ]);
  const nombre = perfil?.nombreComercial ?? tenant?.nombre ?? "OPAI";
  const legal = [
    perfil?.razonSocial,
    perfil?.rut ? `RUT ${perfil.rut}` : null,
    perfil?.calle,
    perfil?.comuna,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    nombre,
    logoUrl:
      perfil?.logoPrincipalId && tenant
        ? `${urlBase}/api/marca/${tenant.slug}/logoPrincipal`
        : null,
    colorPrimario: perfil?.colorPrimario ?? null,
    pieLegal: legal || null,
  };
}
