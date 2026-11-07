import { z } from "zod";

import { normalizarDocumento } from "@opai/domain";

import { instalacionEnAlcance, dondeInstalacionId } from "../rondas/comun";
import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado, reglaDeNegocio } from "../errores";
import { huellasCandidatas, huellaVigente } from "./huella";
import {
  entradaListaSchema,
  PERMISO_LISTAS,
  TIPOS_LISTA,
  TIPOS_REGISTRO,
  vistaEntrada,
} from "./comun";

const fecha = z.string().datetime({ offset: true });

export const listasListar = defineCapability({
  id: "acceso.listas.listar",
  descripcion:
    "Lista las entradas autorizadas y bloqueadas de una instalación, con el documento enmascarado, la vigencia, los días y el horario. El motivo de un bloqueo solo lo ve quien gestiona listas; nunca se devuelve el número completo.",
  permiso: PERMISO_LISTAS,
  input: z.object({ instalacionId: uuidSchema, tipo: z.enum(TIPOS_LISTA).optional() }),
  output: z.array(entradaListaSchema),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (salida) => salida.map((e) => e.id),
  async handler(ctx, { instalacionId, tipo }) {
    await instalacionEnAlcance(ctx, instalacionId);
    const filas = await ctx.db.entradaLista.findMany({
      where: { AND: [{ instalacionId }, dondeInstalacionId(ctx)], ...(tipo ? { tipo } : {}) },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return filas.map(vistaEntrada);
  },
});

export const listasAgregar = defineCapability({
  id: "acceso.listas.agregar",
  descripcion:
    "Agrega una persona o documento a la lista autorizada o bloqueada de una instalación, con vigencia, días, horario y tipos de registro. Se guarda solo la huella y la máscara del documento, nunca el número. Un bloqueo exige motivo y, para un agente, aprobación humana.",
  permiso: PERMISO_LISTAS,
  input: z.object({
    instalacionId: uuidSchema,
    tipo: z.enum(TIPOS_LISTA),
    documento: z
      .object({
        tipo: z.enum(["run", "pasaporte", "otro"]),
        numero: z.string().min(1).max(40),
        pais: z.string().min(2).max(3).optional(),
      })
      .strict(),
    nombre: z.string().trim().min(2).max(120).optional(),
    motivo: z.string().trim().min(3).max(300).optional(),
    tiposRegistro: z.array(z.enum(TIPOS_REGISTRO)).max(5).default([]),
    vigenteDesde: fecha.optional(),
    vigenteHasta: fecha.optional(),
    dias: z.array(z.number().int().min(0).max(6)).max(7).default([]),
    desdeMin: z.number().int().min(0).max(1439).optional(),
    hastaMin: z.number().int().min(0).max(1439).optional(),
    usoUnico: z.boolean().default(false),
  }),
  output: entradaListaSchema,
  efecto: "escritura",
  dryRun: true,
  // El número del documento nunca queda en la auditoría ni en las aprobaciones.
  sensibles: ["documento"],
  exigeAprobacion: (i) => i.tipo === "bloqueada",
  async handler(ctx, i, { dryRun }) {
    await instalacionEnAlcance(ctx, i.instalacionId);
    if (i.tipo === "bloqueada" && !i.motivo) throw reglaDeNegocio("Un bloqueo necesita motivo.");
    if ((i.desdeMin === undefined) !== (i.hastaMin === undefined))
      throw reglaDeNegocio("El horario necesita desde y hasta.");
    if (i.vigenteDesde && i.vigenteHasta && i.vigenteDesde >= i.vigenteHasta)
      throw reglaDeNegocio("La vigencia termina antes de empezar.");
    const d = normalizarDocumento({
      tipo: i.documento.tipo,
      numero: i.documento.numero,
      ...(i.documento.pais === undefined ? {} : { pais: i.documento.pais }),
    });
    if (!d) throw reglaDeNegocio("El documento no es válido.");
    const candidatas = huellasCandidatas({
      tenantId: ctx.tenantId,
      tipo: d.tipo,
      clave: d.clave,
    }).map((h) => h.huella);
    const ya = await ctx.db.entradaLista.findFirst({
      where: {
        instalacionId: i.instalacionId,
        tipo: i.tipo,
        docTipo: d.tipo,
        huella: { in: candidatas },
      },
      select: { id: true },
    });
    if (ya) throw reglaDeNegocio("Este documento ya está en la lista.");
    const h = huellaVigente({ tenantId: ctx.tenantId, tipo: d.tipo, clave: d.clave });
    const data = {
      tenantId: ctx.tenantId,
      instalacionId: i.instalacionId,
      tipo: i.tipo,
      docTipo: d.tipo,
      huella: h.huella,
      huellaKid: h.kid,
      mascara: d.mascara,
      nombre: i.nombre ?? null,
      motivo: i.motivo ?? null,
      tiposRegistro: i.tiposRegistro,
      vigenteDesde: i.vigenteDesde ? new Date(i.vigenteDesde) : null,
      vigenteHasta: i.vigenteHasta ? new Date(i.vigenteHasta) : null,
      dias: i.dias,
      desdeMin: i.desdeMin ?? null,
      hastaMin: i.hastaMin ?? null,
      usoUnico: i.usoUnico,
    };
    if (dryRun) return vistaEntrada({ ...data, id: "00000000-0000-0000-0000-000000000000" });
    return vistaEntrada(await ctx.db.entradaLista.create({ data }));
  },
});

export const listasQuitar = defineCapability({
  id: "acceso.listas.quitar",
  descripcion:
    "Quita una entrada de la lista autorizada o bloqueada de una instalación. Si la entrada ya se usó en algún ingreso no se borra: queda vencida desde ahora, para conservar el historial.",
  permiso: PERMISO_LISTAS,
  input: z.object({ id: uuidSchema }),
  output: z.object({ id: uuidSchema, accion: z.enum(["eliminada", "vencida"]) }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id }, { dryRun }) {
    const e = await ctx.db.entradaLista.findFirst({
      where: { AND: [{ id }, dondeInstalacionId(ctx)] },
      include: { registros: { select: { id: true }, take: 1 } },
    });
    if (!e) throw noEncontrado("La entrada de lista");
    const usada = e.registros.length > 0;
    if (!dryRun) {
      if (usada)
        await ctx.db.entradaLista.update({ where: { id }, data: { vigenteHasta: new Date() } });
      else await ctx.db.entradaLista.delete({ where: { id } });
    }
    return { id, accion: usada ? ("vencida" as const) : ("eliminada" as const) };
  },
});
