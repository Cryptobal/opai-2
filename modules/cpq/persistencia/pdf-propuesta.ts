import { renderPdfCotizacion } from "./documento-pdf";

/** Compatibilidad con tests previos: PDF sobrio sin cargar tenant. */
export function buildPdfPropuesta(input: {
  codigo: string;
  titulo: string;
  negocio: string;
  secciones: readonly { nombre: string; lineas: readonly { nombre: string }[] }[];
  calculo: { ventaMensual: number | null; fecha: string };
}): Uint8Array {
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
  return renderPdfCotizacion(input, marca, plantilla);
}

export { renderPdfCotizacion } from "./documento-pdf";
export { pdfCotizacionConMarca } from "./pdf-cotizacion";
