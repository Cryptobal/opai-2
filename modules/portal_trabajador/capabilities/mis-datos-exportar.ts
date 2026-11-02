import { z } from "zod";

import { defineCapability } from "@opai/capabilities";

import { personaPropia } from "./persona-propia";

const PORTALES = ["trabajador"] as const;

const exportSchema = z.object({
  version: z.literal(1),
  generadoEn: z.string(),
  titular: z.object({
    nombres: z.string(),
    apellidos: z.string(),
    rut: z.string(),
    fechaNacimiento: z.string().nullable(),
    nacionalidad: z.string().nullable(),
  }),
  contacto: z.object({
    telefono: z.string().nullable(),
    emailPersonal: z.string().nullable(),
    emailLaboral: z.string().nullable(),
    direccion: z.string().nullable(),
    comuna: z.string().nullable(),
    region: z.string().nullable(),
  }),
  vinculos: z.array(
    z.object({
      cargo: z.string().nullable(),
      instalacion: z.string().nullable(),
      puesto: z.string().nullable(),
      tipo: z.string(),
      inicio: z.string().nullable(),
      termino: z.string().nullable(),
      estado: z.string(),
    }),
  ),
});

export const misDatosExportar = defineCapability({
  id: "portal_trabajador.mis_datos.exportar",
  descripcion:
    "Genera la exportación de portabilidad de la propia persona del trabajador (Ley 21.719, art. 9): datos personales, ficha laboral y vínculos recientes en JSON legible, sin identificadores internos del sistema. Solo lectura auditada como exportación ARCO de portabilidad.",
  permiso: null,
  portales: PORTALES,
  auditarLectura: () => ["ARCO_PORTABILIDAD"],
  input: z.object({}),
  output: z.object({
    nombreArchivo: z.string(),
    contenido: exportSchema,
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const p = await personaPropia(ctx);
    const vinculos = await ctx.db.vinculoLaboral.findMany({
      where: { personaId: p.id },
      orderBy: { inicio: "desc" },
      take: 20,
      include: { cargo: true, instalacion: true, puesto: true },
    });
    const dia = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
    const generadoEn = new Date().toISOString();
    const contenido = {
      version: 1 as const,
      generadoEn,
      titular: {
        nombres: p.nombres,
        apellidos: p.apellidos,
        rut: p.rut,
        fechaNacimiento: dia(p.fechaNacimiento),
        nacionalidad: p.nacionalidad,
      },
      contacto: {
        telefono: p.telefono,
        emailPersonal: p.emailPersonal,
        emailLaboral: p.emailLaboral,
        direccion: p.direccionFormateada ?? p.calle,
        comuna: p.comuna,
        region: p.region,
      },
      vinculos: vinculos.map((v) => ({
        cargo: v.cargo?.nombre ?? null,
        instalacion: v.instalacion?.nombre ?? null,
        puesto: v.puesto?.nombre ?? null,
        tipo: v.tipo,
        inicio: dia(v.inicio),
        termino: dia(v.termino),
        estado: v.estado,
      })),
    };
    const fecha = generadoEn.slice(0, 10);
    return { nombreArchivo: `mis-datos-opai-${fecha}.json`, contenido };
  },
});
