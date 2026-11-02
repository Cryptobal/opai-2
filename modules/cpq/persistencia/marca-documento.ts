import type { Contexto } from "@opai/capabilities";

import type { TipografiaDocumento } from "../domain/documento/bloques";

export type MarcaDocumentoVista = {
  version: number;
  tipografia: TipografiaDocumento;
  piePagina: string | null;
  condicionesDefault: string | null;
  nombreComercial: string | null;
  razonSocial: string | null;
  rut: string | null;
  direccion: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  logoUrl: string | null;
};

async function perfilMarca(ctx: Contexto) {
  const [perfil, tenant] = await Promise.all([
    ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } }),
    ctx.db.tenant.findUnique({ where: { id: ctx.tenantId }, select: { slug: true } }),
  ]);
  const dir = [perfil?.calle, perfil?.comuna, perfil?.region].filter(Boolean).join(", ");
  const logoUrl = perfil?.logoPrincipalId
    ? `${ctx.servicios.urlBase}/api/marca/${tenant?.slug ?? ""}/logoPrincipal`
    : null;
  return {
    nombreComercial: perfil?.nombreComercial ?? null,
    razonSocial: perfil?.razonSocial ?? null,
    rut: perfil?.rut ?? null,
    direccion: dir || null,
    colorPrimario: perfil?.colorPrimario ?? null,
    colorSecundario: perfil?.colorSecundario ?? null,
    logoUrl,
  };
}

export async function asegurarMarcaDocumento(ctx: Contexto) {
  let row = await ctx.db.cpqMarcaDocumento.findUnique({ where: { tenantId: ctx.tenantId } });
  if (!row) {
    row = await ctx.db.cpqMarcaDocumento.create({
      data: { tenantId: ctx.tenantId, version: 1, tipografia: "inter" },
    });
  }
  return row;
}

export async function vistaMarcaDocumento(ctx: Contexto): Promise<MarcaDocumentoVista> {
  const row = await ctx.db.cpqMarcaDocumento.findUnique({ where: { tenantId: ctx.tenantId } });
  const perfil = await perfilMarca(ctx);
  if (!row) {
    return {
      version: 0,
      tipografia: "inter",
      piePagina: null,
      condicionesDefault: null,
      ...perfil,
    };
  }
  return {
    version: row.version,
    tipografia: row.tipografia as TipografiaDocumento,
    piePagina: row.piePagina,
    condicionesDefault: row.condicionesDefault,
    ...perfil,
  };
}

export async function marcaDocumentoEnVersion(
  ctx: Contexto,
  version: number,
): Promise<MarcaDocumentoVista | null> {
  const actual = await ctx.db.cpqMarcaDocumento.findUnique({ where: { tenantId: ctx.tenantId } });
  if (!actual) return vistaMarcaDocumento(ctx);
  if (actual.version === version) return vistaMarcaDocumento(ctx);
  const rev = await ctx.db.cpqMarcaDocumentoRevision.findFirst({
    where: { marcaDocumentoId: actual.id, version },
  });
  if (!rev) return null;
  const perfil = await perfilMarca(ctx);
  return {
    version: rev.version,
    tipografia: rev.tipografia as TipografiaDocumento,
    piePagina: rev.piePagina,
    condicionesDefault: rev.condicionesDefault,
    ...perfil,
  };
}

export async function actualizarMarcaDocumento(
  ctx: Contexto,
  data: Partial<Pick<MarcaDocumentoVista, "tipografia" | "piePagina" | "condicionesDefault">>,
  escribir: boolean,
) {
  const actual = await asegurarMarcaDocumento(ctx);
  const merged = {
    tipografia: data.tipografia ?? (actual.tipografia as TipografiaDocumento),
    piePagina: data.piePagina !== undefined ? data.piePagina : actual.piePagina,
    condicionesDefault:
      data.condicionesDefault !== undefined ? data.condicionesDefault : actual.condicionesDefault,
  };
  if (!escribir) return { ...actual, ...merged };
  return ctx.transaccion(async (tx) => {
    await tx.cpqMarcaDocumentoRevision.create({
      data: {
        tenantId: ctx.tenantId,
        marcaDocumentoId: actual.id,
        version: actual.version,
        tipografia: actual.tipografia,
        piePagina: actual.piePagina,
        condicionesDefault: actual.condicionesDefault,
      },
    });
    return tx.cpqMarcaDocumento.update({
      where: { id: actual.id },
      data: { ...merged, version: { increment: 1 } },
    });
  });
}
