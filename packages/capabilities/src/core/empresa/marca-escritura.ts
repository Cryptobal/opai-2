import { definidos, escribirConEvento } from "../maestros/comun";
import type { Contexto } from "../../types";
import { fusionarMarcaDocumento, persistirMarcaDocumento } from "./marca-documento";
import { perfilDe } from "./empresa";

const LOGOS = ["logoPrincipalId", "logoClaroId", "logoOscuroId", "isotipoId", "faviconId"] as const;
const DOC_CAMPOS = ["documentoTipografia", "documentoPiePagina", "documentoCondicionesDefault"] as const;

type MarcaInput = Record<string, string | null | undefined>;

function partesMarcaInput(raw: MarcaInput) {
  const docInput = Object.fromEntries(
    DOC_CAMPOS.filter((k) => raw[k] !== undefined).map((k) => [k, raw[k]]),
  );
  const data = definidos(
    Object.fromEntries(Object.entries(raw).filter(([k]) => !DOC_CAMPOS.includes(k as (typeof DOC_CAMPOS)[number]))),
  );
  return { data, docInput, logos: LOGOS };
}

/** Persiste marca visual y campos documentales en una sola transacción. */
export async function guardarMarca<T>(
  ctx: Contexto,
  input: MarcaInput,
  vista: (p: Partial<Record<string, unknown>> | null) => Promise<T>,
  validarLogo: (id: string) => Promise<void>,
  dryRun: boolean,
): Promise<T> {
  for (const k of LOGOS) {
    const id = input[k];
    if (id) await validarLogo(id);
  }
  const { data, docInput } = partesMarcaInput(input);
  const actual = await perfilDe(ctx);
  if (dryRun) return vista({ ...actual, ...data, ...fusionarMarcaDocumento(actual, docInput) });
  const r = await escribirConEvento(
    ctx,
    {
      tipo: "core.marca.actualizada",
      entidadTipo: "perfil_empresa",
      payload: () => ({ campos: [...Object.keys(data), ...Object.keys(docInput)] }),
    },
    async (tx) => {
      const base =
        Object.keys(data).length > 0
          ? await tx.perfilEmpresa.upsert({
              where: { tenantId: ctx.tenantId },
              create: { ...data, tenantId: ctx.tenantId },
              update: data,
            })
          : ((await tx.perfilEmpresa.findUnique({ where: { tenantId: ctx.tenantId } })) ??
            (await tx.perfilEmpresa.create({ data: { tenantId: ctx.tenantId } })));
      if (Object.keys(docInput).length) {
        await persistirMarcaDocumento(
          { ...ctx, db: tx },
          fusionarMarcaDocumento(base, docInput),
        );
      }
      return base;
    },
  );
  return vista(r);
}