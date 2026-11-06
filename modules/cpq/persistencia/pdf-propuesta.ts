import { renderPdfCotizacion } from "./documento-pdf";

/** Compatibilidad con tests previos: PDF sobrio sin cargar tenant. */
export function buildPdfPropuesta(input: {
  codigo: string;
  titulo: string;
  negocio: string;
  secciones: readonly { nombre: string; lineas: readonly { nombre: string; tipo?: string }[] }[];
  calculo: { ventaMensual: number | null; fecha: string; borradorSinPrecio?: boolean };
}): Promise<Uint8Array> {
  const marca = {
    version: 1,
    tipografia: "inter" as const,
    piePagina: null,
    condicionesDefault: null,
    nombreComercial: null,
    razonSocial: null,
    rut: null,
    direccion: null,
    colorPrimario: null,
    colorSecundario: null,
    logoUrl: null,
  };
  const plantilla = {
    id: "",
    tipo: "cotizacion" as const,
    base: "clasica" as const,
    version: 1,
    activa: true,
    bloques: [
      { id: "encabezado" as const, activo: true },
      { id: "resumen_comercial" as const, activo: true },
      { id: "detalle_secciones" as const, activo: true },
      { id: "pie" as const, activo: true },
    ],
  };
  return renderPdfCotizacion(
    {
      ...input,
      secciones: input.secciones.map((s) => ({
        nombre: s.nombre,
        lineas: s.lineas.map((l) => ({
          nombre: l.nombre,
          tipo: l.tipo ?? "puesto",
          posiciones: 1,
          ventaMensualClp:
            input.calculo.ventaMensual != null
              ? Math.round(input.calculo.ventaMensual / Math.max(1, s.lineas.length))
              : null,
        })),
      })),
      calculo: {
        ...input.calculo,
        borradorSinPrecio: input.calculo.borradorSinPrecio ?? input.calculo.ventaMensual == null,
      },
    },
    marca,
    plantilla,
  );
}

export { renderPdfCotizacion } from "./documento-pdf";
export { pdfCotizacionConMarca } from "./pdf-cotizacion";
