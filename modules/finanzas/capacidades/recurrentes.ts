import { z } from "zod";

import { defineCapability, noEncontrado, reglaDeNegocio } from "@opai/capabilities";

import { uuidSchema } from "./esquemas";
import { PERMISO_CONFIGURAR, PERMISO_VER } from "./permisos";
import { motivoInvalido, recurrenteDatos, recurrenteSchema, vistaRecurrente } from "./recurrentes-esquemas";
import { aFecha, filaDe, ID_VISTA_PREVIA } from "./util";

export const recurrentesListar = defineCapability({
  id: "finanzas.recurrentes.listar",
  descripcion:
    "Lista los gastos recurrentes del flujo de caja (arriendo, honorarios, cuotas de impuestos, provisiones): concepto, monto y su unidad (CLP, UF o % de ventas), frecuencia, día de pago, vigencia y fila del flujo donde se proyectan.",
  permiso: PERMISO_VER,
  input: z.object({
    filaId: uuidSchema.optional(),
    incluirInactivos: z.boolean().default(false),
    incluirTramosAnteriores: z
      .boolean()
      .default(false)
      .describe("true incluye los tramos ya reemplazados por un cambio «desde una fecha»; por defecto solo el vigente de cada gasto."),
  }),
  output: z.array(recurrenteSchema),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const filas = await ctx.db.flujoRecurrente.findMany({
      where: {
        ...(input.filaId ? { filaId: input.filaId } : {}),
        ...(input.incluirInactivos ? {} : { activa: true }),
        ...(input.incluirTramosAnteriores ? {} : { siguiente: { is: null } }),
      },
      orderBy: [{ concepto: "asc" }, { id: "asc" }],
    });
    return filas.map(vistaRecurrente);
  },
});

export const recurrentesCrear = defineCapability({
  id: "finanzas.recurrentes.crear",
  descripcion:
    "Crea un gasto recurrente en una fila de egresos del flujo de caja. El flujo lo proyecta solo en cada cuota y lo da por pagado cuando el cargo del banco conciliado a esa fila cae cerca de su fecha.",
  permiso: PERMISO_CONFIGURAR,
  input: z.object({ filaId: uuidSchema, ...recurrenteDatos }),
  output: recurrenteSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const motivo = motivoInvalido(input);
    if (motivo) throw reglaDeNegocio(motivo);
    const fila = await filaDe(ctx, input.filaId);
    if (fila.seccion !== "egreso" || !fila.activa) throw reglaDeNegocio("Elige una fila de egresos activa.");
    const data = {
      filaId: fila.id,
      concepto: input.concepto,
      monto: BigInt(input.monto),
      unidad: input.unidad,
      politicaUf: input.politicaUf,
      ufDiaFijo: input.ufDiaFijo,
      frecuencia: input.frecuencia,
      diaDelMes: input.frecuencia === "mensual" ? input.diaDelMes : null,
      inicio: aFecha(input.inicio),
      fin: input.fin ? aFecha(input.fin) : null,
      repeticiones: input.repeticiones,
      ventanaAntes: input.ventanaAntes,
      ventanaDespues: input.ventanaDespues,
      nota: input.nota,
      activa: true,
      claveOrigen: null,
    };
    if (dryRun) return vistaRecurrente({ id: ID_VISTA_PREVIA, ...data });
    const creado = await ctx.transaccion(async (tx) => {
      const r = await tx.flujoRecurrente.create({ data: { ...data, tenantId: ctx.tenantId } });
      await ctx.eventos.emitir(tx, { tipo: "finanzas.flujo.recurrente_creado", entidadTipo: "flujoRecurrente", entidadId: r.id });
      return r;
    });
    return vistaRecurrente(creado);
  },
});

const parcial = z.object({
  id: uuidSchema,
  concepto: recurrenteDatos.concepto.optional(),
  monto: recurrenteDatos.monto.optional(),
  unidad: recurrenteDatos.unidad.unwrap().optional(),
  politicaUf: recurrenteDatos.politicaUf.unwrap().optional(),
  ufDiaFijo: recurrenteDatos.ufDiaFijo.unwrap().unwrap().nullable().optional(),
  diaDelMes: recurrenteDatos.diaDelMes.unwrap().unwrap().nullable().optional(),
  fin: recurrenteDatos.fin.unwrap().unwrap().nullable().optional(),
  repeticiones: recurrenteDatos.repeticiones.unwrap().unwrap().nullable().optional(),
  nota: recurrenteDatos.nota.unwrap().unwrap().nullable().optional(),
  activa: z.boolean().optional().describe("false deja de proyectarlo; las cuotas ya pagadas no cambian."),
});

export const recurrentesActualizar = defineCapability({
  id: "finanzas.recurrentes.actualizar",
  descripcion:
    "Cambia un gasto recurrente del flujo de caja: concepto, monto o su unidad, día de pago, fin, tope de cuotas, nota o si sigue activo. Como el flujo lo calcula al leer, el cambio se ve de inmediato en todas las cuotas futuras.",
  permiso: PERMISO_CONFIGURAR,
  input: parcial,
  output: recurrenteSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const actual = await ctx.db.flujoRecurrente.findFirst({ where: { id: input.id }, include: { siguiente: { select: { id: true } } } });
    if (!actual) throw noEncontrado("El gasto recurrente");
    if (actual.siguiente) throw reglaDeNegocio("Ese tramo ya fue reemplazado por un cambio desde una fecha: edita el tramo vigente.");
    const vista = vistaRecurrente(actual);
    // Cambiar solo la unidad reinterpretaría el monto (500.000 CLP pasarían a ser 50 UF o 50 %): se pide el monto nuevo.
    if (input.unidad !== undefined && input.unidad !== vista.unidad && input.monto === undefined)
      throw reglaDeNegocio("Al cambiar la unidad indica también el monto en la nueva unidad.");
    const nuevo = {
      ...vista,
      ...Object.fromEntries(Object.entries(input).filter(([k, v]) => k !== "id" && v !== undefined)),
    } as typeof vista;
    // Lo que deja de aplicar se limpia solo: sin UF no hay día de UF, y sin «día fijo» no hay día fijo.
    if (nuevo.unidad !== "uf" && input.politicaUf === undefined) nuevo.politicaUf = "dia_cuota";
    if (nuevo.politicaUf !== "dia_fijo" && input.ufDiaFijo === undefined) nuevo.ufDiaFijo = null;
    const motivo = motivoInvalido(nuevo);
    if (motivo) throw reglaDeNegocio(motivo);
    if (dryRun) return nuevo;
    const r = await ctx.transaccion(async (tx) => {
      const u = await tx.flujoRecurrente.update({
        where: { id: actual.id },
        data: {
          concepto: nuevo.concepto,
          monto: BigInt(nuevo.monto),
          unidad: nuevo.unidad,
          politicaUf: nuevo.politicaUf,
          ufDiaFijo: nuevo.ufDiaFijo,
          diaDelMes: nuevo.diaDelMes,
          fin: nuevo.fin ? aFecha(nuevo.fin) : null,
          repeticiones: nuevo.repeticiones,
          nota: nuevo.nota,
          activa: nuevo.activa,
        },
      });
      await ctx.eventos.emitir(tx, { tipo: "finanzas.flujo.recurrente_actualizado", entidadTipo: "flujoRecurrente", entidadId: u.id });
      return u;
    });
    return vistaRecurrente(r);
  },
});
