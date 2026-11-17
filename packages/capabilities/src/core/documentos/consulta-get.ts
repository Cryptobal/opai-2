import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado } from "../../errores";
import { uuidSchema } from "../esquemas";
import { hoy } from "../maestros/comun";
import { documentosEnAlcance, entidadesEnAlcance, vinculoEnAlcance } from "./alcance-doc";
import { tiposPorId } from "./consulta";
import { filtroDocumentoSensible } from "./sensibles";
import { documentoSchema, vistaDocumento } from "./vista";

export const documentosGet = defineCapability({
  auditarLectura: (s) => [s.id, ...s.versiones.map((d) => d.id)],
  id: "core.documentos.get",
  descripcion:
    "Un documento con sus vínculos (propietario y referencias) y la cadena de versiones anteriores.",
  permiso: PERMISOS_CORE.documentosRead,
  input: z.object({ id: uuidSchema }),
  output: documentoSchema.extend({
    vinculos: z.array(
      z.object({ entidadTipo: z.string(), entidadId: z.string(), rol: z.string() }),
    ),
    versiones: z.array(documentoSchema),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const d = await ctx.db.documento.findFirst({
      where: { id: input.id, ...filtroDocumentoSensible(ctx) },
    });
    if (!d) throw noEncontrado("El documento");
    const alc = await entidadesEnAlcance(ctx);
    const permitidos = await documentosEnAlcance(ctx, alc);
    if (permitidos && !permitidos.includes(d.id)) throw noEncontrado("El documento");
    const vinculosTodos = await ctx.db.documentoVinculo.findMany({ where: { documentoId: d.id } });
    const vinculos = alc
      ? vinculosTodos.filter((v) => vinculoEnAlcance(alc, v.entidadTipo, v.entidadId))
      : vinculosTodos;
    const versiones = [];
    for (let previo = d.reemplazaAId, n = 0; previo && n < 50; n++) {
      const v = await ctx.db.documento.findFirst({
        where: { id: previo, ...filtroDocumentoSensible(ctx) },
      });
      if (!v) break;
      if (!permitidos || permitidos.includes(v.id)) versiones.push(v);
      previo = v.reemplazaAId;
    }
    const tipos = await tiposPorId(ctx, [d.tipoId, ...versiones.map((v) => v.tipoId)]);
    const vista = (x: typeof d) => vistaDocumento(x, x.tipoId ? tipos.get(x.tipoId) : null, hoy());
    return {
      ...vista(d),
      vinculos: vinculos.map((v) => ({
        entidadTipo: v.entidadTipo,
        entidadId: v.entidadId,
        rol: v.rol,
      })),
      versiones: versiones.map(vista),
    };
  },
});