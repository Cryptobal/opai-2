import { z } from "zod";

import { conflicto, defineCapability, prohibido, reglaDeNegocio } from "@opai/capabilities";
import { horaValida, PERMISOS_CORE } from "@opai/domain";

import { cargarOferta } from "../persistencia/puestos-oferta";
import { resolverPuestos } from "../persistencia/puestos-resolver";
import { uuidSchema } from "./esquemas";
import { PERMISO_PUESTOS_CONFIRMAR } from "./permisos";

const hora = z.string().refine(horaValida, 'Hora "HH:mm" de 00:00 a 23:59.');

export const puestoConfirmadoSchema = z.object({
  puestoId: uuidSchema.nullable(),
  nombre: z.string(),
  lineaId: uuidSchema,
  instalacionId: uuidSchema,
});

/**
 * Crear puestos al ganar (R2): RRHH confirma lo que ofrece la cotización aceptada y cada posición
 * nace como un puesto en PPC «Sin asignar» (core.puestos). Es irreversible para los agentes (quedan
 * en aprobación humana) y nunca se crea nada sin esta confirmación. Idempotente: lo ya creado no se
 * repite (`cpq.puestos_creados`, único por línea y posición). Puede ajustar instalación, cargo,
 * nombre, función, patrón, horario y tramo de noche antes de crear. Copia al puesto la función, el tramo de noche y las horas semanales (calculadas con el mismo cálculo que usan la Pauta y Asistencia, ADR-078). El sueldo cotizado no se copia al puesto: la estructura
 * de sueldo es de Nómina (07b) y se fija ahí.
 */
export const puestosConfirmar = defineCapability({
  id: "cpq.puestos.confirmar",
  descripcion:
    "IRREVERSIBLE: RRHH confirma los puestos que ofrece la cotización aceptada y los crea en la instalación (una posición por puesto, en PPC «Sin asignar»), con ajustes opcionales de instalación, cargo, nombre, patrón y horario. Repetirla no duplica. Un agente queda en aprobación humana.",
  permiso: PERMISO_PUESTOS_CONFIRMAR,
  input: z.object({
    cotizacionId: uuidSchema,
    puestos: z
      .array(
        z.object({
          lineaId: uuidSchema,
          cantidad: z.number().int().min(1).max(200).optional().describe("Cuántas posiciones crear; por defecto todas las pendientes."),
          instalacionId: uuidSchema.optional(),
          cargoId: uuidSchema.optional(),
          nombre: z.string().trim().min(2).max(100).optional().describe("Nombre base; se numera por posición."),
          patronId: uuidSchema.optional(),
          horaInicio: hora.optional(),
          horaFin: hora.optional(),
          funcionId: uuidSchema.optional().describe("Función operativa del catálogo (guardia, nochero…)."),
          horaInicioNoche: hora.optional().describe("Tramo de noche de una rotación día/noche: inicio."),
          horaFinNoche: hora.optional().describe("Tramo de noche de una rotación día/noche: término."),
        }),
      )
      .min(1)
      .max(100),
  }),
  output: z.object({
    creados: z.array(puestoConfirmadoSchema),
    yaCreados: z.number().int().describe("Posiciones que ya existían y no se repitieron."),
  }),
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    if (!ctx.autorizar(PERMISOS_CORE.instalacionesManage))
      throw prohibido("Crear puestos exige poder gestionar instalaciones.");
    const oferta = await cargarOferta(ctx, input.cotizacionId);
    const { planes, yaCreados } = await resolverPuestos(ctx, oferta.items, input.puestos);
    const vista = planes.map((p) => ({
      puestoId: null,
      nombre: p.nombre,
      lineaId: p.lineaId,
      instalacionId: p.datos.instalacionId,
    }));
    if (!planes.length) {
      throw reglaDeNegocio("Todos los puestos elegidos ya estaban creados.");
    }
    if (dryRun) return { creados: vista, yaCreados };
    try {
      const creados = await ctx.transaccion(async (tx) => {
        const hechos: z.infer<typeof puestoConfirmadoSchema>[] = [];
        for (const p of planes) {
          const puesto = await tx.puesto.create({
            data: {
              ...p.datos,
              tenantId: ctx.tenantId,
              notas: `Creado desde la cotización ${oferta.cotizacion.codigo}`,
            },
          });
          await tx.cpqPuestoCreado.create({
            data: {
              tenantId: ctx.tenantId,
              lineaId: p.lineaId,
              posicion: p.posicion,
              puestoId: puesto.id,
              confirmadoPorId: ctx.usuario!.id,
            },
          });
          await ctx.eventos.emitir(tx, {
            tipo: "core.puesto.creado",
            entidadTipo: "puesto",
            entidadId: puesto.id,
            payload: {},
          });
          hechos.push({
            puestoId: puesto.id,
            nombre: p.nombre,
            lineaId: p.lineaId,
            instalacionId: p.datos.instalacionId,
          });
        }
        await ctx.eventos.emitir(tx, {
          tipo: "cpq.puestos.confirmados",
          entidadTipo: "cotizacion",
          entidadId: oferta.cotizacion.id,
          payload: { cantidad: hechos.length },
        });
        return hechos;
      });
      return { creados, yaCreados };
    } catch (e) {
      if ((e as { code?: unknown } | null)?.code === "P2002")
        throw conflicto("Otra persona ya creó esos puestos: recarga la oferta.");
      throw e;
    }
  },
});
