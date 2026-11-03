import { z } from "zod";

const entero = z.number().int().min(0).max(1_000_000_000_000);
const escala = z.number().int().min(1).max(1_000_000_000);
const pct = z.number().int().min(0).max(999_999);
const clave = z.string().regex(/^[a-zA-Z_][a-zA-Z_0-9]{0,79}$/);
const id = z.string().min(1).max(120);
const unidad = z.enum(["numero", "clp", "uf"]);
const valores = z.record(clave, entero).refine((v) => Object.keys(v).length <= 200, "Demasiadas variables");
const meses = z.number().int().min(1).max(120);
const formula = z.string().min(1).max(2000);
const rateo = z.discriminatedUnion("tipo", [z.object({ tipo: z.literal("unico") }),
  z.object({ tipo: z.literal("contrato") }), z.object({ tipo: z.literal("meses"), meses })]);
const item = z.object({ id, categoria: id, costoUnitario: entero, moneda: z.enum(["CLP", "UF"]),
  modo: z.enum(["mensual_fijo", "por_persona_mes", "por_puesto_mes", "inversion", "formula"]),
  rateo, formula: formula.optional() });
export const instrumentosSchema = z.object({
  financiero: z.object({ habilitado: z.boolean(), tasaPct: pct }),
  garantia: z.object({ habilitada: z.boolean(), modo: z.enum(["porcentaje", "fija"]), meses,
    contratoPct: z.number().int().min(0).max(1_000_000), tasaAnualPct: pct, administracionPct: pct,
    montoUf: entero, incluirUnicos: z.boolean() }),
  rc: z.object({ habilitada: z.boolean(), modo: z.enum(["prima", "tasa"]), primaAnualUf: entero,
    aseguradoUf: entero, tasaAnualPct: pct, asignacionPct: z.number().int().min(0).max(1_000_000),
    plazo: z.enum(["anual", "contrato", "meses"]), meses }),
});
const base = { id, seccion: id, habilitada: z.boolean(), variables: valores };
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const linea = z.discriminatedUnion("tipo", [
  z.object({ ...base, tipo: z.literal("puesto"), posiciones: z.number().int().min(1).max(10_000),
    patron: z.string().max(20), horaInicio: hora, horaFin: hora, diasCobertura: z.number().int().min(1).max(7),
    personasPorPosicionEscaladas: z.number().int().min(1).max(1_000_000).optional(),
    motivoPersonas: z.string().trim().min(1).max(500).optional() }),
  z.object({ ...base, tipo: z.enum(["item", "adicional"]), item, cantidadEscalada: entero,
    alcanceDotacion: z.enum(["cotizacion", "seccion"]).optional(),
    costoUnitario: entero.optional(), rateo: rateo.optional(), margenPct: pct }),
]);
const fecha = z.iso.date();
export const motorInputSchema = z.object({
  version: z.object({ numero: z.number().int().min(1), modeloId: id, modeloVersion: z.number().int().min(1), meses,
    margenPct: pct, margenModo: z.enum(["margen_sobre_venta", "markup", "margen_sobre_mano_de_obra"]),
    margenesSeccion: z.array(z.object({ seccion: id, margenPct: pct })).max(200).optional(),
    precioManualClp: entero.optional(), variables: valores, lineas: z.array(linea).max(200),
    instrumentos: instrumentosSchema.optional() }),
  modelo: z.object({ id, version: z.number().int().min(1), vertical: id,
    variables: z.array(z.object({ clave, unidad, escala, defecto: entero })).max(200),
    formulas: z.array(z.object({ clave, expresion: formula, unidad })).max(100),
    categorias: z.array(z.object({ id, nombre: id, clase: z.enum(["directo", "indirecto"]), fija: z.boolean().optional() })).max(100),
    items: z.array(item).max(200), valores, instrumentos: instrumentosSchema }),
  parametros: z.object({ fecha, uf: z.object({ valorClpEscalado: entero, fecha }).nullable(), minimoPct: pct, alertaPct: pct }),
});
const firmado = z.number().int().safe();
const uf = z.object({ valorClpEscalado: entero, fecha }).nullable();
/** Causa tipada de lo pendiente (CAR-162), sin montos: la ven también quienes no tienen costos. */
const aviso = z.object({ codigo: z.enum(["mutual_sin_confirmar", "sueldo_faltante", "juego_legal_faltante"]),
  mensaje: z.string().max(200), lineaId: id.optional(), indicador: z.string().max(80).optional() });
const publico = { ventaMensual: entero.nullable(), pagosUnicos: entero,
  dotacion: z.object({ posiciones: entero, personasEscaladas: entero }), uf, fecha,
  estado: z.literal("borrador"), advertencias: z.array(z.string().max(200)), noEnviable: z.boolean(),
  // Un aviso por línea (máx. 200) más los globales (mutual, juego legal): el tope no puede ser 200.
  avisos: z.array(aviso).max(210).optional() };
export const motorOutputSchema = z.union([
  z.strictObject({ ...publico,
    lineas: z.array(z.object({ id, seccion: id, categoria: id, costoMensual: entero, costoUnico: entero, ventaAdicional: entero, ventaUnica: entero })),
    secciones: z.array(z.object({ id, costoMensual: entero, costoUnico: entero })),
    categorias: z.array(z.object({ id, clase: z.enum(["directo", "indirecto"]), costoMensual: entero })),
    costoBase: entero, totalMensual: entero, directos: entero, indirectos: entero, costoMensual: entero, costoUnico: entero, margenEfectivoPct: firmado,
    semaforo: z.enum(["verde", "amarillo", "rojo"]), requiereAprobacion: z.boolean(),
    instrumentos: z.object({ financiero: entero, garantia: entero, administracion: entero, responsabilidad: entero,
      garantizado: entero, baseContrato: entero, primaAnual: entero, kEscalado: entero, grossUp: z.boolean(), incluyeUnicos: z.boolean() }),
    traza: z.array(z.object({ item: z.string().max(256), monto: z.string(), formula: z.string(), valor: firmado, exacto: z.string(),
      variables: z.array(z.object({ clave: z.string(), ambito: z.enum(["tenant", "cotizacion", "linea", "modelo", "parametro"]), valor: z.union([z.string(), firmado]) })) })) }),
  z.strictObject(publico),
]);
