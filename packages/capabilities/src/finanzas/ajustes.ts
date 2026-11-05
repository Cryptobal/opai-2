import { z } from "zod";

// Ajustes del módulo Finanzas (ADR-018, ADR-021). El centro de configuración del núcleo los dibuja en
// Configuración › Módulos › Finanzas. Solo owner y admin los ven (Finanzas es bloqueo financiero).
/** Paso de la secuencia de cobranza: días hábiles después del vencimiento; 0 lo desactiva. */
function pasoCobranza(etiqueta: string, defecto: number) {
  return z
    .number()
    .int()
    .min(0)
    .max(90)
    .default(defecto)
    .meta({
      etiqueta: `${etiqueta} (días hábiles tras el vencimiento)`,
      ayuda: "Cuenta solo días hábiles, sin feriados chilenos. 0 desactiva este paso.",
      grupo: "Cobranza",
      ambito: "tenant",
      permiso: "finanzas:ventas.manage",
      control: "numero",
    });
}

export const ajustesFinanzas = z.object({
  plazo_pago_defecto_dias: z
    .number()
    .int()
    .min(0)
    .max(365)
    .default(30)
    .meta({
      etiqueta: "Plazo de pago por defecto (días)",
      ayuda: "Lo hereda cada proveedor nuevo si no se indica otro. Cada proveedor puede tener el suyo.",
      grupo: "Proveedores",
      ambito: "tenant",
      permiso: "finanzas:proveedores.manage",
      control: "numero",
    }),
  cobranza_plazo_cobro_dias: z
    .number()
    .int()
    .min(0)
    .max(365)
    .default(30)
    .meta({
      etiqueta: "Plazo de cobro por defecto (días)",
      ayuda: "Se usa para calcular el vencimiento de una factura emitida que no trae fecha de vencimiento.",
      grupo: "Cobranza",
      ambito: "tenant",
      permiso: "finanzas:ventas.manage",
      control: "numero",
    }),
  cobranza_paso_1_dias: pasoCobranza("Primer recordatorio", 3),
  cobranza_paso_2_dias: pasoCobranza("Segundo recordatorio", 7),
  cobranza_paso_3_dias: pasoCobranza("Tercer recordatorio", 12),
  cobranza_recordatorios_automaticos: z
    .boolean()
    .default(false)
    .meta({
      etiqueta: "Enviar recordatorios automáticos",
      ayuda:
        "Apagado por defecto. Encendido, el trabajo diario envía por correo los recordatorios de la secuencia a los contactos con rol facturación.",
      grupo: "Cobranza",
      ambito: "tenant",
      permiso: "finanzas:ventas.manage",
      control: "switch",
      // Lo que sale solo al cliente lo enciende una persona, nunca un agente (revisión de #263).
      soloPersonas: true,
    }),
  flujo_tasa_ppm_bps: z
    .number()
    .int()
    .min(0)
    .max(1_000)
    .default(0)
    .meta({
      etiqueta: "Tasa de PPM sobre las ventas (puntos base)",
      ayuda:
        "100 = 1 %. Se aplica a las ventas netas y exentas de cada mes y se proyecta en el flujo de caja el mes siguiente, junto con el IVA. 0 desactiva la proyección del PPM.",
      grupo: "Flujo de caja",
      ambito: "tenant",
      permiso: "finanzas:flujo.configurar",
      control: "numero",
    }),
  flujo_cuenta_diferencia_factoring: z
    .enum(["Diferencia factoring", "Gasto financiero"])
    .default("Diferencia factoring")
    .meta({
      etiqueta: "Cuenta de la diferencia del factoring",
      ayuda:
        "Cuando una factura se cede, el factor deposita el monto menos su descuento; la diferencia se muestra en el flujo bajo esta cuenta, solo como información (no suma al saldo).",
      grupo: "Flujo de caja",
      ambito: "tenant",
      permiso: "finanzas:flujo.configurar",
      control: "seleccion",
    }),
});
