/** Entrada de ejemplo para la vista previa de plantillas y marca (sin cotización real). */
import type { EntradaPdfCotizacion } from "./documento-pdf-tipos";

const MUESTRA: EntradaPdfCotizacion = {
  codigo: "CPQ-2026-001",
  titulo: "Vista previa de plantilla",
  negocio: "Negocio de ejemplo",
  versionNumero: 1,
  secciones: [
    {
      nombre: "Planta ejemplo",
      lineas: [
        { nombre: "Guardia 24/7", tipo: "puesto", posiciones: 2, ventaMensualClp: 1_850_000 },
        { nombre: "Supervisión", tipo: "item", ventaMensualClp: 320_000 },
      ],
    },
  ],
  calculo: {
    ventaMensual: 2_170_000,
    fecha: "2026-11-03",
    pagosUnicos: 0,
    borradorSinPrecio: false,
    uf: { valorClpEscalado: 408_450_000, fecha: "2026-11-03" },
  },
  validaHasta: "2026-12-03",
  cliente: {
    nombre: "Cliente ejemplo SpA",
    razonSocial: "Cliente ejemplo SpA",
    rut: "76.543.210-K",
    giro: "Servicios industriales",
    direccion: "Av. Ejemplo 100, Santiago",
  },
  ejecutivo: "Ejecutivo comercial",
  enviada: false,
  condiciones: "Pago contra factura a 30 días. Ajuste UF según contrato marco.",
};

export function entradaPdfMuestra(): EntradaPdfCotizacion {
  return structuredClone(MUESTRA);
}

export function entradaPdfConBorradorMarca(
  base: EntradaPdfCotizacion,
  marca: { condicionesDefault?: string | null },
  plantilla?: { condiciones?: string | null },
): EntradaPdfCotizacion {
  const condiciones =
    plantilla?.condiciones ?? marca.condicionesDefault ?? base.condiciones ?? null;
  return {
    ...base,
    condiciones,
  };
}
