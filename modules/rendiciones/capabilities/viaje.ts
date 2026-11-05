// Kilometraje en las capacidades (CAR-194): una sola ruta de cálculo para la vista previa y lo que se
// guarda (R-REN-12). El servidor calcula distancia y monto; nunca se confía en un monto del cliente.
import { z } from "zod";

import type { Contexto } from "@opai/capabilities";
import { ajuste, distanciaDe, reglaDeNegocio } from "@opai/capabilities";

import { calcularKilometraje, type ConfigKilometraje, configDesdeAjustes, type EntradaViaje, type TramoFijo } from "../domain";

const lugarSchema = z.object({
  texto: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .describe("Dirección o nombre del lugar, tal como lo eligió la persona."),
  lat: z.number().min(-90).max(90).describe("Latitud: sale de core.geo.autocompletar / detalle."),
  lng: z.number().min(-180).max(180),
});

/** Datos del viaje. El monto y los km NO se envían: los calcula el servidor. */
export const viajeSchema = z.object({
  origen: lugarSchema,
  destino: lugarSchema,
  idaYVuelta: z.boolean().default(false).describe("Si es true, los km se duplican."),
  peajeClp: z
    .number()
    .int()
    .min(0)
    .max(5_000_000)
    .default(0)
    .describe("Peaje del viaje completo, CLP entero."),
  peajeDocumentoId: z
    .uuid()
    .optional()
    .describe("Foto o boleta del peaje, ya subida a core.documentos (solo si hay peaje)."),
  tramo: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .optional()
    .describe("Solo con el método de tramo fijo: nombre del tramo."),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD.")
    .describe("Fecha del viaje; no puede ser futura."),
});
export type Viaje = z.infer<typeof viajeSchema>;

export const desgloseSchema = z.object({
  concepto: z.string(), montoClp: z.number().int(), detalle: z.string(),
});

export const calculoSchema = z.object({
  km: z.number().describe("Km del trayecto, sin duplicar por ida y vuelta."),
  kmEfectivos: z.number().describe("Km que se cobran (duplicados si es ida y vuelta)."),
  origenDistancia: z
    .enum(["google", "linea_recta"])
    .describe("«linea_recta» subestima la ruta real."),
  metodo: z.string(),
  montoClp: z.number().int(),
  desglose: z.array(desgloseSchema),
  advertencias: z.array(z.string()),
});

/** Configuración vigente de la empresa a partir de sus ajustes planos. */
export async function configDeEmpresa(ctx: Contexto): Promise<ConfigKilometraje> {
  const leer = <T>(clave: string) => ajuste<T>(ctx, "rendiciones", clave);
  return configDesdeAjustes({
    metodo: await leer<string>("km_metodo"),
    rendimientoKmL: await leer<number>("km_rendimiento_km_l"),
    precioLitroClp: await leer<number>("km_precio_litro_clp"),
    recargoPorcentaje: await leer<number>("km_recargo_desgaste_pct"),
    tarifaKmClp: await leer<number>("km_tarifa_por_km_clp"),
    tramos: await leer<TramoFijo[]>("km_tramos"),
  });
}

export type Calculo = z.infer<typeof calculoSchema>;
export type CalculoViaje = { calculo: Calculo; config: ConfigKilometraje };

/** Valida la configuración y la distancia, y calcula el monto. Falla con un error de negocio claro. */
export async function calcularViaje(ctx: Contexto, viaje: Viaje): Promise<CalculoViaje> {
  const config = await configDeEmpresa(ctx);
  // Falla antes de pagar la ruta si la empresa no configuró el método (o no hay tramo elegido).
  const previo = calcularKilometraje(config, {
    km: 1,
    idaYVuelta: false,
    peajeClp: viaje.peajeClp,
    tramo: viaje.tramo,
  });
  if (!previo.ok && previo.motivo !== "km_invalido") throw reglaDeNegocio(previo.mensaje);
  const d = await distanciaDe(ctx, viaje.origen, viaje.destino, "rendiciones");
  const entrada: EntradaViaje = { km: d.km, idaYVuelta: viaje.idaYVuelta, peajeClp: viaje.peajeClp, tramo: viaje.tramo };
  const r = calcularKilometraje(config, entrada);
  if (!r.ok) throw reglaDeNegocio(r.mensaje);
  const advertencias =
    d.origenDistancia === "linea_recta"
      ? ["La distancia se calculó en línea recta: la ruta real puede ser mayor."]
      : [];
  const calculo: Calculo = {
    km: d.km, kmEfectivos: r.kmEfectivos, origenDistancia: d.origenDistancia, metodo: config.metodo,
    montoClp: r.montoClp, desglose: r.lineas, advertencias,
  };
  return { calculo, config };
}
