/** Entradas del catálogo comercial para Finanzas (CAR-204): el módulo completo y sus siete partes. */
import { type EntradaCatalogo, MODULO_FINANZAS, type ParteFinanzas } from "./catalogo-modulos";

const parte = (
  id: ParteFinanzas,
  nombre: string,
  incluye: string,
  dependencias: readonly (readonly string[])[] = [],
): EntradaCatalogo => ({
  id,
  nombre,
  incluye,
  grupo: "parte_finanzas",
  incluidoEnBase: false,
  formaSugerida: "fijo",
  unidadSugerida: null,
  dependencias,
});

export const ENTRADAS_FINANZAS: readonly EntradaCatalogo[] = [
  {
    id: MODULO_FINANZAS,
    nombre: "Finanzas",
    incluye: "Las siete partes juntas, a un precio mensual fijo.",
    grupo: "finanzas",
    incluidoEnBase: false,
    formaSugerida: "fijo",
    unidadSugerida: null,
    dependencias: [],
  },
  parte("finanzas.bancos", "Bancos", "Cuentas, cartolas y conciliación."),
  parte("finanzas.flujo", "Flujo de caja", "Planilla semanal y proyección.", [["finanzas.bancos"]]),
  parte("finanzas.ventas", "Ventas y facturación", "Facturas, notas y clientes."),
  parte("finanzas.cobranza", "Cobranza", "Seguimiento de cobros.", [["finanzas.ventas"]]),
  parte("finanzas.factoring", "Factoring", "Cesión de facturas.", [["finanzas.ventas"]]),
  parte("finanzas.compras", "Compras", "Facturas recibidas y proveedores."),
  parte("finanzas.contabilidad", "Contabilidad e informes", "Balance, resultados e informes.", [
    ["finanzas.ventas", "finanzas.compras"],
  ]),
];
