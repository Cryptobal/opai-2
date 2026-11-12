import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { listarBuscadores, resultadoBusquedaSchema } from "./buscadores";
import { dondeContacto, dondeCuenta, dondeInstalacion, dondePersona } from "./alcance";

const MAX = 5;
const resultado = resultadoBusquedaSchema;

const contiene = (q: string) => ({ contains: q, mode: "insensitive" as const });

export const buscar = defineCapability({
  auditarLectura: (s) => [...s.cuentas, ...s.personas, ...s.contactos, ...s.otros.flatMap((g) => g.items)].map((r) => r.id),
  id: "core.buscar",
  descripcion:
    "Búsqueda global (paleta ⌘K y agentes): cuentas, instalaciones, personas y contactos, más lo que aportan los módulos activos (negocios, cotizaciones y solicitudes de Comercial), hasta 5 de cada uno y solo de lo que el actor puede ver.",
  permiso: null,
  input: z.object({ q: z.string().trim().min(2).max(120) }),
  output: z.object({
    cuentas: z.array(resultado),
    instalaciones: z.array(resultado),
    personas: z.array(resultado),
    contactos: z.array(resultado),
    /** Aportes de los módulos (CAR-301): un grupo por buscador, solo los que el actor puede ver. */
    otros: z.array(z.object({ grupo: z.string(), titulo: z.string(), items: z.array(resultado) })),
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, { q }) {
    const puede = (p: string) => ctx.autorizar(p);
    const rut = q.replace(/[.\s]/g, "").toUpperCase();
    const vacio = Promise.resolve([]);
    const aportes = listarBuscadores().filter((b) => puede(b.permiso));
    const [cuentas, instalaciones, personas, contactos, otros] = await Promise.all([
      puede(PERMISOS_CORE.cuentasRead)
        ? ctx.db.cuenta.findMany({
            where: {
              AND: [dondeCuenta(ctx)],
              archivadaEn: null,
              OR: [
                { nombre: contiene(q) },
                { razonSocial: contiene(q) },
                { rut: { startsWith: rut } },
              ],
            },
            orderBy: { nombre: "asc" },
            take: MAX,
          })
        : vacio,
      puede(PERMISOS_CORE.instalacionesRead)
        ? ctx.db.instalacion.findMany({
            where: {
              AND: [dondeInstalacion(ctx)],
              archivadaEn: null,
              OR: [{ nombre: contiene(q) }, { comuna: contiene(q) }],
            },
            orderBy: { nombre: "asc" },
            take: MAX,
          })
        : vacio,
      puede(PERMISOS_CORE.personasRead)
        ? ctx.db.persona.findMany({
            where: {
              AND: [dondePersona(ctx)],
              archivadaEn: null,
              OR: [
                { nombres: contiene(q) },
                { apellidos: contiene(q) },
                { rut: { startsWith: rut } },
              ],
            },
            orderBy: { apellidos: "asc" },
            take: MAX,
          })
        : vacio,
      puede(PERMISOS_CORE.cuentasRead)
        ? ctx.db.contacto.findMany({
            where: {
              AND: [dondeContacto(ctx)],
              archivadoEn: null,
              OR: [{ nombres: contiene(q) }, { apellidos: contiene(q) }, { email: contiene(q) }],
            },
            orderBy: { apellidos: "asc" },
            take: MAX,
          })
        : vacio,
      Promise.all(aportes.map(async (b) => ({ grupo: b.grupo, titulo: b.titulo, items: await b.buscar(ctx, q) }))),
    ]);
    return {
      otros: otros.filter((g) => g.items.length > 0),
      cuentas: cuentas.map((c) => ({
        id: c.id,
        titulo: c.nombre,
        detalle: c.rut ?? null,
        href: `/cuentas/${c.id}`,
      })),
      instalaciones: instalaciones.map((i) => ({
        id: i.id,
        titulo: i.nombre,
        detalle: i.comuna ?? null,
        href: `/instalaciones/${i.id}`,
      })),
      personas: personas.map((p) => ({
        id: p.id,
        titulo: `${p.nombres} ${p.apellidos}`,
        detalle: p.rut,
        href: `/personas/${p.id}`,
      })),
      contactos: contactos.map((k) => ({
        id: k.id,
        titulo: `${k.nombres} ${k.apellidos}`,
        detalle: k.email ?? null,
        href: `/cuentas/${k.cuentaId}/contactos`,
      })),
    };
  },
});
