import { z } from "zod";

import { defineCapability, type Contexto } from "@opai/capabilities";

import { GPS_ESTADOS, METODOS } from "../domain";
import { fecha } from "./dias-capacidades";
import { ETIQUETA_GPS, ETIQUETA_METODO, ETIQUETA_TIPO, nombreCompleto } from "./formato";
import { alcanceMarcas } from "./lecturas";
import { marcaVistaEnriquecidaSchema, uuid, vistaDeMarca } from "./esquemas";

const MAX_DIAS = 62;
const METODOS_PIN = ["rut_pin", "pin_respaldo"] as const;

export const marcasListar = defineCapability({
  id: "asistencia.marcas.listar",
  descripcion:
    "Lista marcas legales con filtros (instalación, persona, fechas, método, GPS y búsqueda por trabajador o hash), paginada por cursor. El trabajador ve solo las suyas; el supervisor las de sus instalaciones.",
  permiso: null,
  portales: ["erp", "supervisor", "trabajador", "terreno"],
  input: z
    .object({
      personaId: uuid.optional(),
      instalacionId: uuid.optional(),
      desde: fecha,
      hasta: fecha,
      metodoFamilia: z.enum(["rostro", "pin"]).optional(),
      metodo: z.enum(METODOS).optional(),
      gpsEstado: z.enum(GPS_ESTADOS).optional(),
      q: z.string().trim().max(80).optional(),
      cursor: z.string().uuid().optional(),
      limite: z.number().int().min(1).max(200).default(50),
    })
    .refine((i) => i.hasta >= i.desde, "«hasta» no puede ser anterior a «desde».")
    .refine((i) => Date.parse(i.hasta) - Date.parse(i.desde) <= MAX_DIAS * 86_400_000, `Como máximo ${MAX_DIAS} días.`),
  output: z.object({ items: z.array(marcaVistaEnriquecidaSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  auditarLectura: (s) => s.items.map((m) => m.id),
  async handler(ctx, i) {
    const alcance = await alcanceMarcas(ctx);
    const personasBusqueda = i.q ? await buscarPersonas(ctx, i.q) : [];
    const filas = await ctx.db.marca.findMany({
      where: whereMarcas(
        {
          desde: i.desde,
          hasta: i.hasta,
          ...(i.personaId ? { personaId: i.personaId } : {}),
          ...(i.instalacionId ? { instalacionId: i.instalacionId } : {}),
          ...(i.metodoFamilia ? { metodoFamilia: i.metodoFamilia } : {}),
          ...(i.metodo ? { metodo: i.metodo } : {}),
          ...(i.gpsEstado ? { gpsEstado: i.gpsEstado } : {}),
          ...(i.q ? { q: i.q } : {}),
        },
        alcance,
        personasBusqueda,
      ),
      orderBy: [{ horaServidor: "desc" }, { id: "desc" }],
      take: i.limite + 1,
      ...(i.cursor ? { cursor: { id: i.cursor }, skip: 1 } : {}),
    });
    const pagina = filas.slice(0, i.limite);
    const enriquecidas = await enriquecerMarcas(ctx, pagina);
    return {
      items: enriquecidas,
      siguiente: filas.length > i.limite ? (pagina.at(-1)?.id ?? null) : null,
    };
  },
});

type FiltroMarcas = {
  desde: string;
  hasta: string;
  personaId?: string;
  instalacionId?: string;
  metodoFamilia?: "rostro" | "pin";
  metodo?: (typeof METODOS)[number];
  gpsEstado?: (typeof GPS_ESTADOS)[number];
  q?: string;
};

function whereMarcas(i: FiltroMarcas, alcance: Awaited<ReturnType<typeof alcanceMarcas>>, personasBusqueda: string[]) {
  const metodos =
    i.metodo !== undefined ? [i.metodo] : i.metodoFamilia === "rostro" ? ["rostro"] : i.metodoFamilia === "pin" ? [...METODOS_PIN] : undefined;
  const busqueda =
    i.q && personasBusqueda.length > 0
      ? { OR: [{ hash: { startsWith: i.q, mode: "insensitive" as const } }, { personaId: { in: personasBusqueda } }] }
      : i.q
        ? { hash: { startsWith: i.q, mode: "insensitive" as const } }
        : {};
  return {
    horaServidor: {
      gte: new Date(`${i.desde}T00:00:00.000Z`),
      lte: new Date(`${i.hasta}T23:59:59.999Z`),
    },
    ...(i.gpsEstado ? { gpsEstado: i.gpsEstado } : {}),
    ...(metodos ? { metodo: { in: metodos } } : {}),
    AND: [alcance, i.instalacionId ? { instalacionId: i.instalacionId } : {}, i.personaId ? { personaId: i.personaId } : {}, busqueda],
  };
}

async function buscarPersonas(ctx: Contexto, q: string) {
  const filas = await ctx.db.persona.findMany({
    where: {
      OR: [
        { nombres: { contains: q, mode: "insensitive" } },
        { apellidos: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true },
    take: 40,
  });
  return filas.map((p) => p.id);
}

type FilaMarca = Parameters<typeof vistaDeMarca>[0];

async function enriquecerMarcas(ctx: Contexto, filas: FilaMarca[]) {
  const personaIds = [...new Set(filas.map((m) => m.personaId))];
  const instalacionIds = [...new Set(filas.map((m) => m.instalacionId))];
  const dispositivoIds = [...new Set(filas.map((m) => m.dispositivoId).filter(Boolean))] as string[];
  const [personas, instalaciones, dispositivos] = await Promise.all([
    ctx.db.persona.findMany({ where: { id: { in: personaIds } }, select: { id: true, nombres: true, apellidos: true } }),
    ctx.db.instalacion.findMany({ where: { id: { in: instalacionIds } }, select: { id: true, nombre: true } }),
    dispositivoIds.length
      ? ctx.db.dispositivo.findMany({ where: { id: { in: dispositivoIds } }, select: { id: true, nombre: true } })
      : Promise.resolve([]),
  ]);
  const nombresP = new Map(personas.map((p) => [p.id, nombreCompleto(p)]));
  const nombresI = new Map(instalaciones.map((x) => [x.id, x.nombre]));
  const nombresD = new Map(dispositivos.map((d) => [d.id, d.nombre]));
  return filas.map((f) => {
    const vista = vistaDeMarca(f);
    return {
      ...vista,
      dispositivoId: f.dispositivoId ?? null,
      dispositivoNombre: f.dispositivoId ? (nombresD.get(f.dispositivoId) ?? null) : null,
      personaNombre: nombresP.get(f.personaId) ?? f.personaId,
      instalacionNombre: nombresI.get(f.instalacionId) ?? f.instalacionId,
      tipoEtiqueta: ETIQUETA_TIPO[vista.tipo] ?? vista.tipo,
      metodoEtiqueta: ETIQUETA_METODO[vista.metodo] ?? vista.metodo,
      gpsEtiqueta: ETIQUETA_GPS[vista.gpsEstado] ?? vista.gpsEstado,
    };
  });
}