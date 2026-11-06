import { z } from "zod";

import { METODOS_KM, MAX_MONTO_KM } from "../domain";
import { PERMISO_CONFIG } from "./permisos";

const kilometraje = { grupo: "Kilometraje", ambito: "tenant", permiso: PERMISO_CONFIG } as const;
const tramoSchema = z.object({ nombre: z.string().trim().min(1).max(80), montoClp: z.number().int().min(1).max(MAX_MONTO_KM) });

/**
 * Ajustes del módulo Rendiciones (ADR-018): los lee `ajuste()` y los cambia `core.config.set`.
 * El kilometraje (CAR-194) usa campos planos, no un objeto: el centro de configuración renderiza
 * un control por campo. «Sin configurar» (método vacío) bloquea crear viajes con un mensaje claro.
 */
export const ajustesRendiciones = z.object({
  exigir_respaldo: z.boolean().default(true).meta({
    etiqueta: "Exigir boleta o factura en cada gasto",
    ayuda: "Si se apaga, un gasto sin respaldo se acepta; si está encendido, solo con un motivo escrito.",
    grupo: "Respaldo",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "switch",
  }),
  aprobador_defecto_id: z.string().default("").meta({
    etiqueta: "Aprobador por defecto",
    ayuda: "Usuario que aprueba cuando quien rinde no elige uno. Vacío = quien rinde debe elegirlo.",
    grupo: "Aprobación",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "texto",
  }),
  aprobadores_elegibles_ids: z.array(z.string()).max(50).default([]).meta({
    etiqueta: "Quiénes pueden aprobar (elegibles)",
    ayuda: "Lista de usuarios que quien rinde puede elegir como aprobador, además del aprobador por defecto. Vacío = solo el aprobador por defecto. No se lista a todos los usuarios.",
    grupo: "Aprobación",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "json",
  }),
  km_metodo: z.enum(["", ...METODOS_KM]).default("").meta({
    ...kilometraje,
    etiqueta: "Cómo se calcula el kilometraje",
    ayuda: "Consumo de combustible, tarifa por km o tramo fijo. Vacío = la empresa aún no configura el kilometraje.",
    control: "seleccion",
  }),
  km_rendimiento_km_l: z.number().min(0).max(100).default(10).meta({
    ...kilometraje,
    etiqueta: "Rendimiento del vehículo (km por litro)",
    ayuda: "Solo para el método de consumo. Hasta 1 decimal.",
    control: "numero",
  }),
  km_precio_litro_clp: z.number().int().min(0).max(100_000).default(1500).meta({
    ...kilometraje,
    etiqueta: "Precio del litro de combustible (CLP)",
    ayuda: "Solo para el método de consumo.",
    control: "numero",
  }),
  km_recargo_desgaste_pct: z.number().int().min(0).max(100).default(10).meta({
    ...kilometraje,
    etiqueta: "Recargo por desgaste del vehículo (%)",
    ayuda: "Porcentaje sobre el combustible. Solo para el método de consumo.",
    control: "numero",
  }),
  km_tarifa_por_km_clp: z.number().int().min(0).max(100_000).default(0).meta({
    ...kilometraje,
    etiqueta: "Tarifa por kilómetro (CLP)",
    ayuda: "Solo para el método de tarifa por km.",
    control: "numero",
  }),
  km_tramos: z.array(tramoSchema).max(50).default([]).meta({
    ...kilometraje,
    etiqueta: "Tramos con monto fijo",
    ayuda: "Lista de {nombre, montoClp}. Solo para el método de tramo fijo.",
    control: "json",
  }),
  nomina_cuenta_origen: z.string().trim().max(30).default("").meta({
    etiqueta: "Cuenta de origen de la nómina (Santander)",
    ayuda: "Cuenta de la empresa desde la que se paga el lote. Es un dato de la empresa, no de una persona. Vacío = no se puede generar la nómina.",
    grupo: "Pagos",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "texto",
  }),
  nomina_formato_confirmado: z.boolean().default(false).meta({
    etiqueta: "Formato de nómina Santander confirmado",
    ayuda: "Se enciende solo cuando Carlos entrega la especificación del formato. Mientras esté apagado no se genera el archivo de nómina (DECISIÓN CARLOS, CAR-208).",
    grupo: "Pagos",
    ambito: "tenant",
    permiso: PERMISO_CONFIG,
    control: "switch",
  }),
});
