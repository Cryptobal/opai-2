import {
  actualizarMarcaDocumento,
  marcaDocumentoDe,
  marcaDocumentoEnVersion as marcaDocEnVersion,
  type TipografiaDocumento,
} from "@opai/capabilities";
import type { Contexto } from "@opai/capabilities";

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

function vistaDeDoc(
  doc: ReturnType<typeof marcaDocumentoDe> & { version?: number },
  perfil: Awaited<ReturnType<typeof perfilMarca>>,
  version: number,
): MarcaDocumentoVista {
  return {
    version,
    tipografia: doc.documentoTipografia,
    piePagina: doc.documentoPiePagina,
    condicionesDefault: doc.documentoCondicionesDefault,
    ...perfil,
  };
}

export async function asegurarMarcaDocumento(ctx: Contexto) {
  const cpq = await ctx.db.cpqMarcaDocumento.findUnique({ where: { tenantId: ctx.tenantId } });
  if (cpq) return cpq;
  const doc = marcaDocumentoDe(
    await ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } }),
  );
  return ctx.db.cpqMarcaDocumento.create({
    data: {
      tenantId: ctx.tenantId,
      version: 1,
      tipografia: doc.documentoTipografia,
      piePagina: doc.documentoPiePagina,
      condicionesDefault: doc.documentoCondicionesDefault,
    },
  });
}

export async function vistaMarcaDocumento(ctx: Contexto): Promise<MarcaDocumentoVista> {
  const [perfil, cpq] = await Promise.all([
    perfilMarca(ctx),
    ctx.db.cpqMarcaDocumento.findUnique({ where: { tenantId: ctx.tenantId } }),
  ]);
  const doc = marcaDocumentoDe(
    await ctx.db.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } }),
  );
  return vistaDeDoc(doc, perfil, cpq?.version ?? 0);
}

export async function marcaDocumentoEnVersion(
  ctx: Contexto,
  version: number,
): Promise<MarcaDocumentoVista | null> {
  const hist = await marcaDocEnVersion(ctx, version);
  if (!hist) return null;
  const perfil = await perfilMarca(ctx);
  return vistaDeDoc(hist, perfil, hist.version);
}

export async function actualizarMarcaDocumentoCpq(
  ctx: Contexto,
  data: Partial<Pick<MarcaDocumentoVista, "tipografia" | "piePagina" | "condicionesDefault">>,
  escribir: boolean,
) {
  const input: Parameters<typeof actualizarMarcaDocumento>[1] = {};
  if (data.tipografia !== undefined) input.documentoTipografia = data.tipografia;
  if (data.piePagina !== undefined) input.documentoPiePagina = data.piePagina;
  if (data.condicionesDefault !== undefined) input.documentoCondicionesDefault = data.condicionesDefault;
  return actualizarMarcaDocumento(ctx, input, escribir);
}